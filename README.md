<div align="center">

# iEvent

**Διαχείριση εκδηλώσεων & ηλεκτρονικές κρατήσεις εισιτηρίων**<br>
**Event management & online ticket booking**

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)
![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)

[🇬🇷 Ελληνικά](#-ελληνικά) · [🇬🇧 English](#-english)

</div>

---

# 🇬🇷 Ελληνικά

**Υποχρεωτική εργασία — Τεχνολογίες Εφαρμογών Διαδικτύου**
Τμήμα Πληροφορικής & Τηλεπικοινωνιών · Διδάσκων: Δρ. Γ. Χαμόδρακας

## Περιεχόμενα

1. [Επισκόπηση](#επισκόπηση)
2. [Λειτουργίες](#λειτουργίες)
3. [Τεχνολογίες](#τεχνολογίες)
4. [Εγκατάσταση & εκτέλεση](#εγκατάσταση--εκτέλεση)
5. [Οδηγός χρήσης](#οδηγός-χρήσης)
6. [Δεδομένα επίδειξης](#δεδομένα-επίδειξης)
7. [Αλγόριθμος συστάσεων](#αλγόριθμος-συστάσεων)
8. [Δομή του έργου](#δομή-του-έργου)
9. [Ανάπτυξη χωρίς backend](#ανάπτυξη-χωρίς-backend)
10. [Σημειώσεις πλατφόρμας](#σημειώσεις-πλατφόρμας)
11. [Τεκμηρίωση](#τεκμηρίωση)
12. [Ομάδα](#ομάδα)
13. [Άδεια χρήσης](#άδεια-χρήσης)

## Επισκόπηση

Το StayApp είναι μια διαδικτυακή εφαρμογή όπου οι χρήστες δημιουργούν, αναζητούν
και κλείνουν θέσεις σε εκδηλώσεις — συναυλίες, παραστάσεις, συνέδρια, εργαστήρια.

Κάθε εγγεγραμμένος χρήστης είναι ταυτόχρονα **διοργανωτής** στις εκδηλώσεις που
δημιουργεί και **συμμετέχων** σε όσες κρατά θέση. Ο **επισκέπτης** πλοηγείται και
αναζητά χωρίς να μπορεί να κρατήσει. Ο **διαχειριστής** εγκρίνει τις αιτήσεις
εγγραφής και εξάγει τα δεδομένα.

| Ρόλος | Τι μπορεί να κάνει |
|---|---|
| **Επισκέπτης** (χωρίς σύνδεση) | Περιήγηση, αναζήτηση και προβολή εκδηλώσεων |
| **Χρήστης** (εγκεκριμένος) | Όλα τα παραπάνω + κρατήσεις, δημιουργία εκδηλώσεων, μηνύματα, προτάσεις |
| **Διαχειριστής** | Έγκριση/απόρριψη χρηστών, προβολή στοιχείων, εξαγωγή δεδομένων σε XML/JSON |

## Λειτουργίες

- 🔐 **Ασφάλεια** — εγγραφή με έγκριση διαχειριστή, JWT, κωδικοί με bcrypt, όλη η επικοινωνία πάνω από TLS
- 🎫 **Εκδηλώσεις** — τύποι εισιτηρίων με διαφορετικές τιμές, έλεγχος χωρητικότητας, φωτογραφίες, πολλαπλές κατηγορίες
- 🔎 **Αναζήτηση** — ελεύθερο κείμενο, κατηγορία, πόλη, εύρος ημερομηνιών, εύρος τιμής, ταξινόμηση· σελιδοποίηση παντού
- 🛡️ **Κρατήσεις** — ατομικές συναλλαγές με `SELECT … FOR UPDATE` που αποκλείουν την υπερκράτηση
- 🗺️ **Χάρτης** — τοποθεσία κάθε εκδήλωσης σε OpenStreetMap
- ✉️ **Μηνύματα** — επικοινωνία διοργανωτή ↔ συμμετέχοντα, μαζική ειδοποίηση σε ακύρωση, ένδειξη μη αναγνωσμένων
- 📤 **Εξαγωγή** — XML κατά το DTD της εκφώνησης και JSON
- ✨ **Συστάσεις** — Biased Matrix Factorization γραμμένο εκ του μηδενός, με ψυχρή εκκίνηση από επισκέψεις

## Τεχνολογίες

| Επίπεδο | Τεχνολογία |
|---|---|
| Frontend | React 18 · Vite 6 · React Router · axios · καθαρό CSS με design tokens |
| Backend | FastAPI · Pydantic v2 · SQLAlchemy 2 · Uvicorn |
| Βάση | MySQL 8 (utf8mb4) |
| Ασφάλεια | TLS · PyJWT · bcrypt |
| Συστάσεις | NumPy · pandas (χωρίς βιβλιοθήκες μηχανικής μάθησης) |

## Εγκατάσταση & εκτέλεση

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

# Μεταναστεύσεις — απαραίτητες, με τη σειρά
mysql -u root -p staywebapp < db/migrations/001_event_categories_many_to_many.sql
mysql -u root -p staywebapp < db/migrations/002_messages_soft_delete.sql
```

### 2. Backend

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt     # Windows: .venv/Scripts/pip
```

Δημιουργήστε αρχείο `.env` στη ρίζα (δεν ανεβαίνει στο git):

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

Ο διαχειριστής δημιουργείται **αυτόματα** στην πρώτη εκκίνηση από τα
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. Διαδραστική τεκμηρίωση του API:
`https://localhost:8000/docs`.

### 3. Frontend

```bash
npm install
npm run dev           # https://localhost:5173
```

> [!NOTE]
> Το πιστοποιητικό είναι αυτο-υπογεγραμμένο, οπότε ο browser ζητά ρητή αποδοχή
> την πρώτη φορά. Οι κλήσεις προς `/api` προωθούνται εσωτερικά από τον proxy του
> Vite στο backend, οπότε αρκεί **μία** αποδοχή — για το `:5173`.

Για production build: `npm run build` (έξοδος στο `dist/`) και `npm run preview`.

## Οδηγός χρήσης

Ανοίξτε το **https://localhost:5173**. Η αρχική σελίδα οδηγεί στην περιήγηση
εκδηλώσεων, στη σύνδεση ή στην εγγραφή.

### Ως επισκέπτης

1. Από το μενού επιλέξτε **Εκδηλώσεις**.
2. Φιλτράρετε με κείμενο, κατηγορία, πόλη, ημερομηνίες και εύρος τιμής και
   ταξινομήστε τα αποτελέσματα. Τα φίλτρα γράφονται στο URL, οπότε μια αναζήτηση
   μπορεί να μοιραστεί ως σύνδεσμος.
3. Ανοίξτε μια εκδήλωση για να δείτε περιγραφή, φωτογραφίες, τύπους εισιτηρίων,
   διαθεσιμότητα και τον χάρτη της τοποθεσίας.
4. Για να κλείσετε θέση απαιτείται σύνδεση.

### Εγγραφή & σύνδεση

1. **Εγγραφή** — συμπληρώστε στοιχεία λογαριασμού, επικοινωνίας, διεύθυνση και ΑΦΜ.
2. Ο λογαριασμός μένει **σε αναμονή** μέχρι να τον εγκρίνει ο διαχειριστής·
   στο μεταξύ η σύνδεση οδηγεί στη σελίδα αναμονής.
3. Μετά την έγκριση συνδέεστε κανονικά. Αν η αίτηση απορριφθεί, η σύνδεση δεν
   επιτρέπεται.

### Ως συμμετέχων — κράτηση θέσεων

1. Στη σελίδα της εκδήλωσης επιλέξτε **τύπο εισιτηρίου** και **πλήθος**· το
   κόστος υπολογίζεται αμέσως.
2. Επιβεβαιώστε στο παράθυρο που εμφανίζεται. Η κράτηση είναι **οριστική** και
   δεν ακυρώνεται.
3. Κρατήσεις γίνονται μόνο σε **δημοσιευμένες** εκδηλώσεις που **δεν έχουν
   ξεκινήσει** και μόνο εφόσον υπάρχουν διαθέσιμες θέσεις.
4. Όλες οι κρατήσεις σας βρίσκονται στις **Κρατήσεις μου**, απ' όπου μπορείτε
   να στείλετε μήνυμα στον διοργανωτή.
5. Στη σελίδα εκδηλώσεων εμφανίζονται **προτεινόμενες εκδηλώσεις** με βάση το
   ιστορικό κρατήσεων και επισκέψεών σας.

### Ως διοργανωτής — οι εκδηλώσεις μου

1. **Οι εκδηλώσεις μου → Νέα εκδήλωση**: τίτλος, κατηγορίες, περιγραφή, χώρος,
   διεύθυνση, συντεταγμένες, ημερομηνίες, χωρητικότητα, τύποι εισιτηρίων και
   φωτογραφίες. Η εκδήλωση αποθηκεύεται ως **πρόχειρη**.
2. Ο κύκλος ζωής μιας εκδήλωσης:

   | Κατάσταση | Διαθέσιμες ενέργειες |
   |---|---|
   | **Πρόχειρη** | επεξεργασία · δημοσίευση · διαγραφή |
   | **Δημοσιευμένη** | επεξεργασία · ακύρωση · προβολή κρατήσεων · διαγραφή *μόνο* πριν από την πρώτη κράτηση |
   | **Ακυρωμένη** | μόνο προβολή — τα δεδομένα διατηρούνται |

3. Με την **ακύρωση**, κάθε συμμετέχων λαμβάνει αυτόματα μήνυμα ειδοποίησης.
4. Η σελίδα **Κρατήσεις** μιας εκδήλωσης δείχνει ποιος έκλεισε θέσεις, πόσες και
   τι τύπου, και επιτρέπει αποστολή μηνύματος σε κάθε συμμετέχοντα.

### Μηνύματα

- **Εισερχόμενα / Απεσταλμένα**, με σελιδοποίηση· το πλήθος των μη αναγνωσμένων
  φαίνεται στο μενού και ανανεώνεται περίπου κάθε 30 δευτερόλεπτα.
- Η επικοινωνία επιτρέπεται μεταξύ διοργανωτή και συμμετέχοντα **αφού υπάρχει
  κράτηση** στη συγκεκριμένη εκδήλωση.
- Η διαγραφή αφορά μόνο τη **δική σας** όψη — ο συνομιλητής συνεχίζει να βλέπει
  το μήνυμα.

### Ως διαχειριστής

1. Συνδεθείτε με τα `ADMIN_USERNAME` / `ADMIN_PASSWORD` του `.env`.
2. Στο **Διαχείριση** βλέπετε όλους τους χρήστες, φιλτράρετε ανά κατάσταση και
   **εγκρίνετε** ή **απορρίπτετε** αιτήσεις εγγραφής.
3. Ανοίξτε έναν χρήστη για να δείτε όλα τα στοιχεία του.
4. **Εξαγωγή** όλων των εκδηλώσεων (κάθε κατάστασης) σε **XML** — έγκυρο ως προς
   το `db/events.dtd` — ή σε **JSON**.

## Δεδομένα επίδειξης

Μια νέα βάση είναι άδεια. Για να φαίνεται κάθε λειτουργία, τρέξτε από τη ρίζα
(με τη MySQL σε λειτουργία):

```bash
.venv/bin/python -m db.seed_demo            # γεμίζει τη βάση
.venv/bin/python -m db.seed_demo --reset    # σβήνει ΜΟΝΟ τα δεδομένα επίδειξης και τα ξαναφτιάχνει
```

Δημιουργούνται 8 χρήστες, 12 εκδηλώσεις σε 5 πόλεις με φωτογραφίες, κρατήσεις,
επισκέψεις και μηνύματα. Ο διαχειριστής και οι υπόλοιποι χρήστες **δεν**
αγγίζονται. Οι ημερομηνίες είναι σχετικές με τη στιγμή εκτέλεσης — πριν από μια
παρουσίαση τρέξτε ξανά με `--reset`, ώστε οι εκδηλώσεις να είναι μελλοντικές.

Κωδικός για όλους: **`demo1234`**

| username | κατάσταση | τι δείχνει |
|---|---|---|
| `nikos_org` | εγκεκριμένος | διοργανωτής· έχει πρόχειρη, ακυρωμένη, εκδήλωση που έχει ξεκινήσει και δημοσιευμένη χωρίς κρατήσεις (διαγράφεται) |
| `eleni_org` | εγκεκριμένη | διοργανώτρια στη Θεσσαλονίκη |
| `maria` | εγκεκριμένη | κρατήσεις σε μουσική → προτάσεις· μη αναγνωσμένο μήνυμα |
| `kostas` | εγκεκριμένος | μουσική και τεχνολογία |
| `giannis` | εγκεκριμένος | θέατρο· μήνυμα ακύρωσης στα εισερχόμενα |
| `sofia` | εγκεκριμένη | μόνο επισκέψεις → ψυχρή εκκίνηση συστάσεων |
| `alexis` | **σε αναμονή** | για επίδειξη της έγκρισης από τον διαχειριστή |
| `dimitra` | **απορρίφθηκε** | δεν μπορεί να συνδεθεί |

## Αλγόριθμος συστάσεων

Οι προτάσεις παράγονται από **Biased Matrix Factorization** με SGD, γραμμένο εκ
του μηδενός σε NumPy (`services/recommender.py`). Όταν ο χρήστης δεν έχει
ιστορικό κρατήσεων, χρησιμοποιούνται οι επισκέψεις του σε σελίδες εκδηλώσεων
(ψυχρή εκκίνηση).

Το dataset αξιολόγησης του e-class (εκφώνηση §13) **δεν** βρίσκεται στο repo —
είναι 1,5 GB. Τοποθετήστε το ως `dataset/rel_event_csvs/` και τρέξτε:

```bash
.venv/bin/python -m services.evaluate_recommender     # Windows: .venv/Scripts/python
```

Το script εκπαιδεύει τον **ίδιο** κώδικα που χρησιμοποιεί η εφαρμογή στο
`event_interest.csv` με διαχωρισμό 80/20, τον συγκρίνει με απλούστερα μοντέλα
αναφοράς και μετρά πόσο ψηλά κατατάσσει μια εκδήλωση που ενδιέφερε τον χρήστη
ανάμεσα σε 99 που δεν έχει δει. Με τις προεπιλογές της εφαρμογής, στις 10 πρώτες
μπαίνει στο **36%** των περιπτώσεων (τυχαία κατάταξη: ~9%).

Πλήρη αποτελέσματα: `docs/recommender_evaluation.md` · ερμηνεία: κεφάλαιο 7.5 της
αναφοράς.

## Δομή του έργου

```
├── main.py                 Εκκίνηση FastAPI, CORS, exception handlers
├── database.py             Σύνδεση & session
├── models.py               SQLAlchemy ORM — 9 πίνακες
├── schemas.py              Pydantic DTOs (είσοδος + έξοδος)
├── security.py             JWT, bcrypt, έλεγχος ρόλων
├── routers/                28 endpoints σε 6 ενότητες
│   ├── auth.py             εγγραφή · είσοδος
│   ├── admin.py            χρήστες · έγκριση/απόρριψη · εξαγωγή XML/JSON
│   ├── events.py           CRUD · αναζήτηση · δημοσίευση/ακύρωση · κρατήσεις · φωτογραφίες
│   ├── bookings.py         δημιουργία κράτησης · οι κρατήσεις μου
│   ├── messages.py         εισερχόμενα/απεσταλμένα · μη αναγνωσμένα · διαγραφή
│   └── recommendations.py  προτάσεις εκδηλώσεων
├── services/
│   ├── recommender.py      Biased Matrix Factorization (SGD, εκ του μηδενός)
│   ├── evaluate_recommender.py  αξιολόγηση του αλγορίθμου
│   └── media.py            αποθήκευση & έλεγχος φωτογραφιών
├── db/
│   ├── events.dtd          Το DTD της εκφώνησης
│   ├── staywebapp_*.sql    Σχήμα βάσης
│   ├── migrations/         001 κατηγορίες N:M · 002 soft delete μηνυμάτων
│   └── seed_demo.py        Δεδομένα επίδειξης
│
├── src/                    Frontend (React)
│   ├── api/                API facade — μόνο από εδώ γίνονται κλήσεις
│   ├── auth/token.js       Αποθήκευση JWT
│   ├── context/            AuthContext
│   ├── routes/             ProtectedRoute (περιορισμός ανά ρόλο)
│   ├── components/         events/ · ui/ · form/ · layout/ · auth/
│   ├── pages/              μία σελίδα ανά διαδρομή
│   ├── hooks/              useForm · useUnreadCount
│   ├── utils/              μορφοποίηση · επικύρωση · λήψη αρχείων
│   └── styles/             theme.css (design tokens) · components · global
│
├── docs/                   Τεχνική αναφορά (HTML/PDF) · αξιολόγηση συστάσεων
└── API_CONTRACT.md         Το συμβόλαιο backend ↔ frontend
```

Εκτός git: `media/` (ανεβασμένες φωτογραφίες), `dataset/`, `certs/`, `.env`.

### Διαδρομές του frontend

| Διαδρομή | Πρόσβαση | Σελίδα |
|---|---|---|
| `/` | όλοι | Αρχική |
| `/events` · `/events/:id` | όλοι | Αναζήτηση · σελίδα εκδήλωσης |
| `/login` · `/register` · `/pending` | όλοι | Σύνδεση · εγγραφή · αναμονή έγκρισης |
| `/bookings` | χρήστης | Οι κρατήσεις μου |
| `/dashboard` | χρήστης | Οι εκδηλώσεις μου |
| `/dashboard/events/new` · `…/:id/edit` · `…/:id/bookings` | χρήστης (ιδιοκτήτης) | Δημιουργία · επεξεργασία · κρατήσεις εκδήλωσης |
| `/messages` | χρήστης | Μηνύματα |
| `/admin` · `/admin/users/:id` | διαχειριστής | Χρήστες · στοιχεία χρήστη |

## Ανάπτυξη χωρίς backend

Το frontend αναπτύχθηκε **mock-first**: κάθε συνάρτηση του API facade έχει μια
διαδρομή με εικονικά δεδομένα και μία με πραγματικές κλήσεις. Για δουλειά χωρίς
server, δημιουργήστε `.env.local` (βλ. `.env.example`):

```ini
VITE_USE_MOCK=true
```

| username | password | ρόλος |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `maria21` | `maria123` | USER · APPROVED |
| `org_athens_events` | `nikos123` | USER · διοργανωτής |
| `giannis_p` | `giannis123` | USER · APPROVED |
| `pending_user` | `elena123` | USER · PENDING |

Χωρίς τη μεταβλητή, η προεπιλογή είναι το **πραγματικό API**.

## Σημειώσεις πλατφόρμας

Τα σενάρια εκκίνησης δουλεύουν σε Linux, macOS και Windows (Git Bash):

- Σε Windows το virtualenv βάζει τα εκτελέσιμα στο `Scripts/` αντί για `bin/` —
  το `run.sh` ανιχνεύει ποιο υπάρχει.
- Η κονσόλα των Windows (cp1252) δεν τυπώνει ελληνικά· το `run.sh` ορίζει
  `PYTHONIOENCODING=utf-8`.
- Το Git Bash μετατρέπει το `-subj "/C=GR/…"` του OpenSSL σε διαδρομή· το
  `make-certs.sh` ορίζει `MSYS_NO_PATHCONV=1`.

> [!WARNING]
> Το `run.sh` τρέχει με `--reload`, που παρακολουθεί ολόκληρο τον φάκελο μαζί με
> το `.venv`. Μετά από `pip install` χρειάζεται χειροκίνητη επανεκκίνηση.

## Τεκμηρίωση

| Αρχείο | Περιεχόμενο |
|---|---|
| [`API_CONTRACT.md`](API_CONTRACT.md) | Endpoints, DTOs και κωδικοί σφάλματος — γράφτηκε **πριν** από τον κώδικα |
| [`docs/report.pdf`](docs/report.pdf) | Τεχνική αναφορά: αρχιτεκτονική, σχεδίαση βάσης, αλγόριθμος, παραδοχές |
| [`docs/recommender_evaluation.md`](docs/recommender_evaluation.md) | Αποτελέσματα αξιολόγησης των συστάσεων |
| `https://localhost:8000/docs` | Διαδραστική τεκμηρίωση του API (Swagger) |

## Ομάδα

| Μέλος | Αρμοδιότητα |
|---|---|
| **Γεώργιος Πατσάκας** (sdi2200144) | Frontend (React), διεπαφή χρήστη, κατανάλωση του REST API, σύνταξη του συμβολαίου |
| **Ανδρέας Λαμπρόπουλος** (sdi2200252) | Backend (FastAPI), σχεσιακή βάση & ORM, αλγόριθμος συστάσεων, εξαγωγή XML/JSON |

Η ανάπτυξη έγινε παράλληλα και στα δύο άκρα, με το `API_CONTRACT.md` ως
συμφωνημένο σημείο συνάντησης.

## Άδεια χρήσης

Διανέμεται με την άδεια **Apache License 2.0** — δείτε το αρχείο [`LICENSE`](LICENSE).

<p align="right"><a href="#stayapp">↑ Επιστροφή στην αρχή</a></p>

---

# 🇬🇧 English

**Mandatory assignment — Web Application Technologies, 6th semester 2026**
Department of Informatics & Telecommunications · Instructor: Dr. G. Chamodrakas

## Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Installation & running](#installation--running)
5. [User guide](#user-guide)
6. [Demo data](#demo-data)
7. [Recommendation algorithm](#recommendation-algorithm)
8. [Project structure](#project-structure)
9. [Developing without the backend](#developing-without-the-backend)
10. [Platform notes](#platform-notes)
11. [Documentation](#documentation)
12. [Team](#team)
13. [License](#license)

## Overview

StayApp is a web application where users create, discover and book seats at
events — concerts, performances, conferences, workshops.

Every registered user is at once an **organizer** of the events they create and
an **attendee** of the events they book. A **guest** can browse and search but
cannot book. The **administrator** approves sign-up requests and exports the data.

| Role | Capabilities |
|---|---|
| **Guest** (not signed in) | Browse, search and view events |
| **User** (approved) | All of the above + bookings, event creation, messaging, recommendations |
| **Administrator** | Approve/reject users, view user details, export data as XML/JSON |

## Features

- 🔐 **Security** — sign-up with admin approval, JWT, bcrypt-hashed passwords, all traffic over TLS
- 🎫 **Events** — ticket types with different prices, capacity control, photos, multiple categories
- 🔎 **Search** — free text, category, city, date range, price range, sorting; pagination everywhere
- 🛡️ **Bookings** — atomic transactions with `SELECT … FOR UPDATE` that rule out overbooking
- 🗺️ **Map** — each event's location on OpenStreetMap
- ✉️ **Messaging** — organizer ↔ attendee conversations, bulk notification on cancellation, unread badge
- 📤 **Export** — XML valid against the assignment's DTD, and JSON
- ✨ **Recommendations** — Biased Matrix Factorization written from scratch, with a visit-based cold start

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 · Vite 6 · React Router · axios · plain CSS with design tokens |
| Backend | FastAPI · Pydantic v2 · SQLAlchemy 2 · Uvicorn |
| Database | MySQL 8 (utf8mb4) |
| Security | TLS · PyJWT · bcrypt |
| Recommendations | NumPy · pandas (no machine-learning libraries) |

## Installation & running

### Prerequisites

Python 3.11+ · Node.js 18+ · MySQL 8 · OpenSSL

### 1. Database

```bash
mysql -u root -p -e "CREATE DATABASE staywebapp \
  CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci"

# Schema — in this order (foreign-key dependencies)
for t in users events event_categories ticket_types bookings \
         messages event_media event_visits routines; do
  mysql -u root -p staywebapp < db/staywebapp_$t.sql
done

# Migrations — required, in order
mysql -u root -p staywebapp < db/migrations/001_event_categories_many_to_many.sql
mysql -u root -p staywebapp < db/migrations/002_messages_soft_delete.sql
```

### 2. Backend

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt     # Windows: .venv/Scripts/pip
```

Create a `.env` file in the project root (it is git-ignored):

```ini
DATABASE_URL=mysql+pymysql://root:<password>@127.0.0.1:3306/staywebapp?charset=utf8mb4
JWT_SECRET_KEY=<long random string>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
ADMIN_USERNAME=admin
ADMIN_PASSWORD=<admin password>
```

```bash
bash make-certs.sh    # self-signed certificate — once
bash run.sh           # https://localhost:8000
```

The administrator account is created **automatically** on first start from
`ADMIN_USERNAME` / `ADMIN_PASSWORD`. Interactive API docs:
`https://localhost:8000/docs`.

### 3. Frontend

```bash
npm install
npm run dev           # https://localhost:5173
```

> [!NOTE]
> The certificate is self-signed, so the browser asks you to accept it the first
> time. Calls to `/api` are forwarded to the backend by Vite's proxy, so a
> **single** acceptance — for `:5173` — is enough.

Production build: `npm run build` (output in `dist/`), then `npm run preview`.

## User guide

Open **https://localhost:5173**. The landing page leads to event browsing,
sign-in or sign-up.

### As a guest

1. Choose **Events** from the menu.
2. Filter by text, category, city, dates and price range, and sort the results.
   Filters are stored in the URL, so a search can be shared as a link.
3. Open an event to see its description, photos, ticket types, availability and
   a map of the venue.
4. Booking requires signing in.

### Sign-up & sign-in

1. **Register** — fill in account and contact details, address and tax ID (ΑΦΜ).
2. The account stays **pending** until an administrator approves it; meanwhile,
   signing in leads to the pending page.
3. Once approved, you sign in normally. Rejected accounts cannot sign in.

### As an attendee — booking seats

1. On an event page choose a **ticket type** and **quantity**; the total cost is
   shown immediately.
2. Confirm in the dialog. Bookings are **final** and cannot be cancelled.
3. Bookings are only possible for **published** events that **have not started**
   and only while seats remain.
4. All your bookings live under **My bookings**, from where you can message the
   organizer.
5. The events page shows **recommended events** based on your booking and
   browsing history.

### As an organizer — my events

1. **My events → New event**: title, categories, description, venue, address,
   coordinates, dates, capacity, ticket types and photos. The event is saved as
   a **draft**.
2. Event lifecycle:

   | Status | Available actions |
   |---|---|
   | **Draft** | edit · publish · delete |
   | **Published** | edit · cancel · view bookings · delete *only* before the first booking |
   | **Cancelled** | view only — data is kept |

3. On **cancellation**, every attendee automatically receives a notification message.
4. An event's **Bookings** page shows who booked, how many seats and of which
   type, and lets you message each attendee.

### Messaging

- **Inbox / Sent**, paginated; the unread count is shown in the menu and
  refreshes roughly every 30 seconds.
- Organizers and attendees can message each other **once a booking exists** for
  that event.
- Deleting a message only hides **your** copy — the other party still sees it.

### As the administrator

1. Sign in with `ADMIN_USERNAME` / `ADMIN_PASSWORD` from `.env`.
2. Under **Admin** you see all users, filter by status, and **approve** or
   **reject** sign-up requests.
3. Open a user to see their full details.
4. **Export** all events (any status) as **XML** — valid against
   `db/events.dtd` — or as **JSON**.

## Demo data

A fresh database is empty. To showcase every feature, run from the project root
(with MySQL running):

```bash
.venv/bin/python -m db.seed_demo            # populate the database
.venv/bin/python -m db.seed_demo --reset    # delete ONLY the demo data and recreate it
```

This creates 8 users and 12 events across 5 cities, with photos, bookings, visits
and messages. The administrator and other users are **not** touched. Dates are
relative to the moment of execution — re-run with `--reset` before a
presentation so the events lie in the future.

Password for everyone: **`demo1234`**

| username | status | demonstrates |
|---|---|---|
| `nikos_org` | approved | organizer with a draft, a cancelled, an already-started, and a published event without bookings (deletable) |
| `eleni_org` | approved | organizer in Thessaloniki |
| `maria` | approved | music bookings → recommendations; an unread message |
| `kostas` | approved | music and technology |
| `giannis` | approved | theatre; a cancellation notice in the inbox |
| `sofia` | approved | visits only → recommendation cold start |
| `alexis` | **pending** | to demonstrate admin approval |
| `dimitra` | **rejected** | cannot sign in |

## Recommendation algorithm

Recommendations come from **Biased Matrix Factorization** trained with SGD,
written from scratch in NumPy (`services/recommender.py`). When a user has no
booking history, their event-page visits are used instead (cold start).

The e-class evaluation dataset (assignment §13) is **not** in the repository —
it is 1.5 GB. Place it at `dataset/rel_event_csvs/` and run:

```bash
.venv/bin/python -m services.evaluate_recommender     # Windows: .venv/Scripts/python
```

The script trains the **same** code the application uses on
`event_interest.csv` with an 80/20 split, compares it with simpler baselines,
and measures how highly it ranks an event the user was interested in among 99
unseen ones. With the application's defaults it lands in the top 10 in **36%**
of cases (random ranking: ~9%).

Full results: `docs/recommender_evaluation.md` · discussion: chapter 7.5 of the
report.

## Project structure

```
├── main.py                 FastAPI startup, CORS, exception handlers
├── database.py             Connection & session
├── models.py               SQLAlchemy ORM — 9 tables
├── schemas.py              Pydantic DTOs (input + output)
├── security.py             JWT, bcrypt, role checks
├── routers/                28 endpoints in 6 modules
│   ├── auth.py             register · login
│   ├── admin.py            users · approve/reject · XML/JSON export
│   ├── events.py           CRUD · search · publish/cancel · bookings · photos
│   ├── bookings.py         create booking · my bookings
│   ├── messages.py         inbox/sent · unread count · delete
│   └── recommendations.py  event recommendations
├── services/
│   ├── recommender.py      Biased Matrix Factorization (SGD, from scratch)
│   ├── evaluate_recommender.py  algorithm evaluation
│   └── media.py            photo storage & validation
├── db/
│   ├── events.dtd          The assignment's DTD
│   ├── staywebapp_*.sql    Database schema
│   ├── migrations/         001 N:M categories · 002 message soft delete
│   └── seed_demo.py        Demo data
│
├── src/                    Frontend (React)
│   ├── api/                API facade — the only place that makes HTTP calls
│   ├── auth/token.js       JWT storage
│   ├── context/            AuthContext
│   ├── routes/             ProtectedRoute (per-role access)
│   ├── components/         events/ · ui/ · form/ · layout/ · auth/
│   ├── pages/              one page per route
│   ├── hooks/              useForm · useUnreadCount
│   ├── utils/              formatting · validation · file download
│   └── styles/             theme.css (design tokens) · components · global
│
├── docs/                   Technical report (HTML/PDF) · recommender evaluation
└── API_CONTRACT.md         Backend ↔ frontend contract
```

Not in git: `media/` (uploaded photos), `dataset/`, `certs/`, `.env`.

### Frontend routes

| Route | Access | Page |
|---|---|---|
| `/` | everyone | Home |
| `/events` · `/events/:id` | everyone | Search · event page |
| `/login` · `/register` · `/pending` | everyone | Sign-in · sign-up · awaiting approval |
| `/bookings` | user | My bookings |
| `/dashboard` | user | My events |
| `/dashboard/events/new` · `…/:id/edit` · `…/:id/bookings` | user (owner) | Create · edit · event bookings |
| `/messages` | user | Messages |
| `/admin` · `/admin/users/:id` | administrator | Users · user details |

## Developing without the backend

The frontend was built **mock-first**: every API facade function has one path
with in-memory data and one with real calls. To work without a server, create
`.env.local` (see `.env.example`):

```ini
VITE_USE_MOCK=true
```

| username | password | role |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `maria21` | `maria123` | USER · APPROVED |
| `org_athens_events` | `nikos123` | USER · organizer |
| `giannis_p` | `giannis123` | USER · APPROVED |
| `pending_user` | `elena123` | USER · PENDING |

Without the variable, the default is the **real API**.

## Platform notes

The start-up scripts work on Linux, macOS and Windows (Git Bash):

- On Windows the virtualenv puts executables in `Scripts/` instead of `bin/` —
  `run.sh` detects which one exists.
- The Windows console (cp1252) cannot print Greek; `run.sh` sets
  `PYTHONIOENCODING=utf-8`.
- Git Bash rewrites OpenSSL's `-subj "/C=GR/…"` argument into a path;
  `make-certs.sh` sets `MSYS_NO_PATHCONV=1`.

> [!WARNING]
> `run.sh` runs with `--reload`, which watches the whole folder including
> `.venv`. After a `pip install`, restart the server manually.

## Documentation

| File | Contents |
|---|---|
| [`API_CONTRACT.md`](API_CONTRACT.md) | Endpoints, DTOs and error codes — written **before** the code |
| [`docs/report.pdf`](docs/report.pdf) | Technical report: architecture, database design, algorithm, assumptions (Greek) |
| [`docs/recommender_evaluation.md`](docs/recommender_evaluation.md) | Recommender evaluation results |
| `https://localhost:8000/docs` | Interactive API documentation (Swagger) |

## Team

| Member | Responsibility |
|---|---|
| **Georgios Patsakas** (sdi2200144) | Frontend (React), user interface, REST API consumption, contract authoring |
| **Andreas Lampropoulos** (sdi2200252) | Backend (FastAPI), relational database & ORM, recommendation algorithm, XML/JSON export |

Both ends were developed in parallel, with `API_CONTRACT.md` as the agreed
meeting point.

## License

Distributed under the **Apache License 2.0** — see [`LICENSE`](LICENSE).

<p align="right"><a href="#stayapp">↑ Back to top</a></p>
