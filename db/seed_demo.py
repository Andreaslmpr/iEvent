"""Δεδομένα επίδειξης για την παρουσίαση της εφαρμογής.

Εκτέλεση από τη ρίζα του έργου:
    .venv/bin/python -m db.seed_demo            # γεμίζει τη βάση (αν δεν υπάρχουν ήδη)
    .venv/bin/python -m db.seed_demo --reset    # σβήνει ΜΟΝΟ τα δεδομένα επίδειξης και τα ξαναφτιάχνει

Κάθε εκδήλωση, χρήστης, κράτηση και μήνυμα υπάρχει για να φαίνεται μια
συγκεκριμένη απαίτηση της εκφώνησης: έγκριση χρηστών (§4), διαγραφή πριν από
την πρώτη κράτηση (§7γ), ακύρωση με ενημέρωση (§10), κρατήσεις μόνο σε ενεργή
εκδήλωση (§9), αναζήτηση με φίλτρα (§8), συστάσεις και ψυχρή εκκίνηση (§13).

Γιατί όχι το dataset του e-class: δεν έχει τίτλους, χώρους ή τύπους εισιτηρίων,
οι ημερομηνίες του είναι γύρω στο 2012 και οι χρήστες του δεν έχουν ονόματα,
email ή ΑΦΜ. Χρησιμοποιείται εκεί που προορίζεται — στην αξιολόγηση του
αλγορίθμου (services/evaluate_recommender.py).

Οι ημερομηνίες υπολογίζονται ΣΧΕΤΙΚΑ με τη στιγμή εκτέλεσης, ώστε οι εκδηλώσεις
να είναι πάντα μελλοντικές. Πριν από την παρουσίαση τρέξε ξανά με --reset.

Τον διαχειριστή και όποιον άλλο χρήστη δεν ανήκει στη λίστα DEMO_USERS το script
δεν τους αγγίζει.
"""

import argparse
import struct
import sys
import zlib
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

# Επιτρέπει και την εκτέλεση ως `python db/seed_demo.py`.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from sqlalchemy import or_  # noqa: E402

import models  # noqa: E402
from database import SessionLocal  # noqa: E402  (φορτώνει και το .env)
from security import get_password_hash  # noqa: E402
from services import media  # noqa: E402

DEMO_PASSWORD = "demo1234"

# Όλες οι ώρες στη βάση είναι naive UTC. Στρογγυλεύουμε στην ώρα για καθαρές τιμές.
NOW = datetime.now(timezone.utc).replace(tzinfo=None, minute=0, second=0, microsecond=0)


def at(days: int, utc_hour: int) -> datetime:
    """Ημερομηνία σε `days` μέρες από σήμερα, σε συγκεκριμένη ώρα UTC
    (UTC+3 το καλοκαίρι: 17:00 UTC = 20:00 ώρα Ελλάδας)."""
    return (NOW + timedelta(days=days)).replace(hour=utc_hour)


