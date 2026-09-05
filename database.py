import os
import sqlalchemy
import sqlalchemy.orm
from dotenv import load_dotenv

# Φορτώνουμε τις μεταβλητές από το .env (DATABASE_URL, JWT_SECRET_KEY κ.λπ.)
load_dotenv()

# Σύνδεση με τη MySQL — το URL ζει στο .env ώστε ο κωδικός να μην ανέβει στο Git
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL")

#SQLAlchemy
engine = sqlalchemy.create_engine(SQLALCHEMY_DATABASE_URL)
# Το Session που θα χρησιμοποιούμε στα endpoints για να κάνουμε queries
SessionLocal = sqlalchemy.orm.sessionmaker(autocommit=False, autoflush=False, bind=engine)
# Η βασική κλάση από την οποία κληρονομούν όλα τα μοντέλα μας
Base = sqlalchemy.orm.declarative_base()

# Συνάρτηση (Dependency) για να ανοίγουμε και να κλείνουμε τη σύνδεση σε κάθε Request
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()