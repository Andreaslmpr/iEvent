from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

import models
import schemas
from database import get_db
from security import get_current_user, get_current_user_optional
from services import media

router = APIRouter(
    prefix="/api/events",
    tags=["Events"]
)


# Ίδιο μοτίβο με το routers/bookings.py: τυποποιημένη μορφή σφάλματος
# κατά API_CONTRACT.md §0.
def _error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"error": {"code": code, "message": message}},
    )


def _resolve_categories(db: Session, names: list[str]) -> list[models.EventCategory]:
    """Get-or-create κατηγοριών.

    Ο πίνακας `event_categories` είναι πλέον ΚΑΤΑΛΟΓΟΣ μοναδικών κατηγοριών
    (βλ. db/migrations/001_event_categories_many_to_many.sql), όχι γραμμές ανά
    εκδήλωση. Άρα το "Music" γράφεται μία φορά και το δείχνουν όλες οι
    εκδηλώσεις μέσω του πίνακα-γέφυρα event_has_categories.
    """
    # Καθαρίζουμε κενά και διπλότυπα, κρατώντας τη σειρά που έστειλε ο χρήστης.
    wanted: list[str] = []
    for raw in names:
        name = raw.strip()
        if name and name not in wanted:
            wanted.append(name)
    if not wanted:
        return []

    existing = {
        c.category_name: c
        for c in db.query(models.EventCategory)
        .filter(models.EventCategory.category_name.in_(wanted))
        .all()
    }

    result = []
    for name in wanted:
        category = existing.get(name)
        if category is None:
            category = models.EventCategory(category_name=name)
            db.add(category)
            # flush ώστε να πάρει id πριν μπει στη σχέση many-to-many
            db.flush()
        result.append(category)
    return result