# ---------------------------------------------------------------------------
# Χρήστες
# ---------------------------------------------------------------------------
USERS = [
    # key, username, όνομα, επώνυμο, πόλη, διεύθυνση, lat, lng, status, τι δείχνει
    ("nikos", "nikos_org", "Νίκος", "Παπαδάκης", "Αθήνα", "Πανεπιστημίου 30", 37.9838, 23.7275,
     "APPROVED", "διοργανωτής στην Αθήνα· έχει πρόχειρη, ακυρωμένη και εκδήλωση που διαγράφεται"),
    ("eleni", "eleni_org", "Ελένη", "Γεωργίου", "Θεσσαλονίκη", "Τσιμισκή 45", 40.6401, 22.9444,
     "APPROVED", "διοργανώτρια στη Θεσσαλονίκη"),
    ("maria", "maria", "Μαρία", "Κωνσταντίνου", "Αθήνα", "Ακαδημίας 12", 37.9755, 23.7348,
     "APPROVED", "συμμετέχουσα, κρατήσεις σε μουσική → συστάσεις και μηνύματα"),
    ("kostas", "kostas", "Κώστας", "Δημητρίου", "Αθήνα", "Πειραιώς 100", 37.9616, 23.7090,
     "APPROVED", "συμμετέχων, μουσική και τεχνολογία"),
    ("giannis", "giannis", "Γιάννης", "Αντωνίου", "Θεσσαλονίκη", "Εγνατίας 150", 40.6264, 22.9484,
     "APPROVED", "συμμετέχων, θέατρο· έλαβε μήνυμα ακύρωσης"),
    ("sofia", "sofia", "Σοφία", "Νικολάου", "Πάτρα", "Μαιζώνος 20", 38.2466, 21.7346,
     "APPROVED", "μόνο επισκέψεις, καμία κράτηση → ψυχρή εκκίνηση συστάσεων"),
    ("alexis", "alexis", "Αλέξης", "Ιωάννου", "Ηράκλειο", "25ης Αυγούστου 8", 35.3387, 25.1442,
     "PENDING", "αίτηση σε αναμονή → έγκριση από τον διαχειριστή"),
    ("dimitra", "dimitra", "Δήμητρα", "Σταύρου", "Λάρισα", "Κύπρου 5", 39.6390, 22.4191,
     "REJECTED", "απορρίφθηκε → δεν μπορεί να συνδεθεί"),
]
DEMO_USERS = [u[1] for u in USERS]

# ---------------------------------------------------------------------------
# Εκδηλώσεις
# ---------------------------------------------------------------------------
# Χρώματα των εικόνων εξωφύλλου ανά πρώτη κατηγορία (πάνω → κάτω).
PALETTE = {
    "Music": ((72, 52, 212), (214, 51, 132)),
    "Theatre": ((120, 20, 40), (240, 160, 60)),
    "Technology": ((10, 60, 110), (40, 180, 200)),
    "Sports": ((20, 110, 60), (190, 220, 80)),
    "Art": ((60, 60, 70), (230, 200, 150)),
}

