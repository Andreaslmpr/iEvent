from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Numeric, Table
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base

# Ενδιάμεσος πίνακας (Pivot) για Events <-> Categories
event_has_categories = Table(
    'event_has_categories',
    Base.metadata,
    Column('event_id', Integer, ForeignKey('events.events_id', ondelete="CASCADE"), primary_key=True),
    Column('category_id', Integer, ForeignKey('event_categories.event-categories_id', ondelete="CASCADE"), primary_key=True)
)

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, index=True)
    user_name = Column(String(45), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    first_name = Column(String(45), nullable=False)
    last_name = Column(String(45), nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    phone = Column(String(20), nullable=False)
    address = Column(String(150), nullable=False)
    longitude = Column(Numeric(11, 8), nullable=True)
    latitude = Column(Numeric(10, 8), nullable=True)
    afm = Column(String(15), nullable=False)
    status = Column(String(20), default="PENDING", nullable=False)
    created = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    role = Column(String(20), default="USER", nullable=False)
    city = Column(String(45), nullable=True)
    country = Column(String(45), nullable=True)

    # Σχέσεις (Relationships)
    events = relationship("Event", back_populates="organizer")
    bookings = relationship("Booking", back_populates="attendee")
    visits = relationship("EventVisit", back_populates="user")
    messages_sent = relationship("Message", foreign_keys='Message.from_user_id', back_populates="sender")
    messages_received = relationship("Message", foreign_keys='Message.to_user_id', back_populates="receiver")

class Event(Base):
    __tablename__ = "events"

    events_id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    event_type = Column(String(45), nullable=False)
    venue = Column(String(45), nullable=False)
    address = Column(String(150), nullable=False)
    city = Column(String(45), nullable=False)
    country = Column(String(45), nullable=False)
    latitude = Column(Numeric(10, 8), nullable=True)
    longitude = Column(Numeric(11, 8), nullable=True)
    start_date_time = Column(DateTime, nullable=False)
    end_date_time = Column(DateTime, nullable=False)
    capacity = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)
    description = Column(Text, nullable=True)
    created = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    organizer_id = Column(Integer, ForeignKey("users.user_id"), nullable=False)

    # Σχέσεις (Relationships)
    organizer = relationship("User", back_populates="events")
    ticket_types = relationship("TicketType", back_populates="event", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="event", cascade="all, delete-orphan")
    media = relationship("EventMedia", back_populates="event", cascade="all, delete-orphan")
    visits = relationship("EventVisit", back_populates="event", cascade="all, delete-orphan")
    categories = relationship("EventCategory", secondary=event_has_categories, back_populates="events")

class EventCategory(Base):
    __tablename__ = "event_categories"

    # Το όνομα της στήλης στη βάση είναι event-categories_id (με παύλα)
    id = Column("event-categories_id", Integer, primary_key=True, index=True)
    # UNIQUE: η κατηγορία "Music" υπάρχει ΜΙΑ φορά και τη μοιράζονται όλες οι
    # εκδηλώσεις μέσω του event_has_categories (βλ. db/migrations/001_*.sql).
    category_name = Column(String(45), unique=True, nullable=False)

    events = relationship("Event", secondary=event_has_categories, back_populates="categories")

class EventMedia(Base):
    __tablename__ = "event_media"

    event_media_id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    fk_media_event = Column(Integer, ForeignKey("events.events_id", ondelete="CASCADE"), nullable=False)

    event = relationship("Event", back_populates="media")

class TicketType(Base):
    __tablename__ = "ticket_types"

    ticket_types_id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.events_id", ondelete="CASCADE"), nullable=False)
    name = Column(String(45), nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    available = Column(Integer, nullable=False)

    event = relationship("Event", back_populates="ticket_types")
    bookings = relationship("Booking", back_populates="ticket_type")

class Booking(Base):
    __tablename__ = "bookings"

    booking_id = Column(Integer, primary_key=True, index=True)
    number_of_tickets = Column(Integer, nullable=False)
    total_cost = Column(Numeric(10, 2), nullable=False)
    status = Column(String(20), default="CONFIRMED", nullable=False)
    booking_time = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    attendee_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    events_id = Column(Integer, ForeignKey("events.events_id", ondelete="CASCADE"), nullable=False)
    ticket_types_id = Column(Integer, ForeignKey("ticket_types.ticket_types_id", ondelete="CASCADE"), nullable=False)

    attendee = relationship("User", back_populates="bookings")
    event = relationship("Event", back_populates="bookings")
    ticket_type = relationship("TicketType", back_populates="bookings")

class EventVisit(Base):
    __tablename__ = "event_visits"

    event_visits_id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    event_id = Column(Integer, ForeignKey("events.events_id", ondelete="CASCADE"), nullable=False)
    visited = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User", back_populates="visits")
    event = relationship("Event", back_populates="visits")

class Message(Base):
    __tablename__ = "messages"
    
    message_id = Column(Integer, primary_key=True, index=True)
    subject = Column(String(150), nullable=False)
    body = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False, nullable=False)
    sent_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    from_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    to_user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    fk_event_id = Column(Integer, ForeignKey("events.events_id", ondelete="CASCADE"), nullable=False)

    sender = relationship("User", foreign_keys=[from_user_id], back_populates="messages_sent")
    receiver = relationship("User", foreign_keys=[to_user_id], back_populates="messages_received")