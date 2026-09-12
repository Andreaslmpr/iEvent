# StayApp

Εφαρμογή διαχείρισης εκδηλώσεων και ηλεκτρονικών κρατήσεων εισιτηρίων στον
Παγκόσμιο Ιστό.

**Υποχρεωτική εργασία — Τεχνολογίες Εφαρμογών Διαδικτύου, ΣΤ΄ εξάμηνο 2026**
Τμήμα Πληροφορικής & Τηλεπικοινωνιών · Διδάσκων: Δρ. Γ. Χαμόδρακας

---

## Τι κάνει

Κάθε εγγεγραμμένος χρήστης είναι ταυτόχρονα **διοργανωτής** στις εκδηλώσεις που
δημιουργεί και **συμμετέχων** σε όσες κρατά θέση. Ο **επισκέπτης** πλοηγείται και
αναζητά χωρίς να μπορεί να κρατήσει. Ο **διαχειριστής** εγκρίνει τις αιτήσεις
εγγραφής και εξάγει τα δεδομένα.

- Εγγραφή με έγκριση διαχειριστή · JWT · όλες οι κλήσεις πάνω από TLS
- Δημιουργία εκδηλώσεων με τύπους εισιτηρίων και έλεγχο χωρητικότητας
- Αναζήτηση με 7 κριτήρια, σελιδοποίηση παντού
- Κρατήσεις με προστασία από υπερκράτηση (`SELECT … FOR UPDATE`)
- Χάρτης OpenStreetMap στη σελίδα εκδήλωσης
- Μηνύματα διοργανωτή ↔ συμμετέχοντα, με μαζική ειδοποίηση σε ακύρωση
- Εξαγωγή σε XML κατά το DTD της εκφώνησης και σε JSON
- **Συστάσεις με Biased Matrix Factorization γραμμένο εκ του μηδενός**

---

## Στοίβα

| Επίπεδο | Τεχνολογία |
|---|---|
| Μετωπιαίο άκρο | React 18 · Vite 6 · React Router 6 · axios · καθαρό CSS |
| Νωτιαίο άκρο | FastAPI · Pydantic v2 · SQLAlchemy 2 · Uvicorn |
| Βάση | MySQL 8 (utf8mb4) |
| Ασφάλεια | TLS · PyJWT · bcrypt |
| Συστάσεις | NumPy · pandas (χωρίς βιβλιοθήκες μηχανικής μάθησης) |

---

## Γρήγορη εκκίνηση

### Προαπαιτούμενα

Python 3.11+ · Node.js 18+ · MySQL 8 · OpenSSL

### 1. Βάση δεδομένων

```bash
mysql -u root -p -e "CREATE DATABASE staywebapp \
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"

# Σχήμα — με αυτή τη σειρά (υπάρχουν εξαρτήσεις ξένων κλειδιών)
for t in users events event_categories ticket_types bookings \
         messages event_media event_visits routines; do
  mysql -u root -p staywebapp < db/staywebapp_$t.sql
done

# Μεταναστεύσεις — ΑΠΑΡΑΙΤΗΤΕΣ, με τη σειρά
mysql -u root -p staywebapp < db/migrations/001_event_categories_many_to_many.sql
mysql -u root -p staywebapp < db/migrations/002_messages_soft_delete.sql
```

### 2. Νωτιαίο άκρο

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt     # Windows: .venv/Scripts/pip
```

Δημιούργησε αρχείο `.env` στη ρίζα (δεν ανεβαίνει στο git):

```ini
DATABASE_URL=mysql+pymysql://root:<κωδικός>@127.0.0.1:3306/staywebapp?charset=utf8mb4
JWT_SECRET_KEY=<τυχαία μακριά συμβολοσειρά>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<κωδικός διαχειριστή>
```

```bash
bash make-certs.sh    # αυτο-υπογεγραμμένο πιστοποιητικό — μία φορά
bash run.sh           # https://localhost:8000
```

Ο χρήστης-διαχειριστής δημιουργείται **αυτόματα** στην πρώτη εκκίνηση, από τα
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. Διαδραστική τεκμηρίωση του API:
`https://localhost:8000/docs`.

### 3. Μετωπιαίο άκρο

```bash
npm install
npm run dev           # https://localhost:5173
```

> Το πιστοποιητικό είναι αυτο-υπογεγραμμένο, οπότε ο browser ζητά ρητή αποδοχή
> την πρώτη φορά. Οι κλήσεις προς `/api` προωθούνται εσωτερικά στο νωτιαίο άκρο,
> οπότε αρκεί **μία** αποδοχή — για το `:5173`.

---

## Δομή του έργου