EVENTS = [
    dict(key="concert", organizer="nikos", title="Συναυλία Σύγχρονης Μουσικής", event_type="Συναυλία",
         categories=["Music"], venue="Μέγαρο Μουσικής Αθηνών", address="Βασ. Σοφίας & Κόκκαλη 1",
         city="Αθήνα", lat=37.9754, lng=23.7502, start=at(14, 17), end=at(14, 20), capacity=350,
         status="PUBLISHED", photos=2,
         tickets=[("Γενική είσοδος", "18.00", 250), ("Φοιτητικό", "12.00", 100)],
         description="Βραδιά με έργα σύγχρονων Ελλήνων συνθετών, σε πρώτη εκτέλεση από τη Συμφωνική "
                     "Ορχήστρα Νέων και καλεσμένους σολίστ."),
    dict(key="jazz", organizer="nikos", title="Jazz Night στην Τεχνόπολη", event_type="Συναυλία",
         categories=["Music"], venue="Τεχνόπολη Δήμου Αθηναίων", address="Πειραιώς 100",
         city="Αθήνα", lat=37.9786, lng=23.7133, start=at(21, 18), end=at(21, 21), capacity=200,
         status="PUBLISHED", photos=1,
         tickets=[("Γενική είσοδος", "25.00", 200)],
         description="Τρία σχήματα της ελληνικής jazz σκηνής σε μια υπαίθρια βραδιά στον χώρο του "
                     "παλιού Γκαζιού."),
    dict(key="electro", organizer="eleni", title="Φεστιβάλ Ηλεκτρονικής Μουσικής", event_type="Φεστιβάλ",
         categories=["Music"], venue="Βελλίδειο Συνεδριακό Κέντρο", address="Εγνατίας 154",
         city="Θεσσαλονίκη", lat=40.6282, lng=22.9530, start=at(35, 19), end=at(36, 1), capacity=800,
         status="PUBLISHED", photos=1,
         tickets=[("Γενική είσοδος", "30.00", 700), ("VIP", "60.00", 100)],
         description="Έξι ώρες ηλεκτρονικής μουσικής με DJs από την Ελλάδα και το εξωτερικό, σε δύο σκηνές."),
    dict(key="rebetiko", organizer="eleni", title="Ρεμπέτικη Βραδιά στα Λαδάδικα", event_type="Συναυλία",
         categories=["Music", "Food"], venue="Μουσική Σκηνή Λαδάδικα", address="Κατούνη 12",
         city="Θεσσαλονίκη", lat=40.6365, lng=22.9380, start=at(10, 18), end=at(10, 21), capacity=120,
         status="PUBLISHED", photos=1,
         tickets=[("Είσοδος με ποτό", "15.00", 120)],
         description="Ρεμπέτικα και λαϊκά τραγούδια με ζωντανή κομπανία, μεζέδες και κρασί."),
    dict(key="hamlet", organizer="nikos", title="Άμλετ", event_type="Θεατρική παράσταση",
         categories=["Theatre"], venue="Εθνικό Θέατρο — Κεντρική Σκηνή", address="Αγίου Κωνσταντίνου 22",
         city="Αθήνα", lat=37.9846, lng=23.7266, start=at(18, 17), end=at(18, 20), capacity=400,
         status="PUBLISHED", photos=1,
         tickets=[("Πλατεία", "22.00", 300), ("Εξώστης", "15.00", 100)],
         description="Η τραγωδία του Σαίξπηρ σε νέα μετάφραση και σύγχρονη σκηνοθετική ανάγνωση."),
    dict(key="comedy", organizer="eleni", title="Ο Κατά Φαντασίαν Ασθενής", event_type="Θεατρική παράσταση",
         categories=["Theatre", "Comedy"], venue="Θέατρο Αυλαίας", address="Πολυτεχνείου 45",
         city="Θεσσαλονίκη", lat=40.6400, lng=22.9344, start=at(28, 18), end=at(28, 20), capacity=250,
         status="PUBLISHED", photos=1,
         tickets=[("Γενική είσοδος", "16.00", 250)],
         description="Η κλασική κωμωδία του Μολιέρου για έναν υποχόνδριο πατέρα και τους «γιατρούς» του."),
    dict(key="ai", organizer="nikos", title="Workshop: Εισαγωγή στην Τεχνητή Νοημοσύνη", event_type="Workshop",
         categories=["Technology", "Workshop"], venue="Innovathens", address="Πειραιώς 100",
         city="Αθήνα", lat=37.9785, lng=23.7130, start=at(25, 7), end=at(25, 15), capacity=60,
         status="PUBLISHED", photos=1,
         tickets=[("Δωρεάν συμμετοχή", "0.00", 60)],
         description="Πρακτικό εργαστήριο: από τη γραμμική παλινδρόμηση στα νευρωνικά δίκτυα, με "
                     "ασκήσεις σε Python."),
    # Δημοσιευμένη ΧΩΡΙΣ κρατήσεις → εμφανίζει κουμπί «Διαγραφή» (εκφώνηση §7γ).
    dict(key="webdev", organizer="nikos", title="Ημερίδα Web Development", event_type="Ημερίδα",
         categories=["Technology"], venue="Συνεδριακό Κέντρο Πανεπιστημίου Πατρών",
         address="Πανεπιστημιούπολη Ρίου", city="Πάτρα", lat=38.2896, lng=21.7857,
         start=at(40, 7), end=at(40, 14), capacity=150, status="PUBLISHED", photos=0,
         tickets=[("Γενική είσοδος", "10.00", 150)],
         description="Ομιλίες για React, REST APIs και ασφάλεια εφαρμογών ιστού."),
    dict(key="basket", organizer="nikos", title="Αγώνας Μπάσκετ: Αθήνα – Θεσσαλονίκη", event_type="Αθλητικό γεγονός",
         categories=["Sports"], venue="ΟΑΚΑ — Κλειστό Γυμναστήριο", address="Σπύρου Λούη 37",
         city="Αθήνα", lat=38.0364, lng=23.7875, start=at(12, 17), end=at(12, 19), capacity=1000,
         status="PUBLISHED", photos=1,
         tickets=[("Κερκίδα", "20.00", 900), ("Courtside", "60.00", 100)],
         description="Αγώνας επίδειξης με τα ομαδικά ρόστερ των δύο πόλεων."),
    # Πρόχειρη: τη βλέπει μόνο η διοργανώτρια, δημοσιεύεται από το Dashboard.
    dict(key="photo", organizer="eleni", title="Έκθεση Φωτογραφίας: Η Κρήτη του Φωτός", event_type="Έκθεση",
         categories=["Art"], venue="Βασιλική Αγίου Μάρκου", address="Πλατεία Λιονταριών",
         city="Ηράκλειο", lat=35.3393, lng=25.1335, start=at(50, 8), end=at(50, 18), capacity=300,
         status="DRAFT", photos=1,
         tickets=[("Γενική είσοδος", "5.00", 300)],
         description="Ασπρόμαυρες φωτογραφίες της Κρήτης από τη δεκαετία του 1960 έως σήμερα."),
    # Ακυρωμένη με κρατήσεις: οι κρατήσεις διατηρούνται και οι συμμετέχοντες έλαβαν μήνυμα (§7γ, §10).
    dict(key="cinema", organizer="nikos", title="Θερινό Σινεμά: Κλασικές Ταινίες", event_type="Προβολή",
         categories=["Art"], venue="Θερινός Κινηματογράφος Θησείον", address="Αποστόλου Παύλου 7",
         city="Αθήνα", lat=37.9737, lng=23.7201, start=at(20, 18), end=at(20, 21), capacity=180,
         status="CANCELLED", photos=1,
         tickets=[("Γενική είσοδος", "9.00", 180)],
         cancel_note="Λόγω πρόβλεψης καταιγίδων η προβολή ακυρώνεται. Θα σας ενημερώσουμε για νέα ημερομηνία.",
         description="Προβολή αγαπημένων κλασικών ταινιών κάτω από τον αττικό ουρανό."),
    # Έχει ήδη ξεκινήσει: δεν δέχεται νέες κρατήσεις, αν και είναι δημοσιευμένη (§9).
    dict(key="reading", organizer="nikos", title="Μαραθώνιος Ανάγνωσης", event_type="Φεστιβάλ",
         categories=["Art", "Workshop"], venue="Εθνική Βιβλιοθήκη — ΚΠΙΣΝ", address="Λεωφ. Συγγρού 364",
         city="Αθήνα", lat=37.9396, lng=23.6912, start=at(-1, 7), end=at(1, 18), capacity=100,
         status="PUBLISHED", photos=0,
         tickets=[("Δωρεάν συμμετοχή", "0.00", 100)],
         description="Τριήμερος μαραθώνιος ανάγνωσης λογοτεχνίας, με εθελοντές αναγνώστες κάθε ώρα."),
]

