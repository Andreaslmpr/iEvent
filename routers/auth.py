from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import models
import schemas
from database import get_db

# Ορίζουμε το router. Το prefix σημαίνει ότι όλα τα endpoints 
# σε αυτό το αρχείο θα ξεκινάνε αυτόματα με "/api/auth"
router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

# Εργαλείο κρυπτογράφησης
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str):
    return pwd_context.hash(password)

# Παρατήρησε ότι γράφουμε @router.post και απλά "/register" (το prefix μπαίνει αυτόματα)
@router.post("/register", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    
    if user.password != user.confirmPassword:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Οι κωδικοί δεν ταιριάζουν."}}
        )
        
    existing_user = db.query(models.User).filter(models.User.user_name == user.username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "USERNAME_TAKEN", "message": "Το username χρησιμοποιείται ήδη."}}
        )
        
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
         raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": {"code": "VALIDATION_ERROR", "message": "Το email χρησιμοποιείται ήδη."}}
        )

    lat = user.geoLocation.lat if user.geoLocation else None
    lng = user.geoLocation.lng if user.geoLocation else None

    new_user = models.User(
        user_name=user.username,
        password=get_password_hash(user.password),
        first_name=user.firstName,
        last_name=user.lastName,
        email=user.email,
        phone=user.phone,
        address=user.address,
        city=user.city,
        country=user.country,
        latitude=lat,
        longitude=lng,
        afm=user.afm,
        status="PENDING",
        role="USER" 
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user # Επειδή βάλαμε στο schemas from_attributes = True, θα το μετατρέψει αυτόματα!