```
├── main.py                 Εκκίνηση FastAPI, CORS, exception handlers
├── database.py             Σύνδεση & session
├── models.py               SQLAlchemy ORM — 9 πίνακες
├── schemas.py              Pydantic DTOs (είσοδος + έξοδος)
├── security.py             JWT, bcrypt, dependencies ρόλων
├── routers/                27 endpoints σε 6 ενότητες
│   ├── auth.py             εγγραφή · είσοδος
│   ├── admin.py            χρήστες · έγκριση/απόρριψη · export XML/JSON
│   ├── events.py           CRUD · αναζήτηση · publish/cancel · κρατήσεις
│   ├── bookings.py         δημιουργία κράτησης · οι κρατήσεις μου
│   ├── messages.py         inbox/outbox · unread-count · διαγραφή
│   └── recommendations.py  GET /api/recommendations
├── services/
│   └── recommender.py      Biased Matrix Factorization (SGD, εκ του μηδενός)
│
├── db/
│   ├── events.dtd          Το DTD της εκφώνησης
│   ├── staywebapp_*.sql    Σχήμα βάσης
│   └── migrations/         001 κατηγορίες N:M · 002 soft delete μηνυμάτων
│
├── src/                    Μετωπιαίο άκρο (React)
│   ├── api/                facade — ΜΟΝΟ από εδώ γίνονται κλήσεις
│   │   ├── client.js       axios instance + JWT interceptor
│   │   └── mock/           εικονικά δεδομένα ανάπτυξης
│   ├── auth/token.js       αποθήκευση JWT (μοναδικό σημείο)
│   ├── context/            AuthContext
│   ├── routes/             ProtectedRoute (περιορισμός ανά ρόλο)
│   ├── components/         events/ · ui/ · form/ · layout/
│   ├── pages/              μία σελίδα ανά διαδρομή
│   ├── hooks/              useForm · useUnreadCount (polling ~30s)
│   ├── utils/              μορφοποίηση · επικύρωση · λήψη αρχείων
│   └── styles/             theme.css (design tokens) · components · global
│
├── docs/report.html        Τεχνική αναφορά → Ctrl+P → «Αποθήκευση ως PDF»
├── API_CONTRACT.md         Το συμβόλαιο backend ↔ frontend (v1.1)
└── CLAUDE.md               Συμβάσεις ανάπτυξης & εκκρεμότητες
```

---

## Τεκμηρίωση

| Αρχείο | Περιεχόμενο |
|---|---|
| **`API_CONTRACT.md`** | Η μοναδική πηγή αλήθειας για endpoints, DTOs και κωδικούς σφάλματος. Γράφτηκε **πριν** τον κώδικα· κάθε αλλαγή καταγράφεται στο changelog. |
| **`docs/report.html`** | Η τεχνική αναφορά της παράδοσης: αρχιτεκτονική, σχεδίαση βάσης, αλγόριθμος, παραδοχές, δυσκολίες. |
| **`CLAUDE.md`** | Συμβάσεις κώδικα και εκκρεμότητες. |
| `https://localhost:8000/docs` | Διαδραστική τεκμηρίωση με όλα τα schemas. |

---

## Ανάπτυξη χωρίς νωτιαίο άκρο

Το μετωπιαίο άκρο αναπτύχθηκε **mock-first**: κάθε συνάρτηση του API facade έχει
δύο διαδρομές, μία με εικονικά δεδομένα και μία με πραγματικές κλήσεις. Για να
δουλέψεις χωρίς server, φτιάξε `.env.local`:

```ini
VITE_USE_MOCK=true
```

Χρήστες δοκιμών σε αυτή την κατάσταση (`src/api/mock/db.js`):

| username | password | ρόλος |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `maria21` | `maria123` | USER · APPROVED |
| `org_athens_events` | `nikos123` | USER · διοργανωτής |
| `giannis_p` | `giannis123` | USER · APPROVED |
| `pending_user` | `elena123` | USER · PENDING |

> Χωρίς τη μεταβλητή, η προεπιλογή είναι το **πραγματικό API**. Στην τελική
> δέσμη τα εικονικά δεδομένα αφαιρούνται εντελώς.

---

## Σημειώσεις πλατφόρμας

Τα σενάρια εκκίνησης δουλεύουν σε Linux, macOS και Windows (Git Bash). Τρία
σημεία χρειάστηκαν ιδιαίτερο χειρισμό για τα Windows:

- Το εικονικό περιβάλλον τοποθετεί τα εκτελέσιμα σε `Scripts/` αντί για `bin/` —
  το `run.sh` ανιχνεύει ποιο υπάρχει.
- Η κονσόλα χρησιμοποιεί κωδικοποίηση cp1252 και έριχνε τον server στο πρώτο
  ελληνικό μήνυμα· το `run.sh` ορίζει ρητά `PYTHONIOENCODING=utf-8`.
- Το Git Bash μετέτρεπε το όρισμα `-subj "/C=GR/…"` του OpenSSL σε διαδρομή
  αρχείου· το `make-certs.sh` ορίζει `MSYS_NO_PATHCONV=1`.

> **Προσοχή:** το `run.sh` τρέχει με `--reload`, που παρακολουθεί ολόκληρο τον
> φάκελο μαζί με το `.venv`. Μετά από `pip install` χρειάζεται χειροκίνητη
> επανεκκίνηση.

---

## Ομάδα

| Μέλος | Αρμοδιότητα |
|---|---|
| **Γεώργιος Πατσάκας** | Μετωπιαίο άκρο (React), διεπαφή χρήστη, κατανάλωση του REST API, σύνταξη του συμβολαίου |
| **Ανδρέας** | Νωτιαίο άκρο (FastAPI), σχεσιακή βάση & ORM, αλγόριθμος συστάσεων, εξαγωγή XML/JSON |

Η ανάπτυξη έγινε παράλληλα και στα δύο άκρα, με το `API_CONTRACT.md` ως
συμφωνημένο σημείο συνάντησης.