# (χρήστης, εκδήλωση, τύπος εισιτηρίου, πλήθος, πριν από πόσες μέρες)
# Η δομή είναι σκόπιμη: η maria και ο kostas μοιράζονται μουσικές κρατήσεις, οπότε
# ο αλγόριθμος έχει κάτι να μάθει για το τι να προτείνει στον καθένα.
BOOKINGS = [
    ("maria", "concert", "Γενική είσοδος", 2, 6),
    ("maria", "jazz", "Γενική είσοδος", 2, 4),
    ("maria", "cinema", "Γενική είσοδος", 2, 9),
    ("maria", "reading", "Δωρεάν συμμετοχή", 1, 7),
    ("kostas", "concert", "Φοιτητικό", 1, 5),
    ("kostas", "electro", "Γενική είσοδος", 2, 8),
    ("kostas", "ai", "Δωρεάν συμμετοχή", 1, 3),
    ("kostas", "reading", "Δωρεάν συμμετοχή", 1, 6),
    ("giannis", "hamlet", "Πλατεία", 2, 10),
    ("giannis", "comedy", "Γενική είσοδος", 2, 4),
    ("giannis", "cinema", "Γενική είσοδος", 1, 8),
    ("nikos", "electro", "VIP", 1, 2),
    ("nikos", "rebetiko", "Είσοδος με ποτό", 2, 3),
    ("eleni", "hamlet", "Εξώστης", 2, 5),
    ("eleni", "concert", "Γενική είσοδος", 1, 7),
]

