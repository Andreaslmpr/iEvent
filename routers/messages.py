from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

import models
import schemas
from database import get_db
from security import get_current_user

router = APIRouter(
    prefix="/api/messages",
    tags=["Messaging"]
)


# Ίδιο μοτίβο με τα υπόλοιπα routers: τυποποιημένη μορφή σφάλματος (§0).
def _error(http_status: int, code: str, message: str) -> HTTPException:
    return HTTPException(
        status_code=http_status,
        detail={"error": {"code": code, "message": message}},
    )


def _message_load_options():
    """Το MessageResponse.from_message() διαβάζει sender και receiver.

    Χωρίς αυτό, μια σελίδα 20 μηνυμάτων θα έκανε 40 επιπλέον queries (N+1).
    joinedload και όχι selectinload επειδή είναι σχέσεις many-to-one.
    """
    return (
        joinedload(models.Message.sender),
        joinedload(models.Message.receiver),
    )


def _has_booking(db: Session, user_id: int, event_id: int) -> bool:
    """Έχει ο χρήστης (μη ακυρωμένη) κράτηση σε αυτή την εκδήλωση;"""
    return (
        db.query(models.Booking.booking_id)
        .filter(
            models.Booking.attendee_id == user_id,
            models.Booking.events_id == event_id,
            models.Booking.status != "CANCELLED",
        )
        .first()
        is not None
    )


