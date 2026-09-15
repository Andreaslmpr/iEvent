import os
from contextlib import asynccontextmanager

# ΠΡΩΤΑ ΑΠ' ΟΛΑ: φορτώνουμε το .env.
# Τα database.py και security.py διαβάζουν os.getenv() ΣΤΟ IMPORT TIME
# (DATABASE_URL, JWT_SECRET_KEY, ...). Αν το load_dotenv() έτρεχε μετά τα
# imports τους, θα έπαιρναν None και το JWT θα υπογραφόταν με κενό κλειδί.
from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from database import engine, SessionLocal
import models
from security import get_password_hash
from services.media import MEDIA_DIR

# Κάνουμε import τα routers από τον φάκελο routers
from routers import auth, admin, events, bookings, messages, recommendations

# Δημιουργία των πινάκων στη βάση (αν δεν υπάρχουν)
models.Base.metadata.create_all(bind=engine)


def seed_admin():
    """Εκφώνηση §3: ενσωματωμένος διαχειριστής από την εγκατάσταση.
    Δημιουργείται μία φορά, με credentials από το .env."""
    db = SessionLocal()
    try:
        if db.query(models.User).filter(models.User.role == "ADMIN").first():
            return
        admin_user = models.User(
            user_name=os.getenv("ADMIN_USERNAME", "admin"),
            password=get_password_hash(os.getenv("ADMIN_PASSWORD", "admin")),
            first_name="Application",
            last_name="Administrator",
            email="admin@staywebapp.gr",
            phone="0000000000",
            address="-",
            afm="000000000",
            status="APPROVED",  # Ο admin δεν περνάει από έγκριση
            role="ADMIN",
        )
        db.add(admin_user)
        db.commit()
        print("Seed: δημιουργήθηκε ο χρήστης-διαχειριστής.")
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    seed_admin()  # Τρέχει μία φορά στο ξεκίνημα του server
    yield


# Αρχικοποίηση της εφαρμογής
app = FastAPI(title="StayApp API", lifespan=lifespan)

# CORS: επιτρέπουμε στο React dev server να μιλάει με το API (API_CONTRACT.md )
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------------------------------------------------
# EXCEPTION HANDLERS — τυποποιημένη μορφή σφάλματος (API_CONTRACT.md §0)
# ---------------------------------------------------------
# Το συμβόλαιο απαιτεί ΚΑΘΕ σφάλμα να βγαίνει ως:
#     { "error": { "code": "...", "message": "..." } }
# Από μόνο του το FastAPI τυλίγει ό,τι βάλουμε στο `detail` και στέλνει
#     { "detail": { "error": {...} } }  ← λάθος για τον Γιώργο.
# Οι δύο handlers παρακάτω ξετυλίγουν το `detail` και κανονικοποιούν τα πάντα.

# Αντιστοίχιση HTTP status → code, για σφάλματα που δεν έφτιαξε ο δικός μας
# κώδικας (π.χ. το 404 του Starlette σε άγνωστο path, το 405, το HTTPBearer).
_DEFAULT_ERROR_CODES = {
    400: "VALIDATION_ERROR",
    401: "UNAUTHENTICATED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    500: "INTERNAL_ERROR",
}


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Ξετυλίγει το {"detail": ...} και επιβάλλει το σχήμα του συμβολαίου."""
    detail = exc.detail

    if isinstance(detail, dict) and "error" in detail:
        # Το έφτιαξε ήδη σωστά ο δικός μας κώδικας (_error() στα routers,
        # _credentials_exception() στο security.py) — το περνάμε ως έχει.
        payload = detail
    else:
        # Σφάλμα από το ίδιο το framework: το `detail` είναι σκέτο string.
        payload = {
            "error": {
                "code": _DEFAULT_ERROR_CODES.get(exc.status_code, "ERROR"),
                "message": detail if isinstance(detail, str) else "Παρουσιάστηκε σφάλμα.",
            }
        }

    # Κρατάμε τα headers του exception — χρειάζεται για το WWW-Authenticate
    # που βάζει το security.py στα 401.
    return JSONResponse(
        status_code=exc.status_code,
        content=payload,
        headers=getattr(exc, "headers", None),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Pydantic 422 → 400 VALIDATION_ERROR με `details` ανά πεδίο (§0).

    Το συμβόλαιο ορίζει 400 (όχι 422) και ζητά χάρτη πεδίο → μήνυμα, ώστε ο
    Γιώργος να δείχνει το σφάλμα κάτω από το σωστό input της φόρμας.
    """
    details: dict[str, str] = {}
    for err in exc.errors():
        # Το loc είναι π.χ. ("body", "ticketTypes", 0, "quantity"). Πετάμε το
        # πρώτο στοιχείο (πηγή) και κρατάμε τη διαδρομή του πεδίου.
        path = [str(part) for part in err["loc"] if part not in ("body", "query", "path", "header", "cookie")]
        field = ".".join(path) if path else "body"

        message = err["msg"]
        # Τα μηνύματα από @model_validator έρχονται με πρόθεμα "Value error, ".
        prefix = "Value error, "
        if message.startswith(prefix):
            message = message[len(prefix):]

        # Πρώτο σφάλμα ανά πεδίο — αρκεί για την εμφάνιση στη φόρμα.
        details.setdefault(field, message)

    return JSONResponse(
        status_code=400,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Τα δεδομένα που στάλθηκαν δεν είναι έγκυρα.",
                "details": details,
            }
        },
    )


# "Κουμπώνουμε" τα routers
app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(events.router)
app.include_router(bookings.router)
app.include_router(messages.router)
app.include_router(recommendations.router)

# Φωτογραφίες εκδηλώσεων (εκφώνηση §7α): {Base}/media/{filename}, όπως ορίζει το
# API_CONTRACT.md §1. Δημόσιες, αφού και ο επισκέπτης βλέπει τη σελίδα εκδήλωσης.
app.mount("/api/media", StaticFiles(directory=MEDIA_DIR), name="media")
