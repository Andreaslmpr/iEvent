import sqlalchemy
import sqlalchemy.orm

# Σύνδεση με τη MySQL (Username:Password@Host:Port/DatabaseName)
SQLALCHEMY_DATABASE_URL = "root://andreas292002!@127.0.0.1:3306/staywebapp"

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