def _paginate_messages(query, page: int, page_size: int) -> schemas.Page:
    total = query.count()
    rows = (
        query.options(*_message_load_options())
        # Δεύτερο κριτήριο το message_id: η MySQL κρατά DATETIME με ακρίβεια
        # δευτερολέπτου, οπότε δύο μηνύματα της ίδιας στιγμής θα άλλαζαν σειρά
        # μεταξύ των requests και θα χάνονταν/διπλασιάζονταν στη σελιδοποίηση.
        .order_by(models.Message.sent_at.desc(), models.Message.message_id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return schemas.Page[schemas.MessageResponse].build(
        items=[schemas.MessageResponse.from_message(m) for m in rows],
        page=page,
        page_size=page_size,
        total=total,
    )


# ---------------------------------------------------------
# ΠΡΟΣΟΧΗ: τα σταθερά paths (/inbox, /outbox, /unread-count) δηλώνονται ΠΡΙΝ
# το /{message_id}, αλλιώς το FastAPI θα διάβαζε το "inbox" ως message_id.
# ---------------------------------------------------------

@router.post("", response_model=schemas.MessageResponse, status_code=status.HTTP_201_CREATED)
def send_message(
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Εκφώνηση §10 / API_CONTRACT.md §2.5 — αποστολή μηνύματος.

    Η εκφώνηση επιτρέπει επικοινωνία διοργανωτή↔συμμετέχοντα ΜΕΤΑ από κράτηση.
    Χωρίς αυτόν τον έλεγχο, οποιοσδήποτε εγκεκριμένος χρήστης θα μπορούσε να
    στείλει μήνυμα σε οποιονδήποτε άλλον — δηλαδή ανοιχτό spam.
    """
    if payload.toUserId == current_user.user_id:
        raise _error(
            status.HTTP_400_BAD_REQUEST,
            "VALIDATION_ERROR",
            "Δεν μπορείτε να στείλετε μήνυμα στον εαυτό σας.",
        )

    recipient = (
        db.query(models.User)
        .filter(models.User.user_id == payload.toUserId)
        .first()
    )
    if recipient is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Ο παραλήπτης δεν βρέθηκε.")

    event = (
        db.query(models.Event)
        .filter(models.Event.events_id == payload.eventId)
        .first()
    )
    if event is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Η εκδήλωση δεν βρέθηκε.")

    # --- Ο κανόνας του §10 -------------------------------------------------
    # Επιτρεπτό μόνο αν οι δύο πλευρές συνδέονται μέσω ΑΥΤΗΣ της εκδήλωσης:
    # ο ένας είναι ο διοργανωτής και ο άλλος έχει κράτηση.
    sender_is_organizer = event.organizer_id == current_user.user_id
    recipient_is_organizer = event.organizer_id == payload.toUserId

    allowed = (
        (sender_is_organizer and _has_booking(db, payload.toUserId, event.events_id))
        or (recipient_is_organizer and _has_booking(db, current_user.user_id, event.events_id))
    )
    if not allowed:
        raise _error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Επικοινωνία επιτρέπεται μόνο μεταξύ του διοργανωτή και ενός "
            "συμμετέχοντα με κράτηση σε αυτή την εκδήλωση.",
        )

    message = models.Message(
        subject=payload.subject,
        body=payload.body,
        is_read=False,
        from_user_id=current_user.user_id,
        to_user_id=payload.toUserId,
        fk_event_id=event.events_id,
    )
    db.add(message)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(message)
    return schemas.MessageResponse.from_message(message)


@router.get("/inbox", response_model=schemas.Page[schemas.MessageResponse])
def inbox(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.5 — εισερχόμενα του χρήστη (paginated)."""
    query = db.query(models.Message).filter(
        models.Message.to_user_id == current_user.user_id
    )
    return _paginate_messages(query, page, pageSize)


@router.get("/outbox", response_model=schemas.Page[schemas.MessageResponse])
def outbox(
    page: int = Query(1, ge=1),
    pageSize: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.5 — απεσταλμένα του χρήστη (paginated).

    Το path είναι /outbox όπως το ορίζει το συμβόλαιο (όχι /sent).
    """
    query = db.query(models.Message).filter(
        models.Message.from_user_id == current_user.user_id
    )
    return _paginate_messages(query, page, pageSize)


@router.get("/unread-count", response_model=schemas.UnreadCount)
def unread_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.5 — { "count": 3 } για το badge του μενού.

    Το frontend το κάνει poll κάθε ~30s, γι' αυτό είναι σκέτο COUNT(*) και δεν
    φορτώνει καθόλου μηνύματα.
    """
    count = (
        db.query(models.Message)
        .filter(
            models.Message.to_user_id == current_user.user_id,
            models.Message.is_read.is_(False),
        )
        .count()
    )
    return schemas.UnreadCount(count=count)


def _get_message_for_user(db: Session, message_id: int, current_user: models.User) -> models.Message:
    """Φέρνει το μήνυμα και επιτρέπει πρόσβαση μόνο σε αποστολέα/παραλήπτη."""
    message = (
        db.query(models.Message)
        .options(*_message_load_options())
        .filter(models.Message.message_id == message_id)
        .first()
    )
    if message is None:
        raise _error(status.HTTP_404_NOT_FOUND, "NOT_FOUND", "Το μήνυμα δεν βρέθηκε.")

    if current_user.user_id not in (message.from_user_id, message.to_user_id):
        raise _error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Δεν έχετε πρόσβαση σε αυτό το μήνυμα.",
        )
    return message


@router.put("/{message_id}/read", response_model=schemas.MessageResponse)
def mark_message_read(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ρητό μαρκάρισμα ως αναγνωσμένο.

    ΜΟΝΟ ο παραλήπτης: ο αποστολέας δεν πρέπει να μπορεί να «διαβάσει» το
    μήνυμα εκ μέρους του άλλου και να του μηδενίσει το badge.
    Idempotent — δεύτερη κλήση δεν αλλάζει τίποτα.
    """
    message = _get_message_for_user(db, message_id, current_user)

    if message.to_user_id != current_user.user_id:
        raise _error(
            status.HTTP_403_FORBIDDEN,
            "FORBIDDEN",
            "Μόνο ο παραλήπτης μπορεί να μαρκάρει το μήνυμα ως αναγνωσμένο.",
        )

    if not message.is_read:
        message.is_read = True
        db.commit()
        db.refresh(message)

    return schemas.MessageResponse.from_message(message)


@router.get("/{message_id}", response_model=schemas.MessageResponse)
def get_message(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """API_CONTRACT.md §2.5 — άνοιγμα μηνύματος· το μαρκάρει read:true.

    Το συμβόλαιο ορίζει ότι το ίδιο το άνοιγμα σημειώνει το μήνυμα ως
    αναγνωσμένο. Γίνεται μόνο όταν το ανοίγει ο ΠΑΡΑΛΗΠΤΗΣ — ο αποστολέας
    βλέπει το δικό του απεσταλμένο χωρίς να επηρεάζει την κατάστασή του.
    """
    message = _get_message_for_user(db, message_id, current_user)

    if message.to_user_id == current_user.user_id and not message.is_read:
        message.is_read = True
        db.commit()
        db.refresh(message)

    return schemas.MessageResponse.from_message(message)


# =========================================================
# TODO (Ανδρέας) — βλ. API_CONTRACT.md §2.5:
#
#   DELETE /{id}  → διαγραφή από inbox/outbox → 204
#
# ΘΕΛΕΙ ΑΠΟΦΑΣΗ ΠΡΩΤΑ: η ίδια γραμμή `messages` εξυπηρετεί και τις δύο πλευρές.
# Σκέτο DELETE θα έσβηνε το μήνυμα και από τον άλλον χρήστη. Χρειάζονται δύο
# στήλες soft-delete (deleted_by_sender / deleted_by_receiver) και migration.
# =========================================================