# (χρήστης, εκδήλωση, πλήθος επισκέψεων) — δεδομένα ψυχρής εκκίνησης (§13).
VISITS = [
    ("maria", "concert", 2), ("maria", "jazz", 2),
    ("kostas", "electro", 1), ("kostas", "ai", 2), ("kostas", "webdev", 1),
    ("giannis", "hamlet", 1), ("giannis", "comedy", 1),
    ("sofia", "hamlet", 2), ("sofia", "comedy", 1), ("sofia", "basket", 1),
]

# (από, προς, εκδήλωση, θέμα, κείμενο, διαβασμένο, πριν από πόσες μέρες)
# Κάθε συνομιλία είναι μεταξύ διοργανωτή και συμμετέχοντα με κράτηση (§10).
MESSAGES = [
    ("maria", "nikos", "concert", "Στάθμευση κοντά στο Μέγαρο",
     "Καλησπέρα! Υπάρχει χώρος στάθμευσης κοντά στον χώρο της συναυλίας; Ευχαριστώ.", True, 5),
    ("nikos", "maria", "concert", "Re: Στάθμευση κοντά στο Μέγαρο",
     "Γεια σας! Ναι, το υπόγειο πάρκινγκ του Μεγάρου λειτουργεί κανονικά τη βραδιά της συναυλίας.", False, 4),
    ("kostas", "eleni", "electro", "Αναβάθμιση σε VIP",
     "Έχω δύο εισιτήρια γενικής εισόδου — γίνεται αναβάθμιση σε VIP;", True, 7),
    ("eleni", "kostas", "electro", "Re: Αναβάθμιση σε VIP",
     "Καλησπέρα! Οι κρατήσεις δεν τροποποιούνται, αλλά υπάρχουν ακόμη διαθέσιμα VIP εισιτήρια.", False, 6),
]


# ---------------------------------------------------------------------------
def cover_png(top: tuple, bottom: tuple, width: int = 640, height: int = 360) -> bytes:
    """Απλή εικόνα εξωφύλλου (κάθετο ντεγκραντέ) χωρίς εξωτερικές βιβλιοθήκες.

    Ένα PNG είναι: υπογραφή + μπλοκ IHDR (διαστάσεις) + IDAT (συμπιεσμένα
    pixels) + IEND. Κάθε γραμμή pixels ξεκινά με ένα byte φίλτρου (0 = κανένα).
    """
    rows = []
    for y in range(height):
        t = y / (height - 1)
        color = bytes(round(a + (b - a) * t) for a, b in zip(top, bottom))
        rows.append(b"\x00" + color * width)

    def chunk(tag: bytes, data: bytes) -> bytes:
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    header = struct.pack(">IIBBBBB", width, height, 8, 2, 0, 0, 0)  # 8 bit, RGB
    return (b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header)
            + chunk(b"IDAT", zlib.compress(b"".join(rows), 9)) + chunk(b"IEND", b""))


