import os
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import jwt  # Βιβλιοθήκη PyJWT
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

import models
from database import get_db

# ---------------------------------------------------------
# 1. ΡΥΘΜΙΣΕΙΣ (από το .env)
# ---------------------------------------------------------
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

# ---------------------------------------------------------
# 2. HASHING ΚΩΔΙΚΩΝ (κεντρικά εδώ, το χρησιμοποιεί και το auth.py)
# ---------------------------------------------------------
# Χρησιμοποιούμε ΑΠΕΥΘΕΙΑΣ τη βιβλιοθήκη bcrypt, χωρίς passlib.
# Το passlib 1.7.4 (τελευταία έκδοση, από το 2020) διαβάζει το
# bcrypt.__about__.__version__, το οποίο καταργήθηκε στο bcrypt 4.1+, και
# καταλήγει να σκάει με "password cannot be longer than 72 bytes" σε ΚΑΘΕ
# κλήση hash(). Το bcrypt API είναι έτσι κι αλλιώς δύο συναρτήσεις.

# Όριο του ίδιου του αλγορίθμου bcrypt: αγνοεί ό,τι περνάει τα 72 bytes.
_BCRYPT_MAX_BYTES = 72


def _to_bcrypt_bytes(password: str) -> bytes:
    """Κωδικός → bytes, κομμένος στα 72 bytes.

    Μετράμε BYTES και όχι χαρακτήρες: στην UTF-8 ένα ελληνικό γράμμα πιάνει
    2 bytes, οπότε 40 ελληνικοί χαρακτήρες ξεπερνούν ήδη το όριο. Χωρίς την
    κοπή, το bcrypt θα σήκωνε ValueError και θα έσπαγε η εγγραφή.
    Η κοπή γίνεται με τον ΙΔΙΟ τρόπο σε hash και verify, ώστε να συμφωνούν.
    """
    return password.encode("utf-8")[:_BCRYPT_MAX_BYTES]


def get_password_hash(password: str) -> str:
    """Επιστρέφει bcrypt hash (π.χ. "$2b$12$...") για αποθήκευση στη βάση.

    Το gensalt() παράγει καινούριο τυχαίο salt σε κάθε κλήση, γι' αυτό δύο
    χρήστες με τον ίδιο κωδικό έχουν διαφορετικά hashes.
    """
    return bcrypt.hashpw(_to_bcrypt_bytes(password), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Σύγκριση κωδικού με το αποθηκευμένο hash (το salt διαβάζεται από το hash)."""
    try:
        return bcrypt.checkpw(
            _to_bcrypt_bytes(plain_password),
            hashed_password.encode("utf-8"),
        )
    except ValueError:
        # Αλλοιωμένο/μη-bcrypt hash στη βάση: αποτυχία σύνδεσης, όχι 500.
        return False

# ---------------------------------------------------------
# 3. ΔΗΜΙΟΥΡΓΙΑ JWT (καλείται στο login)
# ---------------------------------------------------------
def create_access_token(user: models.User) -> str:
    # Το payload όπως το ορίζει το API_CONTRACT.md:
    # { "sub": 12, "username": "maria21", "role": "USER", "exp": ... }
    # Το "sub" πρέπει να είναι string σύμφωνα με το πρότυπο JWT.
    payload = {
        "sub": str(user.user_id),
        "username": user.user_name,
        "role": user.role,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

# ---------------------------------------------------------
# 4. DEPENDENCIES ΓΙΑ ΤΑ ENDPOINTS
# ---------------------------------------------------------
# Το HTTPBearer διαβάζει αυτόματα το header "Authorization: Bearer <token>".
# auto_error=False ώστε να μπορούμε να δώσουμε δικό μας μήνυμα σφάλματος
# (και να υποστηρίξουμε προαιρετικό login στα δημόσια endpoints).
bearer_scheme = HTTPBearer(auto_error=False)

def _credentials_exception(message: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail={"error": {"code": "UNAUTHENTICATED", "message": message}},
        headers={"WWW-Authenticate": "Bearer"},
    )

def _decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise _credentials_exception("Το token έχει λήξει. Συνδεθείτε ξανά.")
    except jwt.InvalidTokenError:
        raise _credentials_exception("Μη έγκυρο token.")

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    """Βάλε το ως Depends() σε κάθε endpoint που απαιτεί συνδεδεμένο χρήστη (USER ή ADMIN)."""
    if credentials is None:
        raise _credentials_exception("Απαιτείται σύνδεση (λείπει το JWT).")

    payload = _decode_token(credentials.credentials)
    user = db.query(models.User).filter(models.User.user_id == int(payload["sub"])).first()
    if user is None or user.status != "APPROVED":
        raise _credentials_exception("Ο χρήστης δεν υπάρχει ή δεν είναι εγκεκριμένος.")
    return user

def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[models.User]:
    """Για τα δημόσια endpoints (πλοήγηση/αναζήτηση): Επισκέπτης → None,
    συνδεδεμένος χρήστης → User (π.χ. για να καταγράψουμε visit για τις συστάσεις)."""
    if credentials is None:
        return None
    payload = _decode_token(credentials.credentials)
    return db.query(models.User).filter(models.User.user_id == int(payload["sub"])).first()

def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    """Βάλε το ως Depends() στα endpoints του διαχειριστή (ή σε ολόκληρο router)."""
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": {"code": "FORBIDDEN", "message": "Απαιτούνται δικαιώματα διαχειριστή."}},
        )
    return current_user
