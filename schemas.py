from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_serializer, model_validator
from typing import Generic, Literal, Optional, TypeVar
from datetime import datetime, timezone
from decimal import Decimal

# Το API_CONTRACT.md ορίζει ISO-8601 σε UTC με "Z" (π.χ. 2026-06-20T11:42:10Z).
# Η MySQL επιστρέφει naive datetimes, οπότε τα θεωρούμε UTC και βάζουμε το Z.
def to_utc_z(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

# ---------------------------------------------------------
# ΣΕΛΙΔΟΠΟΙΗΣΗ (API_CONTRACT.md §0) — ένα wrapper για ΟΛΕΣ τις λίστες
# ---------------------------------------------------------
T = TypeVar("T")

class Page(BaseModel, Generic[T]):
    """{ "items": [...], "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }

    Generic ώστε το response_model να δηλώνεται ως Page[BookingResponse],
    Page[EventResponse] κ.λπ. και να βγαίνει σωστό OpenAPI για τον Γιώργο.
    """
    items: list[T]
    page: int
    pageSize: int
    total: int
    totalPages: int

    @classmethod
    def build(cls, items: list, page: int, page_size: int, total: int) -> "Page":
        # -(-a // b) = ceil(a / b) χωρίς float στρογγυλοποιήσεις.
        total_pages = -(-total // page_size) if page_size > 0 else 0
        return cls(items=items, page=page, pageSize=page_size, total=total, totalPages=total_pages)


# Βοηθητικό σχήμα για τις συντεταγμένες
class GeoLocation(BaseModel):
    lat: float
    lng: float


# Ίδιο σχήμα με έλεγχο ορίων — μόνο για ΕΙΣΟΔΟ. Η έξοδος μένει χωρίς όρια ώστε
# μια παλιά εγγραφή με παράξενη τιμή να μη ρίξει ολόκληρη τη λίστα με 500.
class GeoLocationInput(GeoLocation):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)

# ---------------------------------------------------------
# 1. SCHEMAS ΕΙΣΟΔΟΥ (Τι μας στέλνει το Frontend)
# ---------------------------------------------------------

# Τι περιμένουμε να μας στείλει ο χρήστης στο /auth/register
class UserCreate(BaseModel):
    username: str
    password: str
    confirmPassword: str
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    address: str
    city: str
    country: str
    # ΥΠΟΧΡΕΩΤΙΚΟ: η εκφώνηση §2 ορίζει ότι η εγγραφή «θα απαιτεί» στοιχεία
    # διεύθυνσης ΚΑΙ γεωγραφικής τοποθεσίας.
    geoLocation: GeoLocationInput
    afm: str

# Τι περιμένουμε να μας στείλει στο /auth/login
class UserLogin(BaseModel):
    username: str
    password: str

# ---------------------------------------------------------
# 2. SCHEMAS ΕΞΟΔΟΥ (Τι απαντάει το Backend στο Frontend)
# ---------------------------------------------------------

# Πώς δείχνουμε έναν Χρήστη προς τα έξω (SOS: ΠΟΤΕ το password εδώ!)
# Τα validation_alias αντιστοιχίζουν τα snake_case attributes του SQLAlchemy
# model (user_id, first_name...) στα camelCase πεδία του API contract.
class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int = Field(validation_alias="user_id")
    username: str = Field(validation_alias="user_name")
    firstName: str = Field(validation_alias="first_name")
    lastName: str = Field(validation_alias="last_name")
    # str και ΟΧΙ EmailStr: αυτό είναι DTO ΕΞΟΔΟΥ. Το email έχει ήδη επικυρωθεί
    # στο UserCreate κατά την εγγραφή· το να ξαναελέγχεται στην έξοδο σημαίνει
    # ότι μια διεύθυνση όπως "admin@staywebapp.local" (έγκυρη για τη βάση, αλλά
    # reserved TLD για το email-validator) ρίχνει το login με 500.
    email: str
    phone: str
    address: str
    # Η βάση επιτρέπει NULL σε city/country (users.city / users.country είναι
    # nullable) και ο seeded admin δεν τα έχει. Χωρίς Optional → 500 στο login.
    city: Optional[str] = None
    country: Optional[str] = None
    afm: str
    status: str
    role: str
    createdAt: datetime = Field(validation_alias="created")

    # Πηγαία πεδία για το geoLocation. exclude=True ώστε να ΜΗΝ εμφανίζονται
    # ξεχωριστά στο JSON — υπάρχουν μόνο για να τα διαβάσει το computed_field
    # από το SQLAlchemy μοντέλο (users.latitude / users.longitude).
    latitude: Optional[Decimal] = Field(None, exclude=True)
    longitude: Optional[Decimal] = Field(None, exclude=True)

    # Το contract (§1) θέλει { "lat": ..., "lng": ... } φωλιασμένο.
    @computed_field
    @property
    def geoLocation(self) -> Optional[GeoLocation]:
        if self.latitude is None or self.longitude is None:
            return None
        return GeoLocation(lat=float(self.latitude), lng=float(self.longitude))

    # Το §0 απαιτεί ISO-8601 UTC με "Z". Χωρίς αυτό το login επέστρεφε
    # "2026-09-04T14:11:55" και το new Date() του frontend το διάβαζε ως
    # ΤΟΠΙΚΗ ώρα — δηλαδή λάθος ώρα εγγραφής ανάλογα με τη ζώνη του browser.
    @field_serializer("createdAt")
    def serialize_created_at(self, value: datetime) -> str:
        return to_utc_z(value)

# Τι απαντάμε όταν κάνει επιτυχημένο Login
class Token(BaseModel):
    token: str
    user: UserResponse

# ---------------------------------------------------------
# 3. SCHEMAS ΚΡΑΤΗΣΕΩΝ (API_CONTRACT.md §2.4)
# ---------------------------------------------------------

# Σύντομη μορφή χρήστη — μπαίνει μέσα σε άλλα DTOs (attendee, organizer).
class UserMini(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(validation_alias="user_id")
    username: str = Field(validation_alias="user_name")

# Τι μας στέλνει το frontend στο POST /api/bookings.
# ΠΡΟΣΟΧΗ: δεν δεχόμαστε totalCost — το υπολογίζει ο server (§2.4).
class BookingCreate(BaseModel):
    eventId: int
    ticketTypeId: int
    numberOfTickets: int = Field(ge=1)

# Το Booking DTO όπως το περιμένει ο Γιώργος.
class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    eventId: int
    eventTitle: str
    # Στοιχεία της εκδήλωσης για τη λίστα «Οι κρατήσεις μου» (v1.3): πότε
    # γίνεται, αν ακυρώθηκε, και η πρώτη φωτογραφία της (ή null).
    eventStartDateTime: datetime
    eventStatus: str
    eventCover: Optional[str] = None
    attendee: UserMini
    ticketTypeId: int
    ticketTypeName: str
    numberOfTickets: int
    totalCost: Decimal
    status: str
    time: datetime

    # Το contract θέλει τα χρήματα ως string με 2 δεκαδικά ("36.00"),
    # ώστε να μη χαθεί ακρίβεια σε float στο JavaScript.
    @field_serializer("totalCost")
    def serialize_total_cost(self, value: Decimal) -> str:
        return f"{value:.2f}"

    @field_serializer("time", "eventStartDateTime")
    def serialize_time(self, value: datetime) -> str:
        return to_utc_z(value)

    # Χτίζει το DTO από το SQLAlchemy μοντέλο. Το κρατάμε εδώ (και όχι στο router)
    # γιατί το ίδιο DTO το χρειάζονται και τα GET /bookings/mine
    # και GET /events/{id}/bookings.
    @classmethod
    def from_booking(cls, booking) -> "BookingResponse":
        return cls(
            id=booking.booking_id,
            eventId=booking.events_id,
            eventTitle=booking.event.title,
            eventStartDateTime=booking.event.start_date_time,
            eventStatus=booking.event.status,
            eventCover=booking.event.media[0].filename if booking.event.media else None,
            attendee=UserMini.model_validate(booking.attendee),
            ticketTypeId=booking.ticket_types_id,
            ticketTypeName=booking.ticket_type.name,
            numberOfTickets=booking.number_of_tickets,
            totalCost=booking.total_cost,
            status=booking.status,
            time=booking.booking_time,
        )

# ---------------------------------------------------------
# 4. SCHEMAS ΕΚΔΗΛΩΣΕΩΝ (API_CONTRACT.md §1 "Event" + §2.3)
# ---------------------------------------------------------

# Η MySQL κρατά naive datetimes. Το frontend στέλνει "2026-07-12T20:30:00Z"
# (tz-aware), οπότε το μετατρέπουμε σε UTC και πετάμε το tzinfo πριν το INSERT.
def to_naive_utc(value: datetime) -> datetime:
    if value.tzinfo is not None:
        value = value.astimezone(timezone.utc).replace(tzinfo=None)
    return value


# --- TicketType ------------------------------------------------------------

# Τι στέλνει το frontend μέσα στο POST/PUT /api/events.
# ΔΕΝ δέχεται "available": το ορίζει ο server (= quantity στη δημιουργία).
class TicketTypeCreate(BaseModel):
    name: str = Field(min_length=1, max_length=45)
    price: Decimal = Field(ge=0)          # δέχεται και "18.00" (string) και 18.00
    quantity: int = Field(ge=1)


class TicketTypeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int = Field(validation_alias="ticket_types_id")
    name: str
    price: Decimal
    quantity: int
    available: int

    # Χρήματα ως string με 2 δεκαδικά — ίδιος κανόνας με το totalCost (§0).
    @field_serializer("price")
    def serialize_price(self, value: Decimal) -> str:
        return f"{value:.2f}"


# --- Event -----------------------------------------------------------------

# Τι στέλνει το frontend στο POST /api/events (§2.3).
# ΔΕΝ δέχεται status/available/reservedTotal — τα ορίζει ο server.
class EventCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    # ΤΟΥΛΑΧΙΣΤΟΝ μία κατηγορία: το DTD της εκφώνησης (§7α) ορίζει "Category+",
    # οπότε εκδήλωση χωρίς κατηγορία κάνει ΟΛΟΚΛΗΡΟ το XML export invalid.
    categories: list[str] = Field(min_length=1)
    eventType: str = Field(min_length=1, max_length=45)
    venue: str = Field(min_length=1, max_length=45)
    address: str = Field(min_length=1, max_length=150)
    city: str = Field(min_length=1, max_length=45)
    country: str = Field(min_length=1, max_length=45)
    geoLocation: Optional[GeoLocationInput] = None
    startDateTime: datetime
    endDateTime: datetime
    capacity: int = Field(ge=1)
    ticketTypes: list[TicketTypeCreate] = Field(min_length=1)
    description: Optional[str] = None
    # Οι φωτογραφίες ΑΝΕΒΑΙΝΟΥΝ μόνο από το POST /api/events/{id}/media. Εδώ η
    # λίστα λειτουργεί μόνο αφαιρετικά στο PUT: ό,τι λείπει σβήνεται, ενώ ονόματα
    # που δεν ανήκουν ήδη στην εκδήλωση αγνοούνται. Στο POST αγνοείται.
    media: list[str] = Field(default_factory=list)

    # Ο έλεγχος Σ(quantity) ≤ capacity ΔΕΝ γίνεται εδώ: το contract τον θέλει ως
    # 409 CAPACITY_EXCEEDED, ενώ ό,τι αποτύχει σε αυτό το σχήμα βγαίνει 400
    # VALIDATION_ERROR. Άρα ζει στο router.
    @model_validator(mode="after")
    def check_dates(self):
        if self.endDateTime <= self.startDateTime:
            raise ValueError("Η ώρα λήξης πρέπει να είναι μετά την ώρα έναρξης.")
        return self

    @model_validator(mode="after")
    def check_unique_ticket_names(self):
        # Το PUT /api/events/{id} ταυτοποιεί τους υπάρχοντες τύπους εισιτηρίων
        # με βάση το `name` (το body δεν στέλνει ids). Δύο τύποι με το ίδιο
        # όνομα θα ήταν αδύνατο να αντιστοιχιστούν, οπότε τους απαγορεύουμε.
        names = [t.name.strip() for t in self.ticketTypes]
        if len(names) != len(set(names)):
            raise ValueError("Οι τύποι εισιτηρίων πρέπει να έχουν διαφορετικά ονόματα.")
        return self


# Το πλήρες Event DTO όπως το περιμένει ο Γιώργος (§1).
class EventResponse(BaseModel):
    id: int
    title: str
    categories: list[str]
    eventType: str
    venue: str
    address: str
    city: str
    country: str
    geoLocation: Optional[GeoLocation]
    startDateTime: datetime
    endDateTime: datetime
    capacity: int
    ticketTypes: list[TicketTypeResponse]
    organizer: UserMini
    status: str
    description: Optional[str]
    media: list[str]
    reservedTotal: int
    isDeletable: bool
    createdAt: datetime

    @field_serializer("startDateTime", "endDateTime", "createdAt")
    def serialize_dt(self, value: datetime) -> str:
        return to_utc_z(value)

    # Ίδιο μοτίβο με το BookingResponse.from_booking: το DTO χτίζεται εδώ γιατί
    # το χρειάζονται GET /events, GET /events/{id}, /mine, publish, cancel.
    @classmethod
    def from_event(cls, event) -> "EventResponse":
        geo = None
        if event.latitude is not None and event.longitude is not None:
            geo = GeoLocation(lat=float(event.latitude), lng=float(event.longitude))

        # Δεσμευμένες θέσεις = Σ(quantity − available). Ίδιος υπολογισμός με
        # τον έλεγχο χωρητικότητας στο POST /api/bookings.
        reserved_total = sum(t.quantity - t.available for t in event.ticket_types)

        return cls(
            id=event.events_id,
            title=event.title,
            # Το contract θέλει σκέτα strings, όχι αντικείμενα κατηγορίας.
            categories=[c.category_name for c in event.categories],
            eventType=event.event_type,
            venue=event.venue,
            address=event.address,
            city=event.city,
            country=event.country,
            geoLocation=geo,
            startDateTime=event.start_date_time,
            endDateTime=event.end_date_time,
            capacity=event.capacity,
            ticketTypes=[TicketTypeResponse.model_validate(t) for t in event.ticket_types],
            organizer=UserMini.model_validate(event.organizer),
            status=event.status,
            description=event.description,
            media=[m.filename for m in event.media],
            reservedTotal=reserved_total,
            # Ο κανόνας της εκφώνησης §7γ ζει στο models.Event.is_deletable — ο ίδιος
            # που ελέγχει και το DELETE, ώστε κουμπί και server να συμφωνούν πάντα.
            isDeletable=event.is_deletable,
            createdAt=event.created,
        )


# ---------------------------------------------------------
# 5. SCHEMAS ΜΗΝΥΜΑΤΩΝ (API_CONTRACT.md §1 "Message" + §2.5)
# ---------------------------------------------------------

# Προαιρετικό body του POST /api/events/{id}/cancel (§2.3).
class EventCancel(BaseModel):
    note: Optional[str] = None


# Τι στέλνει το frontend στο POST /api/messages (§2.5).
# Ο αποστολέας ΔΕΝ δηλώνεται στο body — προκύπτει από το JWT.
class MessageCreate(BaseModel):
    toUserId: int
    # Υποχρεωτικό: η στήλη messages.fk_event_id είναι NOT NULL, και το §10
    # δένει κάθε συνομιλία με τη συγκεκριμένη εκδήλωση.
    eventId: int
    subject: str = Field(min_length=1, max_length=150)
    body: str = Field(min_length=1)


# Body του PUT /api/admin/users/{id}/status.
class UserStatusUpdate(BaseModel):
    status: Literal["PENDING", "APPROVED", "REJECTED"]


# Απάντηση του GET /api/messages/unread-count — για το badge στο μενού.
class UnreadCount(BaseModel):
    count: int


class MessageResponse(BaseModel):
    """Το Message DTO του συμβολαίου.

    ΠΡΟΣΟΧΗ στα ονόματα: το συμβόλαιο θέλει ένθετα αντικείμενα `fromUser`/`toUser`
    (id + username), όχι σκέτα senderId/receiverId — ο Γιώργος δείχνει το
    username στο inbox χωρίς δεύτερο request. Το κείμενο είναι επίσης δύο πεδία,
    `subject` και `body`, όπως οι δύο NOT NULL στήλες της βάσης.
    """
    id: int
    fromUser: UserMini
    toUser: UserMini
    eventId: int
    subject: str
    body: str
    read: bool
    sentAt: datetime

    @field_serializer("sentAt")
    def serialize_sent_at(self, value: datetime) -> str:
        return to_utc_z(value)

    @classmethod
    def from_message(cls, message) -> "MessageResponse":
        return cls(
            id=message.message_id,
            fromUser=UserMini.model_validate(message.sender),
            toUser=UserMini.model_validate(message.receiver),
            eventId=message.fk_event_id,
            subject=message.subject,
            body=message.body,
            read=message.is_read,
            sentAt=message.sent_at,
        )


# ---------------------------------------------------------
# 6. SCHEMAS ΣΥΣΤΑΣΕΩΝ (API_CONTRACT.md §2.6 / εκφώνηση §13)
# ---------------------------------------------------------

class RecommendationsPage(Page[EventResponse]):
    """Σελίδα προτάσεων.

    Κληρονομεί ΟΛΑ τα πεδία του Page (items/page/pageSize/total/totalPages) και
    προσθέτει το `strategy` που ορίζει το §2.6 — ώστε ο Γιώργος να δείχνει
    «Προτεινόμενα για εσένα» ή «Δημοφιλή» ανάλογα με το αν υπάρχει ιστορικό.
    """
    strategy: Literal["matrix_factorization", "cold_start_visits"]