def remove_demo(db) -> int:
    """Σβήνει ό,τι ανήκει στους χρήστες επίδειξης. Επιστρέφει πόσοι χρήστες σβήστηκαν."""
    ids = [u.user_id for u in db.query(models.User).filter(models.User.user_name.in_(DEMO_USERS))]
    if not ids:
        return 0

    demo_events = db.query(models.Event).filter(models.Event.organizer_id.in_(ids)).all()
    event_ids = [e.events_id for e in demo_events] or [-1]
    photo_files = [item.filename for e in demo_events for item in e.media]

    db.query(models.Message).filter(or_(
        models.Message.fk_event_id.in_(event_ids),
        models.Message.from_user_id.in_(ids),
        models.Message.to_user_id.in_(ids),
    )).delete(synchronize_session=False)

    # Αν κάποιος χρήστης επίδειξης έκανε κράτηση σε ΑΛΛΗ εκδήλωση από τη διεπαφή,
    # επιστρέφουμε τις θέσεις πριν σβηστεί η κράτηση.
    for booking in db.query(models.Booking).filter(
        models.Booking.attendee_id.in_(ids), ~models.Booking.events_id.in_(event_ids)
    ):
        booking.ticket_type.available += booking.number_of_tickets
        db.delete(booking)

    db.query(models.EventVisit).filter(models.EventVisit.user_id.in_(ids)).delete(synchronize_session=False)

    # Οι εκδηλώσεις ΠΡΙΝ από τους χρήστες: το events.organizer_id δεν έχει ON DELETE CASCADE.
    for event in demo_events:
        db.delete(event)  # cascade: τύποι εισιτηρίων, κρατήσεις, φωτογραφίες, επισκέψεις
    db.flush()

    db.query(models.User).filter(models.User.user_id.in_(ids)).delete(synchronize_session=False)
    db.commit()

    for filename in photo_files:
        media.delete_file(filename)
    return len(ids)