@router.post("", response_model=schemas.EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §5 / API_CONTRACT.md §2.3 — δημιουργία εκδήλωσης.

    Ο χρήστης που τη δημιουργεί γίνεται διοργανωτής (organizer) αυτής της
    εκδήλωσης. Η εκδήλωση ξεκινά ως DRAFT: δεν είναι ορατή στην αναζήτηση και
    δεν δέχεται κρατήσεις μέχρι το POST /api/events/{id}/publish.
    """

    # --- 1. Το invariant χωρητικότητας (API_CONTRACT.md §1 "TicketType") ------
    # Σ(quantity κάθε τύπου) ≤ capacity. Ο ίδιος έλεγχος ισχύει και στο PUT.
    # Χωρίς αυτό, θα μπορούσαν να πουληθούν περισσότερα εισιτήρια από θέσεις.
    total_quantity = sum(t.quantity for t in payload.ticketTypes)
    if total_quantity > payload.capacity:
        raise _error(
            status.HTTP_409_CONFLICT,
            "CAPACITY_EXCEEDED",
            f"Το σύνολο των εισιτηρίων ({total_quantity}) ξεπερνά "
            f"τη χωρητικότητα της εκδήλωσης ({payload.capacity}).",
        )

    # --- 2. Συντεταγμένες για τον χάρτη OpenStreetMap ------------------------
    lat = payload.geoLocation.lat if payload.geoLocation else None
    lng = payload.geoLocation.lng if payload.geoLocation else None

    event = models.Event(
        title=payload.title,
        event_type=payload.eventType,
        venue=payload.venue,
        address=payload.address,
        city=payload.city,
        country=payload.country,
        latitude=lat,
        longitude=lng,
        # Το frontend στέλνει ISO-8601 με "Z"· η MySQL θέλει naive UTC.
        start_date_time=schemas.to_naive_utc(payload.startDateTime),
        end_date_time=schemas.to_naive_utc(payload.endDateTime),
        capacity=payload.capacity,
        status="DRAFT",
        description=payload.description,
        organizer_id=current_user.user_id,
    )

    # --- 3. Τύποι εισιτηρίων: available == quantity στη δημιουργία -----------
    # Το `available` το διαχειρίζεται ΑΠΟΚΛΕΙΣΤΙΚΑ ο server (κάθε booking το
    # μειώνει)· γι' αυτό δεν το δέχεται καν το EventCreate.
    for ticket in payload.ticketTypes:
        event.ticket_types.append(
            models.TicketType(
                name=ticket.name,
                price=ticket.price,
                quantity=ticket.quantity,
                available=ticket.quantity,
            )
        )

    # Το `payload.media` αγνοείται σκόπιμα: μια νέα εκδήλωση δεν έχει ακόμη
    # ανεβασμένες φωτογραφίες. Ανεβαίνουν μετά, με POST /api/events/{id}/media —
    # αλλιώς κάποιος θα μπορούσε να «δηλώσει» όνομα αρχείου άλλης εκδήλωσης.

    event.categories = _resolve_categories(db, payload.categories)

    db.add(event)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(event)
    return schemas.EventResponse.from_event(event)


# ---------------------------------------------------------
# Λίστες εκδηλώσεων
# ---------------------------------------------------------
# ΣΗΜΑΝΤΙΚΟ: τα routes "" και "/mine" δηλώνονται ΠΡΙΝ το "/{event_id}".
# Το FastAPI ταιριάζει με τη σειρά δήλωσης — αν προηγούνταν το "/{event_id}",
# το /api/events/mine θα ερμηνευόταν ως event_id="mine" και θα έσκαγε σε 400.

def _event_load_options():
    """Eager loading για τις λίστες.

    Το EventResponse.from_event() διαβάζει categories, ticket_types, media,
    bookings και organizer. Με lazy loading, μια σελίδα 20 εκδηλώσεων θα έκανε
    ~100 επιπλέον queries (κλασικό N+1). Έτσι γίνονται 5 συνολικά.
    """
    return (
        selectinload(models.Event.categories),
        selectinload(models.Event.ticket_types),
        selectinload(models.Event.media),
        selectinload(models.Event.bookings),   # χρειάζεται μόνο για το isDeletable
        joinedload(models.Event.organizer),
    )


def _escape_like(value: str) -> str:
    """Ουδετεροποιεί τα wildcards του LIKE.

    Χωρίς αυτό, αναζήτηση για "50%" θα έψαχνε "50<οτιδήποτε>" και η κάτω παύλα
    θα ταίριαζε με κάθε χαρακτήρα.
    """
    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/mine", response_model=schemas.Page[schemas.EventResponse])
def list_my_events(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.3 — οι εκδηλώσεις που διοργανώνω.

    Σε αντίθεση με το GET /api/events, εδώ επιστρέφονται ΟΛΕΣ οι καταστάσεις
    (DRAFT, PUBLISHED, CANCELLED, COMPLETED): είναι η οθόνη διαχείρισης του
    διοργανωτή, από όπου δημοσιεύει τα πρόχειρά του.
    """
    query = db.query(models.Event).filter(
        models.Event.organizer_id == current_user.user_id
    )

    total = query.count()
    rows = (
        query.options(*_event_load_options())
        # Φθίνουσα: πρώτα οι πιο πρόσφατες/μελλοντικές διοργανώσεις.
        .order_by(models.Event.start_date_time.desc(), models.Event.events_id.desc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return schemas.Page[schemas.EventResponse].build(
        items=[schemas.EventResponse.from_event(e) for e in rows],
        page=page,
        page_size=pageSize,
        total=total,
    )


@router.get("", response_model=schemas.Page[schemas.EventResponse])
def search_events(
    q: Optional[str] = Query(None, description="Ελεύθερο κείμενο σε τίτλο + περιγραφή"),
    city: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    # Το "from" είναι δεσμευμένη λέξη της Python — το πεδίο λέγεται from_ και
    # εκτίθεται ως ?from= μέσω alias.
    from_: Optional[datetime] = Query(None, alias="from"),
    to: Optional[datetime] = Query(None),
    minPrice: Optional[Decimal] = Query(None, ge=0),
    maxPrice: Optional[Decimal] = Query(None, ge=0),
    sort: Literal["date", "price", "title"] = Query("date"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Εκφώνηση §6 / API_CONTRACT.md §2.3 — αναζήτηση και πλοήγηση.

    Ανοιχτό σε επισκέπτες (GUEST). Επιστρέφονται ΜΟΝΟ δημοσιευμένες εκδηλώσεις:
    οι DRAFT δεν είναι ορατές σε κανέναν πλην του διοργανωτή (→ /mine) και οι
    CANCELLED δεν έχουν νόημα στην αναζήτηση.
    """
    query = db.query(models.Event).filter(models.Event.status == "PUBLISHED")

    if q:
        pattern = f"%{_escape_like(q)}%"
        # ilike: στη MySQL το collation utf8mb4_0900_ai_ci είναι ήδη
        # case-insensitive, αλλά το ilike το εγγυάται ανεξάρτητα από collation.
        query = query.filter(
            or_(
                models.Event.title.ilike(pattern, escape="\\"),
                models.Event.description.ilike(pattern, escape="\\"),
            )
        )

    if city:
        query = query.filter(models.Event.city == city)

    if category:
        # .any() πάνω στη σχέση many-to-many παράγει EXISTS μέσω του
        # event_has_categories. Προτιμάται από JOIN: το JOIN θα πολλαπλασίαζε
        # τις γραμμές της εκδήλωσης και θα χαλούσε το count() και το LIMIT.
        query = query.filter(
            models.Event.categories.any(models.EventCategory.category_name == category)
        )

    if from_ is not None:
        query = query.filter(models.Event.start_date_time >= schemas.to_naive_utc(from_))
    if to is not None:
        query = query.filter(models.Event.start_date_time <= schemas.to_naive_utc(to))

    # Εύρος τιμής: θέλουμε εκδηλώσεις με ΕΝΑΝ τουλάχιστον τύπο εισιτηρίου μέσα
    # στο εύρος. Γι' αυτό ΕΝΑ .any() με σύζευξη των δύο ορίων και όχι δύο
    # ξεχωριστά .any(), που θα ικανοποιούνταν από δύο ΔΙΑΦΟΡΕΤΙΚΟΥΣ τύπους
    # (π.χ. ένα φθηνό και ένα ακριβό εισιτήριο, κανένα εντός του εύρους).
    price_conditions = []
    if minPrice is not None:
        price_conditions.append(models.TicketType.price >= minPrice)
    if maxPrice is not None:
        price_conditions.append(models.TicketType.price <= maxPrice)
    if price_conditions:
        query = query.filter(models.Event.ticket_types.any(and_(*price_conditions)))

    # Το count() πριν από το order_by: δεν χρειάζεται ταξινόμηση για να μετρήσεις.
    total = query.count()

    if sort == "title":
        order = [models.Event.title.asc()]
    elif sort == "price":
        # Φθηνότερο εισιτήριο της κάθε εκδήλωσης, ως συσχετισμένο subquery.
        # Με JOIN + MIN() θα χρειαζόταν GROUP BY σε όλες τις στήλες του events.
        cheapest_ticket = (
            select(func.min(models.TicketType.price))
            .where(models.TicketType.event_id == models.Event.events_id)
            .scalar_subquery()
        )
        order = [cheapest_ticket.asc()]
    else:
        # default "date": πρώτα όσες γίνονται συντομότερα (§2.3).
        order = [models.Event.start_date_time.asc()]

    rows = (
        query.options(*_event_load_options())
        # Το events_id ως τελευταίο κριτήριο κάνει ντετερμινιστική τη σειρά όταν
        # δύο εκδηλώσεις έχουν ίδια ημερομηνία/τιμή/τίτλο — αλλιώς θα
        # μετακινούνταν ανάμεσα στις σελίδες.
        .order_by(*order, models.Event.events_id.asc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )

    return schemas.Page[schemas.EventResponse].build(
        items=[schemas.EventResponse.from_event(e) for e in rows],
        page=page,
        page_size=pageSize,
        total=total,
    )


@router.get("/{event_id}", response_model=schemas.EventResponse)
def get_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: Optional[models.User] = Depends(get_current_user_optional),
):
    """Εκφώνηση §6 / API_CONTRACT.md §2.3 — προβολή μίας εκδήλωσης.

    Ανοιχτό και σε επισκέπτες (GUEST): γι' αυτό get_current_user_optional,
    που επιστρέφει None αντί για 401 όταν λείπει το JWT.
    """
    event = (
        db.query(models.Event)
        .filter(models.Event.events_id == event_id)
        .first()
    )
    if event is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Η εκδήλωση δεν βρέθηκε.")

    # Μη-δημοσιευμένη εκδήλωση τη βλέπει μόνο ο διοργανωτής της (και ο admin).
    # Επιστρέφουμε 404 και όχι 403, ώστε να μην αποκαλύπτουμε καν την ύπαρξη
    # των DRAFT εκδηλώσεων άλλων χρηστών.
    is_owner = current_user is not None and event.organizer_id == current_user.user_id
    is_admin = current_user is not None and current_user.role == "ADMIN"
    if event.status == "DRAFT" and not (is_owner or is_admin):
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Η εκδήλωση δεν βρέθηκε.")

    # Side-effect (API_CONTRACT.md §2.3): καταγράφουμε την επίσκεψη ως δεδομένο
    # cold-start για τον αλγόριθμο συστάσεων (§13). Δεν καταγράφουμε τις
    # επισκέψεις του ίδιου του διοργανωτή — θα μόλυναν τις προτάσεις του.
    if current_user is not None and not is_owner and event.status == "PUBLISHED":
        db.add(models.EventVisit(user_id=current_user.user_id, event_id=event.events_id))
        db.commit()

    return schemas.EventResponse.from_event(event)


# ---------------------------------------------------------
# Endpoints διαχείρισης — μόνο ο διοργανωτής (owner)
# ---------------------------------------------------------

def _get_owned_event(
    db: Session, event_id: int, current_user: models.User, lock: bool = False
) -> models.Event:
    """Φέρνει την εκδήλωση και επιβάλλει τον έλεγχο ιδιοκτησίας.

    `lock=True` → SELECT ... FOR UPDATE. Το χρειαζόμαστε σε ό,τι πειράζει
    διαθεσιμότητα ή κρατήσεις, ώστε να μη μας προσπεράσει ένα ταυτόχρονο
    POST /api/bookings ανάμεσα στον έλεγχο και την εγγραφή.
    """
    query = db.query(models.Event).filter(models.Event.events_id == event_id)
    if lock:
        query = query.with_for_update()
    event = query.first()

    if event is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Η εκδήλωση δεν βρέθηκε.")
    if event.organizer_id != current_user.user_id:
        raise _error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Μόνο ο διοργανωτής της εκδήλωσης έχει πρόσβαση σε αυτή την ενέργεια.",
        )
    return event


@router.post("/{event_id}/publish", response_model=schemas.EventResponse)
def publish_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.3 — δημοσίευση: DRAFT → PUBLISHED.

    Μέχρι να γίνει αυτό, η εκδήλωση δεν εμφανίζεται στην αναζήτηση και το
    POST /api/bookings την απορρίπτει με 409 EVENT_NOT_ACTIVE.
    """
    event = _get_owned_event(db, event_id, current_user, lock=True)

    # Idempotent: αν είναι ήδη δημοσιευμένη, δεύτερο κλικ στο κουμπί δεν είναι
    # σφάλμα — απλώς επιστρέφουμε την τρέχουσα κατάσταση.
    if event.status == "PUBLISHED":
        return schemas.EventResponse.from_event(event)

    # Από CANCELLED ή COMPLETED δεν γυρνάμε πίσω σε PUBLISHED: οι κρατήσεις
    # διατηρούνται για ιστορικότητα και η αναβίωση θα τις έκανε ξανά ενεργές.
    if event.status != "DRAFT":
        raise _error(
            status.HTTP_409_CONFLICT,
            "EVENT_NOT_ACTIVE",
            f"Δεν μπορεί να δημοσιευτεί εκδήλωση σε κατάσταση {event.status}.",
        )

    event.status = "PUBLISHED"
    db.commit()
    db.refresh(event)
    return schemas.EventResponse.from_event(event)


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §7γ — διαγραφή πριν από τη δημοσίευση ή, το αργότερο, πριν από
    την υποβολή της πρώτης κράτησης.

    Ο κανόνας είναι το `models.Event.is_deletable` — το ίδιο που τροφοδοτεί το
    `isDeletable` του DTO. Το frontend κρύβει το κουμπί, αλλά ο έλεγχος πρέπει να
    υπάρχει και εδώ: το frontend δείχνει, ο server αποφασίζει.
    """
    # Το lock=True έχει εδώ ουσία: χωρίς αυτό, μια κράτηση που φτάνει ταυτόχρονα
    # θα μπορούσε να γραφτεί ανάμεσα στον έλεγχο «καμία κράτηση» και στη διαγραφή.
    event = _get_owned_event(db, event_id, current_user, lock=True)

    if not event.is_deletable:
        reason = (
            "η ακυρωμένη εκδήλωση διατηρείται για λόγους ιστορικότητας"
            if event.status == "CANCELLED"
            else "υπάρχουν ήδη κρατήσεις — χρησιμοποιήστε την ακύρωση"
        )
        raise _error(
            status.HTTP_409_CONFLICT,
            "DELETE_NOT_ALLOWED",
            f"Η εκδήλωση δεν μπορεί να διαγραφεί: {reason}.",
        )

    photo_files = [item.filename for item in event.media]

    # Τα ticket_types / media / visits φεύγουν με cascade (βλ. models.py),
    # όπως και οι γραμμές του event_has_categories — οι ίδιες οι κατηγορίες
    # παραμένουν, γιατί τις μοιράζονται και άλλες εκδηλώσεις.
    db.delete(event)
    db.commit()

    # Τα αρχεία σβήνονται ΜΕΤΑ το επιτυχές commit: αν η βάση αποτύγχανε, δεν
    # θέλουμε εκδήλωση που υπάρχει ακόμη αλλά έχει χάσει τις φωτογραφίες της.
    for filename in photo_files:
        media.delete_file(filename)
    return None


@router.put("/{event_id}", response_model=schemas.EventResponse)
def update_event(
    event_id: int,
    payload: schemas.EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.3 — επεξεργασία (ίδιο body με τη δημιουργία).

    Οι τύποι εισιτηρίων ταυτοποιούνται με το `name` (το body δεν στέλνει ids):
    όσα ονόματα υπάρχουν ενημερώνονται, τα καινούρια προστίθενται, όσα λείπουν
    διαγράφονται. Γι' αυτό το EventCreate απαιτεί μοναδικά ονόματα.
    """
    event = _get_owned_event(db, event_id, current_user, lock=True)

    if event.status not in ("DRAFT", "PUBLISHED"):
        raise _error(
            status.HTTP_409_CONFLICT,
            "EVENT_NOT_ACTIVE",
            f"Δεν επιτρέπεται επεξεργασία εκδήλωσης σε κατάσταση {event.status}.",
        )

    # Κλείδωμα με την ΙΔΙΑ σειρά που το κάνει το POST /api/bookings
    # (πρώτα event, μετά ticket_types κατά id) — σταθερή σειρά = χωρίς deadlocks.
    ticket_types = (
        db.query(models.TicketType)
        .filter(models.TicketType.event_id == event.events_id)
        .order_by(models.TicketType.ticket_types_id)
        .with_for_update()
        .all()
    )
    existing = {t.name: t for t in ticket_types}

    # --- 1. ΟΛΟΙ οι έλεγχοι πριν από οποιαδήποτε αλλαγή ---------------------
    # Έτσι, αν κάτι αποτύχει, η εκδήλωση μένει ακριβώς όπως ήταν.
    total_quantity = sum(t.quantity for t in payload.ticketTypes)
    if total_quantity > payload.capacity:
        raise _error(
            status.HTTP_409_CONFLICT,
            "CAPACITY_EXCEEDED",
            f"Το σύνολο των εισιτηρίων ({total_quantity}) ξεπερνά "
            f"τη χωρητικότητα της εκδήλωσης ({payload.capacity}).",
        )

    incoming = {t.name: t for t in payload.ticketTypes}

    # Τύπος που αφαιρείται δεν πρέπει να έχει πουλημένα εισιτήρια.
    for name, ticket in existing.items():
        reserved = ticket.quantity - ticket.available
        if name not in incoming and reserved > 0:
            raise _error(
                status.HTTP_409_CONFLICT,
                "SEATS_UNAVAILABLE",
                f"Ο τύπος «{name}» δεν διαγράφεται: υπάρχουν ήδη {reserved} κρατήσεις.",
            )

    # Τύπος που παραμένει δεν πρέπει να πέσει κάτω από τα ήδη δεσμευμένα.
    for name, ticket in existing.items():
        if name not in incoming:
            continue
        reserved = ticket.quantity - ticket.available
        if incoming[name].quantity < reserved:
            raise _error(
                status.HTTP_409_CONFLICT,
                "SEATS_UNAVAILABLE",
                f"Ο τύπος «{name}» έχει ήδη {reserved} κρατήσεις — "
                f"η ποσότητα δεν μπορεί να γίνει {incoming[name].quantity}.",
            )

    # --- 2. Εφαρμογή αλλαγών ------------------------------------------------
    event.title = payload.title
    event.event_type = payload.eventType
    event.venue = payload.venue
    event.address = payload.address
    event.city = payload.city
    event.country = payload.country
    event.latitude = payload.geoLocation.lat if payload.geoLocation else None
    event.longitude = payload.geoLocation.lng if payload.geoLocation else None
    event.start_date_time = schemas.to_naive_utc(payload.startDateTime)
    event.end_date_time = schemas.to_naive_utc(payload.endDateTime)
    event.capacity = payload.capacity
    event.description = payload.description
    # Το `status` ΔΕΝ αλλάζει εδώ: γι' αυτό υπάρχουν τα /publish και /cancel.

    for name, ticket in existing.items():
        if name not in incoming:
            event.ticket_types.remove(ticket)  # delete-orphan → DELETE

    for incoming_ticket in payload.ticketTypes:
        ticket = existing.get(incoming_ticket.name)
        if ticket is None:
            event.ticket_types.append(
                models.TicketType(
                    name=incoming_ticket.name,
                    price=incoming_ticket.price,
                    quantity=incoming_ticket.quantity,
                    available=incoming_ticket.quantity,
                )
            )
        else:
            # Κρατάμε σταθερά τα ήδη δεσμευμένα και ξαναϋπολογίζουμε το
            # available. Αν π.χ. 250→300 με 2 κρατήσεις: available = 300−2 = 298.
            reserved = ticket.quantity - ticket.available
            ticket.price = incoming_ticket.price
            ticket.quantity = incoming_ticket.quantity
            ticket.available = incoming_ticket.quantity - reserved

    event.categories = _resolve_categories(db, payload.categories)

    # Φωτογραφίες: το PUT μπορεί μόνο να ΑΦΑΙΡΕΣΕΙ. Ό,τι λείπει από τη λίστα
    # σβήνεται· ονόματα που δεν ανήκουν ήδη στην εκδήλωση αγνοούνται, ώστε να μη
    # μπορεί κανείς να «δανειστεί» το αρχείο άλλης εκδήλωσης. Νέες φωτογραφίες
    # ανεβαίνουν μόνο με POST /api/events/{id}/media.
    keep = set(payload.media)
    removed_files = []
    for item in list(event.media):
        if item.filename not in keep:
            removed_files.append(item.filename)
            event.media.remove(item)  # delete-orphan → DELETE

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    for filename in removed_files:
        media.delete_file(filename)

    db.refresh(event)
    return schemas.EventResponse.from_event(event)


@router.post(
    "/{event_id}/media",
    response_model=schemas.EventResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_event_media(
    event_id: int,
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §7α — ανέβασμα φωτογραφιών εκδήλωσης (owner only).

    multipart/form-data με ένα ή περισσότερα πεδία `files`. Όλα ή τίποτα: αν μία
    φωτογραφία είναι άκυρη, δεν αποθηκεύεται καμία.
    """
    event = _get_owned_event(db, event_id, current_user)

    if event.status not in ("DRAFT", "PUBLISHED"):
        raise _error(
            status.HTTP_409_CONFLICT,
            "EVENT_NOT_ACTIVE",
            f"Δεν προστίθενται φωτογραφίες σε εκδήλωση σε κατάσταση {event.status}.",
        )

    if len(event.media) + len(files) > media.MAX_PHOTOS_PER_EVENT:
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "VALIDATION_ERROR",
            f"Μέχρι {media.MAX_PHOTOS_PER_EVENT} φωτογραφίες ανά εκδήλωση "
            f"(υπάρχουν ήδη {len(event.media)}).",
        )

    # --- 1. Έλεγχος ΟΛΩΝ πριν γραφτεί οτιδήποτε ---------------------------
    contents = []
    for upload in files:
        # Διαβάζουμε ένα byte παραπάνω από το όριο: έτσι καταλαβαίνουμε ότι το
        # αρχείο το ξεπερνά χωρίς να φορτώσουμε ολόκληρο ένα τεράστιο αρχείο.
        data = upload.file.read(media.MAX_PHOTO_BYTES + 1)
        if len(data) > media.MAX_PHOTO_BYTES:
            raise _error(
                status.HTTP_400_BAD_REQUEST,
                "VALIDATION_ERROR",
                f"Η φωτογραφία «{upload.filename}» ξεπερνά τα 5 MB.",
            )
        if media.detect_image_type(data[:12]) is None:
            raise _error(
                status.HTTP_400_BAD_REQUEST,
                "VALIDATION_ERROR",
                f"Το «{upload.filename}» δεν είναι εικόνα JPEG, PNG, GIF ή WebP.",
            )
        contents.append(data)

    # --- 2. Αποθήκευση ------------------------------------------------------
    saved = []
    try:
        for data in contents:
            filename = media.save_image(data)
            saved.append(filename)
            event.media.append(models.EventMedia(filename=filename))
        db.commit()
    except Exception:
        db.rollback()
        # Η βάση γύρισε πίσω — τα αρχεία που πρόλαβαν να γραφτούν δεν πρέπει να
        # μείνουν ορφανά στον δίσκο.
        for filename in saved:
            media.delete_file(filename)
        raise

    db.refresh(event)
    return schemas.EventResponse.from_event(event)


@router.get("/{event_id}/bookings", response_model=schemas.Page[schemas.BookingResponse])
def list_event_bookings(
    event_id: int,
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.3 — οι κρατήσεις μιας εκδήλωσης (owner only).

    Εδώ φαίνονται προσωπικά δεδομένα άλλων χρηστών (ποιος κράτησε, πόσα, πόσο),
    γι' αυτό περνάει υποχρεωτικά από το _get_owned_event: μη-διοργανωτής → 403.
    """
    event = _get_owned_event(db, event_id, current_user)

    query = (
        db.query(models.Booking)
        .filter(models.Booking.events_id == event.events_id)
        .order_by(models.Booking.booking_time.desc(), models.Booking.booking_id.desc())
    )

    total = query.count()
    rows = query.offset((page - 1) * pageSize).limit(pageSize).all()

    return schemas.Page[schemas.BookingResponse].build(
        items=[schemas.BookingResponse.from_booking(b) for b in rows],
        page=page,
        page_size=pageSize,
        total=total,
    )


@router.post("/{event_id}/cancel", response_model=schemas.EventResponse)
def cancel_event(
    event_id: int,
    payload: Optional[schemas.EventCancel] = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §7γ + §10 — ακύρωση εκδήλωσης με ενημέρωση των συμμετεχόντων.

    ΑΤΟΜΙΚΟΤΗΤΑ: η αλλαγή κατάστασης και ΟΛΑ τα μηνύματα γράφονται με ένα
    και μόνο db.commit(). Αν σκάσει οτιδήποτε, το rollback τα αναιρεί όλα μαζί.
    Η εναλλακτική —commit της ακύρωσης και μετά commit των μηνυμάτων— θα μπορούσε
    να αφήσει εκδήλωση ακυρωμένη με τους συμμετέχοντες να μην το έχουν μάθει ποτέ.
    """
    event = _get_owned_event(db, event_id, current_user, lock=True)

    # Μόνο δημοσιευμένη εκδήλωση ακυρώνεται: η DRAFT δεν έχει κρατήσεις ούτε
    # κοινό (απλώς διαγράφεται), ενώ CANCELLED/COMPLETED δεν ξανα-ακυρώνονται.
    if event.status != "PUBLISHED":
        raise _error(
            status.HTTP_409_CONFLICT,
            "EVENT_NOT_ACTIVE",
            f"Ακυρώνονται μόνο δημοσιευμένες εκδηλώσεις (τρέχουσα κατάσταση: {event.status}).",
        )

    event.status = "CANCELLED"

    # Οι κρατήσεις ΔΕΝ πειράζονται (εκφώνηση §7γ): μένουν ως ιστορικό, και το
    # `available` των εισιτηρίων μένει ως έχει. Η κατάσταση CANCELLED της
    # εκδήλωσης είναι αρκετή για να μη δέχεται νέες κρατήσεις.

    # --- Broadcast (εκφώνηση §10) -----------------------------------------
    # DISTINCT: όποιος έκανε 3 κρατήσεις παίρνει ΕΝΑ μήνυμα, όχι τρία.
    attendee_ids = [
        row[0]
        for row in db.query(models.Booking.attendee_id)
        .filter(
            models.Booking.events_id == event.events_id,
            # Όποιος έχει ήδη ακυρώσει τη δική του κράτηση δεν χρειάζεται ειδοποίηση.
            models.Booking.status != "CANCELLED",
        )
        .distinct()
        .all()
    ]

    subject = f"Ακύρωση εκδήλωσης: {event.title}"
    body = f"Η εκδήλωση «{event.title}» ακυρώθηκε από τον διοργανωτή."
    if payload is not None and payload.note:
        body = f"{body}\n\n{payload.note}"

    messages = [
        models.Message(
            subject=subject,
            body=body,
            is_read=False,
            # Αποστολέας είναι ο ΔΙΟΡΓΑΝΩΤΗΣ, όχι ο admin: αυτός ακύρωσε και σε
            # αυτόν θα απαντήσει ο συμμετέχων (§2.5 — επικοινωνία διοργανωτή↔
            # συμμετέχοντα). Το from_user_id είναι NOT NULL, οπότε χρειάζεται
            # ούτως ή άλλως υπαρκτός χρήστης.
            from_user_id=current_user.user_id,
            to_user_id=attendee_id,
            fk_event_id=event.events_id,
        )
        for attendee_id in attendee_ids
        # Αν ο διοργανωτής έχει κρατήσει θέση στη δική του εκδήλωση, δεν
        # στέλνουμε μήνυμα στον εαυτό του.
        if attendee_id != current_user.user_id
    ]
    db.add_all(messages)

    try:
        # ΕΝΑ commit: status + όλα τα μηνύματα στην ίδια συναλλαγή.
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(event)
    return schemas.EventResponse.from_event(event)


# =========================================================
# TODO (Ανδρέας) — βλ. API_CONTRACT.md §2.3, ό,τι απομένει:
#
#   POST   /{id}/visit    → ρητή καταγραφή επίσκεψης (204) — εναλλακτική του
#                           implicit side-effect του GET /{id}
# =========================================================
