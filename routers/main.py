from fastapi import FastAPI
from database import engine
import models

# Κάνουμε import το αρχείο auth.py από τον φάκελο routers
from routers import auth

# Δημιουργία των πινάκων στη βάση (αν δεν υπάρχουν)
models.Base.metadata.create_all(bind=engine)

# Αρχικοποίηση της εφαρμογής
app = FastAPI(title="StayApp API")

# "Κουμπώνουμε" το router του Authentication
app.include_router(auth.router)

# (Μελλοντικά θα προσθέσεις και τα υπόλοιπα με τον ίδιο τρόπο:)
# app.include_router(events.router)
# app.include_router(bookings.router)