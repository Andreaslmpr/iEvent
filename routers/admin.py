import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload, selectinload

import models
import schemas
from database import get_db
from security import require_admin

# Όλα τα endpoints εδώ απαιτούν ADMIN: το dependency μπαίνει σε επίπεδο router,
# οπότε ΔΕΝ χρειάζεται να το ξαναγράφεις σε κάθε endpoint.
router = APIRouter(
    prefix="/api/admin",
    tags=["Admin"],
    dependencies=[Depends(require_admin)]
)


def _error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"error": {"code": code, "message": message}},
    )


# =========================================================
# 1. ΔΙΑΧΕΙΡΙΣΗ ΧΡΗΣΤΩΝ (εκφώνηση §4 / API_CONTRACT.md §2.2)
# =========================================================

@router.get("/users", response_model=schemas.Page[schemas.UserResponse])
def list_users(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Εκφώνηση §4 — πλοήγηση στη λίστα χρηστών.

    Το ?status=PENDING είναι η βασική χρήση: η οθόνη «εκκρεμείς αιτήσεις».
    Το όνομα της παραμέτρου Python είναι status_filter με alias "status",
    ώστε να μη σκιάζει το `status` module του FastAPI που κάνουμε import.
    """
    query = db.query(models.User)
    if status_filter:
        query = query.filter(models.User.status == status_filter)

    total = query.count()
    rows = (
        query
        # Οι εκκρεμείς πρώτοι στη σειρά εγγραφής: ο διαχειριστής τους εξετάζει
        # με σειρά προτεραιότητας, όχι ανάποδα.
        .order_by(models.User.created.asc(), models.User.user_id.asc())
        .offset((page - 1) * pageSize)
        .limit(pageSize)
        .all()
    )
    return schemas.Page[schemas.UserResponse].build(
        items=[schemas.UserResponse.model_validate(u) for u in rows],
        page=page,
        page_size=pageSize,
        total=total,
    )


def _get_user(db: Session, user_id: int) -> models.User:
    user = db.query(models.User).filter(models.User.user_id == user_id).first()
    if user is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Ο χρήστης δεν βρέθηκε.")
    return user


@router.get("/users/{user_id}", response_model=schemas.UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    """Εκφώνηση §4 — σελίδα στοιχείων ενός χρήστη."""
    return schemas.UserResponse.model_validate(_get_user(db, user_id))


def _set_status(db: Session, user_id: int, new_status: str) -> models.User:
    """Κοινή λογική για approve / reject / PUT status."""
    user = _get_user(db, user_id)

    # Ο διαχειριστής δεν πρέπει να μπορεί να απορρίψει τον εαυτό του (ή άλλον
    # admin) και να κλειδώσει έξω τη διαχείριση της εφαρμογής.
    if user.role == "ADMIN" and new_status != "APPROVED":
        raise _error(
            status.HTTP_409_CONFLICT,
            "FORBIDDEN",
            "Δεν επιτρέπεται η απενεργοποίηση λογαριασμού διαχειριστή.",
        )

    user.status = new_status
    db.commit()
    db.refresh(user)
    return user


@router.post("/users/{user_id}/approve", response_model=schemas.UserResponse)
def approve_user(user_id: int, db: Session = Depends(get_db)):
    """API_CONTRACT.md §2.2 — έγκριση αίτησης εγγραφής."""
    return schemas.UserResponse.model_validate(_set_status(db, user_id, "APPROVED"))


@router.post("/users/{user_id}/reject", response_model=schemas.UserResponse)
def reject_user(user_id: int, db: Session = Depends(get_db)):
    """API_CONTRACT.md §2.2 — απόρριψη αίτησης εγγραφής."""
    return schemas.UserResponse.model_validate(_set_status(db, user_id, "REJECTED"))


@router.put("/users/{user_id}/status", response_model=schemas.UserResponse)
def update_user_status(
    user_id: int,
    payload: schemas.UserStatusUpdate,
    db: Session = Depends(get_db),
):
    """Γενική μεταβολή κατάστασης — καλύπτει και τη μετάβαση REJECTED → APPROVED,
    που τα δύο endpoints approve/reject του συμβολαίου δεν εκφράζουν καθαρά."""
    return schemas.UserResponse.model_validate(_set_status(db, user_id, payload.status))


# =========================================================
# 2. EXPORT ΕΚΔΗΛΩΣΕΩΝ (εκφώνηση §12, DTD του §7)
# =========================================================

# Στο DTD τα ids είναι ΣΥΜΒΟΛΟΣΕΙΡΕΣ με πρόθεμα (EV1024, T1, B501), ενώ
# εσωτερικά είναι integers. Οι μετατροπές γίνονται μόνο εδώ.
def _event_xml_id(event_id: int) -> str:
    return f"EV{event_id}"


def _ticket_xml_id(ticket_type_id: int) -> str:
    return f"T{ticket_type_id}"


def _booking_xml_id(booking_id: int) -> str:
    return f"B{booking_id}"


def _xml_datetime(value: datetime) -> str:
    """Το DTD δείχνει "2025-07-12T20:30:00" — ΧΩΡΙΣ το "Z" του JSON API.

    Κρατάμε ακριβώς τη μορφή του παραδείγματος της εκφώνησης· οι τιμές είναι
    ήδη UTC (έτσι τις γράφουμε στη βάση).
    """
    return value.replace(microsecond=0, tzinfo=None).isoformat()


def _xml_money(value: Decimal) -> str:
    return f"{value:.2f}"


def _xml_coord(value) -> str:
    """Συντεταγμένη χωρίς τα μηδενικά του DECIMAL(10,8).

    Η MySQL επιστρέφει 37.98380000· η εκφώνηση δείχνει Latitude="37.9838".
    Το normalize() κόβει τα τελικά μηδενικά και το format(..., "f") αποτρέπει
    την επιστημονική σημειογραφία (π.χ. 1E+2 αντί για 100).
    """
    return format(Decimal(str(value)).normalize(), "f")


def _sub(parent: ET.Element, tag: str, text: str) -> ET.Element:
    """Θυγατρικό στοιχείο με κείμενο.

    Το ElementTree κάνει μόνο του escaping σε &, < και >, οπότε τίτλοι ή
    περιγραφές με τέτοιους χαρακτήρες δεν σπάνε το XML.
    """
    element = ET.SubElement(parent, tag)
    element.text = text
    return element


def _event_to_xml(parent: ET.Element, event: models.Event) -> None:
    """Χτίζει ένα <Event> ΑΚΡΙΒΩΣ με τη σειρά στοιχείων του DTD:

        Title, Category+, EventType, Venue, Address, City, Country,
        GeoLocation?, StartDateTime, EndDateTime, Capacity, TicketTypes,
        Bookings, Organizer, Status, Description, Media?

    Σε DTD sequence η σειρά ΔΕΝ είναι διακοσμητική: αλλάζοντάς τη, το αρχείο
    παύει να είναι valid ως προς το πρότυπο.
    """
    node = ET.SubElement(parent, "Event", {"EventID": _event_xml_id(event.events_id)})

    _sub(node, "Title", event.title)

    # Category+ : το DTD απαιτεί ΤΟΥΛΑΧΙΣΤΟΝ μία κατηγορία.
    for category in event.categories:
        _sub(node, "Category", category.category_name)

    _sub(node, "EventType", event.event_type)
    _sub(node, "Venue", event.venue)
    _sub(node, "Address", event.address)
    _sub(node, "City", event.city)
    _sub(node, "Country", event.country)

    # GeoLocation? : EMPTY element με δύο υποχρεωτικά attributes. Το παραλείπουμε
    # εντελώς αν λείπει έστω μία συντεταγμένη — μισό GeoLocation θα ήταν invalid.
    if event.latitude is not None and event.longitude is not None:
        ET.SubElement(node, "GeoLocation", {
            "Latitude": _xml_coord(event.latitude),
            "Longitude": _xml_coord(event.longitude),
        })

    _sub(node, "StartDateTime", _xml_datetime(event.start_date_time))
    _sub(node, "EndDateTime", _xml_datetime(event.end_date_time))
    _sub(node, "Capacity", str(event.capacity))

    ticket_types_node = ET.SubElement(node, "TicketTypes")
    for ticket in event.ticket_types:
        ticket_node = ET.SubElement(ticket_types_node, "TicketType", {
            "TicketTypeID": _ticket_xml_id(ticket.ticket_types_id),
        })
        _sub(ticket_node, "Name", ticket.name)
        _sub(ticket_node, "Price", _xml_money(ticket.price))
        _sub(ticket_node, "Quantity", str(ticket.quantity))
        _sub(ticket_node, "Available", str(ticket.available))

    # Bookings* : το στοιχείο υπάρχει πάντα, ακόμη και άδειο.
    bookings_node = ET.SubElement(node, "Bookings")
    for booking in event.bookings:
        booking_node = ET.SubElement(bookings_node, "Booking", {
            "BookingID": _booking_xml_id(booking.booking_id),
        })
        # ΠΡΟΣΟΧΗ: στο DTD το UserID είναι το USERNAME, όχι το ακέραιο id —
        # βλ. παράδειγμα εκφώνησης: <Attendee UserID="maria21"/>.
        ET.SubElement(booking_node, "Attendee", {"UserID": booking.attendee.user_name})
        _sub(booking_node, "Time", _xml_datetime(booking.booking_time))
        _sub(booking_node, "TicketTypeRef", _ticket_xml_id(booking.ticket_types_id))
        _sub(booking_node, "NumberOfTickets", str(booking.number_of_tickets))
        _sub(booking_node, "TotalCost", _xml_money(booking.total_cost))
        _sub(booking_node, "BookingStatus", booking.status)

    ET.SubElement(node, "Organizer", {"UserID": event.organizer.user_name})
    _sub(node, "Status", event.status)
    # Description: υποχρεωτικό στο DTD (χωρίς "?"), οπότε γράφουμε κενό αν λείπει.
    _sub(node, "Description", event.description or "")

    # Media? : παραλείπεται τελείως όταν δεν υπάρχουν φωτογραφίες.
    if event.media:
        media_node = ET.SubElement(node, "Media")
        for item in event.media:
            _sub(media_node, "Photo", item.filename)


def _load_all_events(db: Session) -> list:
    """Όλες οι εκδηλώσεις, με eager loading.

    Χωρίς αυτό το export θα έκανε χιλιάδες queries (N+1 σε 5 σχέσεις, και
    ακόμη 2 ανά κράτηση για attendee/ticket_type).
    """
    return (
        db.query(models.Event)
        .options(
            selectinload(models.Event.categories),
            selectinload(models.Event.ticket_types),
            selectinload(models.Event.media),
            selectinload(models.Event.bookings).joinedload(models.Booking.attendee),
            joinedload(models.Event.organizer),
        )
        .order_by(models.Event.events_id.asc())
        .all()
    )


@router.get("/events/export")
def export_events(
    format: str = Query("xml", pattern="^(xml|json)$"),
    db: Session = Depends(get_db),
):
    """Εκφώνηση §12 — εξαγωγή ΟΛΩΝ των εκδηλώσεων σε XML (κατά το DTD του §7)
    και σε JSON.

    Εξάγονται όλες οι καταστάσεις (DRAFT/PUBLISHED/CANCELLED/COMPLETED): η
    εκφώνηση ζητά «τις εκδηλώσεις που έχουν δημιουργηθεί από τους χρήστες»,
    χωρίς περιορισμό δημοσίευσης.
    """
    events = _load_all_events(db)

    if format == "json":
        # Η «αντίστοιχη μορφή JSON» του §12: τα ίδια δεδομένα μέσω του Event DTO
        # που ήδη καταναλώνει το frontend.
        return [schemas.EventResponse.from_event(e) for e in events]

    root = ET.Element("Events")
    for event in events:
        _event_to_xml(root, event)

    ET.indent(root, space="  ")
    xml_bytes = ET.tostring(root, encoding="utf-8", xml_declaration=True)

    return Response(
        content=xml_bytes,
        media_type="application/xml",
        headers={"Content-Disposition": 'attachment; filename="events.xml"'},
    )
