from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

# Βοηθητικό σχήμα για τις συντεταγμένες
class GeoLocation(BaseModel):
    lat: float
    lng: float

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
    geoLocation: Optional[GeoLocation] = None
    afm: str

# Τι περιμένουμε να μας στείλει στο /auth/login
class UserLogin(BaseModel):
    username: str
    password: str

# ---------------------------------------------------------
# 2. SCHEMAS ΕΞΟΔΟΥ (Τι απαντάει το Backend στο Frontend)
# ---------------------------------------------------------

# Πώς δείχνουμε έναν Χρήστη προς τα έξω (SOS: ΠΟΤΕ το password εδώ!)
class UserResponse(BaseModel):
    id: int
    username: str
    firstName: str
    lastName: str
    email: EmailStr
    phone: str
    address: str
    city: str
    country: str
    afm: str
    status: str
    role: str
    createdAt: datetime

    # Αυτό λέει στο Pydantic να μπορεί να διαβάζει κατευθείαν από τα SQLAlchemy Models!
    class Config:
        from_attributes = True

# Τι απαντάμε όταν κάνει επιτυχημένο Login
class Token(BaseModel):
    token: str
    user: UserResponse