def seed(db) -> None:
    saved_files = []
    try:
        password = get_password_hash(DEMO_PASSWORD)  # ένα hash, ίδιος κωδικός για όλους
        users = {}
        for n, (key, username, first, last, city, address, lat, lng, status, _) in enumerate(USERS, start=1):
            users[key] = models.User(
                user_name=username, password=password, first_name=first, last_name=last,
                email=f"{username}@example.com", phone=f"+3069100000{n:02d}", address=address,
                city=city, country="Greece", latitude=lat, longitude=lng,
                afm=f"1000000{n:02d}", status=status, role="USER",
            )
            db.add(users[key])
        db.flush()

        # Κατάλογος κατηγοριών: get-or-create, όπως κάνει και το API.
        category_names = {name for e in EVENTS for name in e["categories"]}
        categories = {c.category_name: c for c in db.query(models.EventCategory)
                      .filter(models.EventCategory.category_name.in_(category_names))}
        for name in category_names - categories.keys():
            categories[name] = models.EventCategory(category_name=name)
            db.add(categories[name])

        events = {}
        for spec in EVENTS:
            event = models.Event(
                title=spec["title"], event_type=spec["event_type"], venue=spec["venue"],
                address=spec["address"], city=spec["city"], country="Greece",
                latitude=spec["lat"], longitude=spec["lng"],
                start_date_time=spec["start"], end_date_time=spec["end"],
                capacity=spec["capacity"], status=spec["status"], description=spec["description"],
                organizer_id=users[spec["organizer"]].user_id,
            )
            event.categories = [categories[name] for name in spec["categories"]]
            for name, price, quantity in spec["tickets"]:
                event.ticket_types.append(models.TicketType(
                    name=name, price=Decimal(price), quantity=quantity, available=quantity))
            top, bottom = PALETTE[spec["categories"][0]]
            for index in range(spec["photos"]):
                # Η δεύτερη φωτογραφία με αντεστραμμένα χρώματα, για να ξεχωρίζει στη συλλογή.
                colors = (top, bottom) if index % 2 == 0 else (bottom, top)
                filename = media.save_image(cover_png(*colors))
                saved_files.append(filename)
                event.media.append(models.EventMedia(filename=filename))
            db.add(event)
            events[spec["key"]] = event
        db.flush()

        for user_key, event_key, ticket_name, count, days_ago in BOOKINGS:
            event = events[event_key]
            ticket = next(t for t in event.ticket_types if t.name == ticket_name)
            assert ticket.available >= count, f"δεν επαρκούν θέσεις: {event.title} / {ticket_name}"
            ticket.available -= count
            db.add(models.Booking(
                number_of_tickets=count, total_cost=ticket.price * count, status="CONFIRMED",
                booking_time=NOW - timedelta(days=days_ago),
                attendee_id=users[user_key].user_id, events_id=event.events_id,
                ticket_types_id=ticket.ticket_types_id,
            ))

        for user_key, event_key, times in VISITS:
            for _ in range(times):
                db.add(models.EventVisit(user_id=users[user_key].user_id, event_id=events[event_key].events_id))

        for sender, receiver, event_key, subject, body, is_read, days_ago in MESSAGES:
            db.add(models.Message(
                subject=subject, body=body, is_read=is_read, sent_at=NOW - timedelta(days=days_ago),
                from_user_id=users[sender].user_id, to_user_id=users[receiver].user_id,
                fk_event_id=events[event_key].events_id,
            ))

        # Το μήνυμα ακύρωσης με την ίδια μορφή που στέλνει το POST /events/{id}/cancel.
        for spec in EVENTS:
            if spec["status"] != "CANCELLED":
                continue
            event = events[spec["key"]]
            attendees = {users[u].user_id for u, e, *_ in BOOKINGS if e == spec["key"]}
            attendees.discard(event.organizer_id)
            for attendee_id in sorted(attendees):
                db.add(models.Message(
                    subject=f"Ακύρωση εκδήλωσης: {event.title}",
                    body=f"Η εκδήλωση «{event.title}» ακυρώθηκε από τον διοργανωτή.\n\n{spec['cancel_note']}",
                    is_read=False, sent_at=NOW - timedelta(days=1),
                    from_user_id=event.organizer_id, to_user_id=attendee_id, fk_event_id=event.events_id,
                ))

        db.commit()
    except Exception:
        db.rollback()
        for filename in saved_files:
            media.delete_file(filename)
        raise


def main() -> None:
    parser = argparse.ArgumentParser(description="Δεδομένα επίδειξης iEvent")
    parser.add_argument("--reset", action="store_true",
                        help="σβήνει τα υπάρχοντα δεδομένα επίδειξης και τα ξαναφτιάχνει")
    args = parser.parse_args()

    db = SessionLocal()
    try:
        existing = db.query(models.User).filter(models.User.user_name.in_(DEMO_USERS)).count()
        if existing and not args.reset:
            print("Τα δεδομένα επίδειξης υπάρχουν ήδη. Για να ξαναφτιαχτούν: --reset")
            return
        if args.reset:
            print(f"Σβήστηκαν {remove_demo(db)} χρήστες επίδειξης και ό,τι τους ανήκε.")

        seed(db)

        published = sum(e["status"] == "PUBLISHED" for e in EVENTS)
        print(f"Δημιουργήθηκαν {len(USERS)} χρήστες, {len(EVENTS)} εκδηλώσεις ({published} δημοσιευμένες), "
              f"{len(BOOKINGS)} κρατήσεις, {sum(v[2] for v in VISITS)} επισκέψεις.\n")
        print(f"Κωδικός για όλους: {DEMO_PASSWORD}\n")
        width = max(len(u[1]) for u in USERS)
        for _, username, _, _, _, _, _, _, status, purpose in USERS:
            print(f"  {username:<{width}}  {status:<9} {purpose}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
