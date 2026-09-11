from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models
import schemas
from database import get_db
from security import create_access_token, get_password_hash, verify_password

# Ορίζουμε το router. Το prefix σημαίνει ότι όλα τα endpoints
# σε αυτό το αρχείο θα ξεκινάνε αυτόματα με "/api/auth"
router = APIRouter(
    prefix="/api/auth",
    tags=["Authentication"]
)

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


@router.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):

    user = db.query(models.User).filter(models.User.user_name == credentials.username).first()

    # Ίδιο μήνυμα είτε δεν υπάρχει το username είτε είναι λάθος ο κωδικός,
    # ώστε να μην αποκαλύπτουμε ποια usernames υπάρχουν στο σύστημα.
    if user is None or not verify_password(credentials.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": {"code": "UNAUTHENTICATED", "message": "Λάθος όνομα χρήστη ή κωδικός."}}
        )

    # Σωστά credentials αλλά η εγγραφή δεν έχει εγκριθεί ακόμα (ή απορρίφθηκε)
    if user.status != "APPROVED":
        message = (
            "Η αίτηση εγγραφής σας εκκρεμεί προς έγκριση από τον διαχειριστή."
            if user.status == "PENDING"
            else "Η αίτηση εγγραφής σας έχει απορριφθεί."
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": message}}
        )

    return schemas.Token(
        token=create_access_token(user),
        user=schemas.UserResponse.model_validate(user)
    )