from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload, selectinload

import models
import schemas
from database import get_db
from security import get_current_user
from services.recommender import BiasedMF, build_ratings

router = APIRouter(
    prefix="/api/recommendations",
    tags=["Recommendations"]
)

# Πόσες προτάσεις κρατάμε συνολικά πριν τη σελιδοποίηση. Πέρα από αυτό το όριο
# οι προβλέψεις είναι θόρυβος — κανείς δεν σελιδοποιεί ως τη 200ή πρόταση.
MAX_RECOMMENDATIONS = 50


def _event_load_options():
    """Ίδιο eager loading με το routers/events.py — το EventResponse διαβάζει
    5 σχέσεις και χωρίς αυτό κάθε σελίδα θα έκανε δεκάδες queries."""
    return (
        selectinload(models.Event.categories),
        selectinload(models.Event.ticket_types),
        selectinload(models.Event.media),
        selectinload(models.Event.bookings),
        joinedload(models.Event.organizer),
    )


@router.get("", response_model=schemas.RecommendationsPage)
def get_recommendations(
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §13 / API_CONTRACT.md §2.6 — προτεινόμενες εκδηλώσεις.

    Το μοντέλο εκπαιδεύεται επιτόπου σε κάθε κλήση. Για το μέγεθος δεδομένων
    μιας φοιτητικής εφαρμογής (μερικές χιλιάδες αλληλεπιδράσεις) αυτό κοστίζει
    δεκάδες χιλιοστά του δευτερολέπτου. Σε παραγωγή η εκπαίδευση θα έτρεχε
    περιοδικά σε background job και εδώ θα γινόταν μόνο ανάγνωση των πινάκων.
    """

    # --- 1. Implicit feedback από ΟΛΟΥΣ τους χρήστες ------------------------
    # Χρειαζόμαστε ολόκληρο τον πίνακα, όχι μόνο τη γραμμή του χρήστη: η ουσία
    # του collaborative filtering είναι ότι μαθαίνουμε από τους ΟΜΟΙΟΥΣ του.
    visit_rows = (
        db.query(
            models.EventVisit.user_id,
            models.EventVisit.event_id,
            func.count().label("n"),
        )
        .group_by(models.EventVisit.user_id, models.EventVisit.event_id)
        .all()
    )
    booking_rows = (
        db.query(
            models.Booking.attendee_id,
            models.Booking.events_id,
            func.count().label("n"),
        )
        .filter(models.Booking.status != "CANCELLED")
        .group_by(models.Booking.attendee_id, models.Booking.events_id)
        .all()
    )

    visits = [(int(u), int(e), int(n)) for u, e, n in visit_rows]
    bookings = [(int(u), int(e), int(n)) for u, e, n in booking_rows]

    # --- 2. Στρατηγική (§2.6) ----------------------------------------------
    # Η εκφώνηση: «Αν ο χρήστης δεν έχει προηγούμενο ιστορικό κρατήσεων, ο
    # αλγόριθμος θα λειτουργεί βάσει μόνο των εκδηλώσεων που έχει επισκεφθεί.»
    has_bookings = any(u == current_user.user_id for u, _, _ in bookings)
    strategy = "matrix_factorization" if has_bookings else "cold_start_visits"

    # Ό,τι έχει ήδη δει ή κρατήσει ο χρήστης δεν έχει νόημα να προταθεί ξανά.
    already_seen = {
        event_id
        for user_id, event_id, _ in visits + bookings
        if user_id == current_user.user_id
    }

    ratings = build_ratings(visits, bookings)

    # --- 3. Υποψήφιες εκδηλώσεις -------------------------------------------
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    candidates_query = (
        db.query(models.Event)
        .filter(
            # Το §2.6 ορίζει ρητά Event[] σε κατάσταση PUBLISHED.
            models.Event.status == "PUBLISHED",
            # Δεν προτείνουμε εκδηλώσεις που έχουν ήδη γίνει.
            models.Event.start_date_time >= now,
            # Ούτε τις εκδηλώσεις που διοργανώνει ο ίδιος ο χρήστης.
            models.Event.organizer_id != current_user.user_id,
        )
    )
    if already_seen:
        candidates_query = candidates_query.filter(
            ~models.Event.events_id.in_(already_seen)
        )

    candidate_ids = [row[0] for row in candidates_query.with_entities(models.Event.events_id).all()]

    # --- 4. Κατάταξη --------------------------------------------------------
    if not candidate_ids or ratings.empty:
        # Καμία υποψήφια εκδήλωση, ή εντελώς άδεια βάση (πρώτη εκτέλεση):
        # επιστρέφουμε άδεια σελίδα αντί να σκάσουμε.
        ranked_ids: list[int] = []
    else:
        model = BiasedMF().fit(ratings)
        ranked_ids = [
            event_id
            for event_id, _score in model.recommend(
                current_user.user_id, candidate_ids, top_n=MAX_RECOMMENDATIONS
            )
        ]

    # --- 5. Σελιδοποίηση της κατάταξης --------------------------------------
    total = len(ranked_ids)
    page_ids = ranked_ids[(page - 1) * pageSize : page * pageSize]

    events_by_id = {}
    if page_ids:
        rows = (
            db.query(models.Event)
            .options(*_event_load_options())
            .filter(models.Event.events_id.in_(page_ids))
            .all()
        )
        events_by_id = {e.events_id: e for e in rows}

    # Η σειρά του IN() δεν είναι εγγυημένη από τη βάση — την επιβάλλουμε εμείς
    # σύμφωνα με την κατάταξη του μοντέλου.
    items = [
        schemas.EventResponse.from_event(events_by_id[event_id])
        for event_id in page_ids
        if event_id in events_by_id
    ]

    total_pages = -(-total // pageSize) if pageSize > 0 else 0
    return schemas.RecommendationsPage(
        items=items,
        page=page,
        pageSize=pageSize,
        total=total,
        totalPages=total_pages,
        strategy=strategy,
    )
