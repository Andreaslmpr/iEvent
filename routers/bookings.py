from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

import models
import schemas
from database import get_db
from security import get_current_user

router = APIRouter(
    prefix="/api/bookings",
    tags=["Bookings"]
)


def _error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"error": {"code": code, "message": message}},
    )


# Δηλώνουμε το path ως "" (άρα /api/bookings) και ΟΧΙ "/" — αλλιώς το FastAPI
# κάνει 307 redirect από /api/bookings σε /api/bookings/, που σπάει το CORS
# preflight του React.
@router.post("", response_model=schemas.BookingResponse, status_code=status.HTTP_201_CREATED)
def create_booking(
    payload: schemas.BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §9 / API_CONTRACT.md §2.4 — υποβολή κράτησης.

    Ο έλεγχος διαθεσιμότητας και η μείωση των θέσεων ΠΡΕΠΕΙ να γίνουν ατομικά
    (atomic), αλλιώς δύο ταυτόχρονα requests διαβάζουν το ίδιο `available` και
    κάνουν overbooking. Γι' αυτό κλειδώνουμε τις γραμμές με SELECT ... FOR UPDATE
    (`.with_for_update()`) πριν τους ελέγχους: τα κλειδιά κρατιούνται μέχρι το
    commit, οπότε το δεύτερο request περιμένει και βλέπει τις ενημερωμένες τιμές.
    """

    # --- 1. Κλειδώνουμε την εκδήλωση --------------------------------------
    # Πάντα κλειδώνουμε ΠΡΩΤΑ το event και ΜΕΤΑ τα ticket_types. Η σταθερή σειρά
    # κλειδώματος είναι αυτή που μας προστατεύει από deadlocks.
    event = (
        db.query(models.Event)
        .filter(models.Event.events_id == payload.eventId)
        .with_for_update()
        .first()
    )
    if event is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Η εκδήλωση δεν βρέθηκε.")

    # Κρατήσεις επιτρέπονται μόνο σε δημοσιευμένη εκδήλωση: DRAFT δεν είναι ορατή,
    # CANCELLED/COMPLETED δεν δέχονται νέες κρατήσεις (εκφώνηση §7γ).
    if event.status != "PUBLISHED":
        raise _error(
            status.HTTP_409_CONFLICT,
            "EVENT_NOT_ACTIVE",
            "Η εκδήλωση δεν δέχεται κρατήσεις αυτή τη στιγμή.",
        )

    # --- 2. Κλειδώνουμε ΟΛΟΥΣ τους τύπους εισιτηρίων της εκδήλωσης ---------
    # Όχι μόνο τον ζητούμενο: χρειαζόμαστε όλες τις γραμμές για να υπολογίσουμε
    # σωστά τις συνολικές δεσμευμένες θέσεις στον έλεγχο χωρητικότητας (§9).
    ticket_types = (
        db.query(models.TicketType)
        .filter(models.TicketType.event_id == event.events_id)
        .order_by(models.TicketType.ticket_types_id)
        .with_for_update()
        .all()
    )

    ticket = next(
        (t for t in ticket_types if t.ticket_types_id == payload.ticketTypeId),
        None,
    )
    if ticket is None:
        raise _error(
            status.HTTP_404_NOT_FOUND,
            "NOT_FOUND",
            "Ο τύπος εισιτηρίου δεν βρέθηκε σε αυτή την εκδήλωση.",
        )

    # --- 3. Έλεγχος διαθεσιμότητας του συγκεκριμένου τύπου ----------------
    if payload.numberOfTickets > ticket.available:
        raise _error(
            status.HTTP_409_CONFLICT,
            "SEATS_UNAVAILABLE",
            f"Διαθέσιμα μόνο {ticket.available} εισιτήρια για τον τύπο «{ticket.name}».",
        )

    # --- 4. Έλεγχος συνολικής χωρητικότητας -------------------------------
    # Δεσμευμένες θέσεις = Σ(quantity - available) για κάθε τύπο εισιτηρίου.
    reserved_total = sum(t.quantity - t.available for t in ticket_types)
    if reserved_total + payload.numberOfTickets > event.capacity:
        raise _error(
            status.HTTP_409_CONFLICT,
            "CAPACITY_EXCEEDED",
            "Δεν επαρκεί η συνολική χωρητικότητα της εκδήλωσης.",
        )

    # --- 5. Καταχώρηση της κράτησης ---------------------------------------
    # Το κόστος υπολογίζεται ΕΔΩ σε Decimal (όχι float, όχι από το frontend).
    total_cost = ticket.price * payload.numberOfTickets

    ticket.available -= payload.numberOfTickets

    booking = models.Booking(
        number_of_tickets=payload.numberOfTickets,
        total_cost=total_cost,
        status="CONFIRMED",
        # Γράφουμε ρητά UTC (ως naive, όπως το αποθηκεύει η MySQL) αντί να
        # βασιστούμε στο CURRENT_TIMESTAMP του server, που μπορεί να είναι
        # σε τοπική ζώνη και να χαλάσει το ISO-8601 UTC του contract.
        booking_time=datetime.now(timezone.utc).replace(tzinfo=None),
        attendee_id=current_user.user_id,
        events_id=event.events_id,
        ticket_types_id=ticket.ticket_types_id,
    )
    db.add(booking)

    try:
        db.commit()
    except Exception:
        # Αν κάτι σκάσει στο commit, γυρνάμε τη βάση πίσω ώστε να μη μείνει
        # μειωμένο το available χωρίς αντίστοιχη κράτηση.
        db.rollback()
        raise

    db.refresh(booking)
    return schemas.BookingResponse.from_booking(booking)


@router.get("/mine", response_model=schemas.Page[schemas.BookingResponse])
def list_my_bookings(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.4 — οι κρατήσεις του συνδεδεμένου χρήστη (paginated).

    Τα query params είναι page/pageSize (όχι skip/limit) γιατί έτσι τα ορίζει
    το §0 του συμβολαίου και έτσι τα στέλνει το axios του frontend· το offset
    το υπολογίζουμε εδώ.
    """
    query = (
        db.query(models.Booking)
        .filter(models.Booking.attendee_id == current_user.user_id)
        # Δεύτερο κριτήριο το booking_id: η MySQL κρατά DATETIME με ακρίβεια
        # δευτερολέπτου, οπότε δύο κρατήσεις της ίδιας στιγμής θα έβγαιναν σε
        # τυχαία σειρά και θα «χοροπηδούσαν» ανάμεσα στις σελίδες.
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
