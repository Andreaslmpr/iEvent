# iEvent Backend — Σημειώσεις Merge για τον Γιώργο

> Πώς διαχειρίστηκα το `API_CONTRACT.md` και τι πρέπει να προσέξεις όταν
> κουμπώσεις το React πάνω στο API. — Ανδρέας, 05/09/2026


> **Ιστορικό έγγραφο (05/09/2026).** Πολλά από τα παρακάτω έχουν πλέον αλλάξει —
> η τρέχουσα πηγή αλήθειας είναι το `API_CONTRACT.md` (v1.2, βλ. changelog):
> υπάρχει `DELETE /messages/{id}` (soft delete), `POST /events/{id}/media`, και η
> διαγραφή εκδήλωσης επιτρέπεται και σε `PUBLISHED` χωρίς κρατήσεις (εκφώνηση §7γ).

---

## 0. Ο κανόνας που ακολούθησα

**Το `API_CONTRACT.md` υπερίσχυσε πάντα.** Όπου μια οδηγία ή μια βιασύνη
οδηγούσε σε κάτι διαφορετικό από το συμβόλαιο, υλοποίησα το συμβόλαιο και
το σημείωσα. Ο λόγος είναι πρακτικός: εσύ γράφεις τον client διαβάζοντας
εκείνο το αρχείο, οπότε κάθε σιωπηλή απόκλιση θα εμφανιζόταν σε σένα ως bug.

Υπάρχουν **τρεις** περιπτώσεις όπου το API είναι *υπερσύνολο* του συμβολαίου
(προσθέτει, δεν αλλάζει) και **μία** όπου η βάση δεν επέτρεπε αυτό που έλεγε
το συμβόλαιο. Και οι τέσσερις είναι στην ενότητα 3.

---

## 1. Τι δουλεύει ήδη — 26 endpoints

| Ενότητα | Endpoints | Κατάσταση |
|---|---|---|
| §2.1 Auth | 2 | πλήρες |
| §2.2 Admin | 6 | πλήρες (+ XML/JSON export) |
| §2.3 Events | 9 | πλήρες |
| §2.4 Bookings | 2 | πλήρες |
| §2.5 Messaging | 7 | πλήρες (το `DELETE` προστέθηκε αργότερα, migration 002) |
| §2.6 Recommendations | 1 | πλήρες |

```
POST   /api/auth/register              POST   /api/events/{id}/publish
POST   /api/auth/login                 POST   /api/events/{id}/cancel
                                       GET    /api/events/{id}/bookings
GET    /api/admin/users
GET    /api/admin/users/{id}           POST   /api/bookings
POST   /api/admin/users/{id}/approve   GET    /api/bookings/mine
POST   /api/admin/users/{id}/reject
PUT    /api/admin/users/{id}/status    POST   /api/messages
GET    /api/admin/events/export        GET    /api/messages/inbox
                                       GET    /api/messages/outbox
GET    /api/events                     GET    /api/messages/unread-count
POST   /api/events                     GET    /api/messages/{id}
GET    /api/events/mine                PUT    /api/messages/{id}/read
GET    /api/events/{id}
PUT    /api/events/{id}                GET    /api/recommendations
DELETE /api/events/{id}
```

---

## 2. Οι εγκάρσιες συμβάσεις (ισχύουν παντού)

### 2.1 Μορφή σφάλματος

Το FastAPI από μόνο του τυλίγει τα πάντα σε `{"detail": ...}`. Πρόσθεσα δύο
exception handlers στο `main.py` ώστε **κάθε** σφάλμα να βγαίνει ακριβώς όπως
το ορίζει το §0:

```json
{ "error": { "code": "SEATS_UNAVAILABLE", "message": "..." } }
```

Στον axios interceptor διάβασε `error.response.data.error.code`.
Ισχύει και για τα σφάλματα του ίδιου του framework (404 σε άγνωστο path → `NOT_FOUND`,
405 → `METHOD_NOT_ALLOWED`).

### 2.2 Validation → 400, ποτέ 422

Το Pydantic βγάζει 422· ο handler το μετατρέπει σε **400 `VALIDATION_ERROR`**
με χάρτη πεδίο → μήνυμα:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...",
  "details": {
    "capacity": "Input should be greater than or equal to 1",
    "ticketTypes.0.quantity": "Input should be greater than or equal to 1"
  } } }
```

Οι διαδρομές είναι **dotted** και περιλαμβάνουν δείκτες λίστας — βολικό για να
δείξεις το σφάλμα κάτω από το σωστό input.

**Προσοχή:** σφάλματα που αφορούν *σχέση δύο πεδίων* (π.χ. «η λήξη πρέπει να
είναι μετά την έναρξη») δεν χρεώνονται σε πεδίο και έρχονται με κλειδί
`"body"`. Δείξ' τα ως form-level μήνυμα πάνω από τη φόρμα.

### 2.3 Σελιδοποίηση

Παντού `?page=1&pageSize=20`. Wrapper:

```json
{ "items": [...], "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }
```

- `page ≥ 1`, `pageSize` 1–100 (**εξαίρεση:** `/api/recommendations` → 1–50, default 10).
- Εκτός ορίων → 400 `VALIDATION_ERROR`.
- `page` πέρα από το τέλος → **200** με `items: []` (όχι 404).

### 2.4 Χρήματα και ημερομηνίες

- Χρήματα: **string με 2 δεκαδικά** — `"18.00"`, `"36.00"`. Ισχύει για
  `totalCost` και `ticketTypes[].price`. Μην κάνεις `parseFloat` για εμφάνιση.
- Ημερομηνίες JSON: **ISO-8601 UTC με `Z`** — `2026-07-12T20:30:00Z`.
  Ισχύει και για το `createdAt` του User.
- **Εξαίρεση:** το XML export γράφει ημερομηνίες **χωρίς `Z`**, γιατί έτσι τις
  δείχνει το DTD της εκφώνησης. Αφορά μόνο το export.

### 2.5 401 vs 403 — μη τα μπερδέψεις

| | Σημασία | Τι να κάνει το UI |
|---|---|---|
| **401** `UNAUTHENTICATED` | Λείπει / έληξε / είναι άκυρο το JWT | logout + redirect στο login |
| **403** `FORBIDDEN` | Έγκυρο token, λάθος ρόλος ή δεν είσαι owner | μήνυμα· **ΜΗΝ** κάνεις logout |

Αν ο interceptor κάνει logout και στα δύο, ο χρήστης θα πετάγεται έξω κάθε
φορά που πατάει κάτι που δεν του ανήκει.

### 2.6 JWT

Payload: `{ "sub": "12", "username": "maria21", "role": "USER", "exp": ... }`

Το **`sub` είναι string**, όχι αριθμός (το επιβάλλει το πρότυπο JWT). Αν το
συγκρίνεις με `user.id` (int) κάνε `parseInt` — αλλιώς το `===` θα αποτυγχάνει
σιωπηλά σε κάθε έλεγχο ιδιοκτησίας στο frontend.

---

## 3. Οι τέσσερις αποκλίσεις από το συμβόλαιο

### 3.1 `RecommendationsPage` = `Page` + `strategy` *(υπερσύνολο)*

Το §2.6 ορίζει `{items, strategy}`. Το endpoint επιστρέφει **και** τα πεδία
σελιδοποίησης:

```json
{ "items": [...], "page": 1, "pageSize": 10, "total": 6, "totalPages": 1,
  "strategy": "matrix_factorization" }
```

Ό,τι περιμένεις από το συμβόλαιο υπάρχει· απλώς υπάρχουν κι άλλα.

### 3.2 Admin: τρία endpoints αντί για δύο *(υπερσύνολο)*

Το συμβόλαιο ορίζει `POST /approve` και `POST /reject` — **υπάρχουν και τα δύο**.
Πρόσθεσα και `PUT /api/admin/users/{id}/status` με body `{"status": "APPROVED"}`,
γιατί τα δύο πρώτα δεν εκφράζουν καθαρά τη μετάβαση `REJECTED → APPROVED`.
Χρησιμοποίησε όποιο σε βολεύει.

### 3.3 `SEATS_UNAVAILABLE` σε νέο περιβάλλον *(νέα χρήση υπάρχοντος code)*

Το συμβόλαιο δεν όριζε code για «ο διοργανωτής προσπαθεί να μειώσει την
ποσότητα κάτω από τα ήδη πουλημένα εισιτήρια». Χρησιμοποίησα το υπάρχον
`SEATS_UNAVAILABLE` αντί να εφεύρω νέο. **Θέλει bump στο changelog.**

### 3.4 `eventId` υποχρεωτικό στα μηνύματα *(περιορισμός βάσης)*

Η στήλη `messages.fk_event_id` είναι `NOT NULL`. Κάθε μήνυμα ανήκει σε μια
εκδήλωση — που ταιριάζει και με το §10 (η συνομιλία γεννιέται από κράτηση).
Δεν υπάρχει «γενικό» μήνυμα χωρίς εκδήλωση.

---

## 4. ⚠️ Τα οκτώ σημεία που θα σε φάνε στο merge

### 4.1 Τρέξε πρώτα το migration

```bash
mysql -u root -p staywebapp < db/migrations/001_event_categories_many_to_many.sql
```

Οι κατηγορίες έγιναν **πολλά-προς-πολλά**. Πριν, κάθε γραμμή `event_categories`
ανήκε σε μία εκδήλωση — 50 συναυλίες σήμαιναν 50 γραμμές «Music» και το
`?category=Music` ήταν αδύνατο να δουλέψει σωστά.

Για σένα δεν αλλάζει τίποτα στο wire format: το `categories` είναι και
παραμένει **απλός πίνακας από strings** — `["Music", "Live Performance"]`.
Στο create/update στέλνεις strings· ο server κάνει get-or-create.

### 4.2 🔴 Το `PUT /events/{id}` ταιριάζει τύπους εισιτηρίων με το **ΟΝΟΜΑ**

Το body του update είναι ίδιο με του create και **δεν περιέχει ids** για τους
τύπους εισιτηρίων. Άρα η αντιστοίχιση γίνεται με το `name`:

- όνομα που υπάρχει → **ενημερώνεται** (τιμή, ποσότητα)
- όνομα που λείπει από το body → **διαγράφεται**
- νέο όνομα → **δημιουργείται**

**Συνέπεια:** μετονομασία τύπου εισιτηρίου = διαγραφή + δημιουργία. Αν ο τύπος
έχει κρατήσεις, το request αποτυγχάνει με **409 `SEATS_UNAVAILABLE`**.

Στη φόρμα επεξεργασίας: **κλείδωσε το πεδίο ονόματος** για τύπους που έχουν
`available < quantity`, ή προειδοποίησε ρητά. Αλλιώς ο διοργανωτής θα διορθώσει
ένα τυπογραφικό και θα φάει ανεξήγητο 409.

Δύο τύποι με το ίδιο όνομα → 400 `VALIDATION_ERROR`.

### 4.3 🔴 Το `GET /events/{id}` έχει **παρενέργεια**

Για συνδεδεμένο χρήστη που **δεν** είναι ο διοργανωτής, σε **PUBLISHED**
εκδήλωση, το endpoint καταγράφει `EventVisit` — τα δεδομένα cold-start του
recommender (§13).

**Μην το καλείς σε βρόχο, σε prefetch, σε polling ή σε `useEffect` χωρίς
dependency array.** Κάθε κλήση γράφει γραμμή στη βάση και δηλητηριάζει τις
συστάσεις. Μία κλήση ανά πραγματικό άνοιγμα σελίδας.

### 4.4 Οι εκδηλώσεις γεννιούνται **DRAFT**

`POST /api/events` → `status: "DRAFT"`. Δεν φαίνεται στην αναζήτηση και **δεν
δέχεται κρατήσεις**. Χρειάζεται ρητό `POST /api/events/{id}/publish`.

Αν το ξεχάσεις, κάθε `POST /api/bookings` θα γυρίζει **409 `EVENT_NOT_ACTIVE`**
και θα μοιάζει με bug του backend.

Το publish είναι **idempotent** — δεύτερο κλικ επιστρέφει 200, όχι σφάλμα.

### 4.5 DRAFT εκδήλωση άλλου → **404**, όχι 403

Σκόπιμο: το 403 θα επιβεβαίωνε ότι η εκδήλωση υπάρχει. Μη γράψεις χειρισμό που
περιμένει 403 εκεί.

### 4.6 Τα paths **δεν** έχουν τελική κάθετο

`POST /api/events` ✅ — `POST /api/events/` ❌ γυρίζει **307 redirect**, το οποίο
σπάει το CORS preflight του browser και εμφανίζεται ως ασαφές network error.
Βεβαιώσου ότι το `baseURL` του axios δεν προσθέτει κάθετο.

### 4.7 Το `POST /messages` απαιτεί **σχέση κράτησης** (§10)

Επιτρέπεται μόνο αν οι δύο πλευρές συνδέονται μέσω *αυτής* της εκδήλωσης:
ο ένας είναι ο διοργανωτής και ο άλλος έχει κράτηση. Αλλιώς **403**.

Δείξε κουμπί «Επικοινωνία» **μόνο** εκεί: στη σελίδα κράτησης (προς τον
διοργανωτή) και στη λίστα κρατήσεων της εκδήλωσης (προς κάθε συμμετέχοντα).

### 4.8 Η κράτηση είναι **μη αναστρέψιμη**

Δεν υπάρχει `DELETE /api/bookings/{id}` — ούτε θα υπάρξει (§9). Το confirmation
modal πριν το POST είναι λειτουργική απαίτηση, όχι ευγένεια.

---

## 5. Πεδία που υπολογίζει ο server — μην τα στέλνεις

| Πεδίο | Κανόνας |
|---|---|
| `ticketTypes[].available` | `quantity − δεσμευμένα`. Read-only. |
| `reservedTotal` | `Σ(quantity − available)` όλων των τύπων. |
| `isDeletable` | `true` αν μηδέν κρατήσεις **και** `status` `DRAFT` ή `PUBLISHED` (v1.2). Χρησιμοποίησέ το για να κρύβεις το κουμπί διαγραφής — ο server κάνει τον ίδιο έλεγχο και γυρίζει 409 `DELETE_NOT_ALLOWED`. |
| `totalCost` | `price × numberOfTickets`, υπολογισμένο server-side. |
| `status` (event) | `DRAFT` στο create· αλλάζει **μόνο** μέσω `/publish` και `/cancel`. Το `PUT` δεν το πειράζει. |
| `geoLocation` | `null` όταν λείπουν συντεταγμένες — **όχι** `{lat:0, lng:0}`. Μη ρίξεις pin στο `{0,0}`: είναι σημείο στον Ατλαντικό. |

**Invariant που επιβάλλεται σε create ΚΑΙ update:** `Σ(quantity) ≤ capacity`,
αλλιώς 409 `CAPACITY_EXCEEDED`.

---

## 6. `GET /api/events` — η αναζήτηση

Παράμετροι, όλες προαιρετικές και συνδυαζόμενες:

`q`, `city`, `category`, `from`, `to`, `minPrice`, `maxPrice`, `sort`, `page`, `pageSize`

- `q` — ελεύθερο κείμενο σε **τίτλο + περιγραφή**, case-insensitive. Τα `%` και
  `_` αντιμετωπίζονται ως κανονικοί χαρακτήρες.
- `city` — ακριβές ταίριασμα.
- `category` — όνομα κατηγορίας.
- `from` / `to` — όρια στο `startDateTime` (ISO).
- `minPrice` / `maxPrice` — η εκδήλωση περνάει αν έχει **έναν** τύπο εισιτηρίου
  μέσα στο εύρος. Εκδήλωση με εισιτήρια 5€ και 100€ **δεν** ταιριάζει στο
  `?minPrice=20&maxPrice=50`.
- `sort` — μόνο **`date` | `price` | `title`** (default `date`).
  `date` = συντομότερα πρώτα, `price` = φθηνότερα πρώτα, `title` = αλφαβητικά.
  Οτιδήποτε άλλο → 400. *(Δεν υπάρχει `date_asc`/`date_desc`.)*

Επιστρέφονται **μόνο** `PUBLISHED`. Τα δικά σου DRAFT/CANCELLED μέσω
`GET /api/events/mine`, που γυρίζει **όλες** τις καταστάσεις.

---

## 7. Ακύρωση εκδήλωσης — τι συμβαίνει από πίσω

`POST /api/events/{id}/cancel`, προαιρετικό body `{"note": "..."}`.

Σε **μία** συναλλαγή: `status → CANCELLED` **και** αποστολή μηνύματος σε κάθε
μοναδικό συμμετέχοντα με ενεργή κράτηση (§10).

- Οι κρατήσεις **διατηρούνται** (§7γ) — δεν διαγράφονται, το `available` δεν αλλάζει.
- Ένα μήνυμα ανά **χρήστη**, όχι ανά κράτηση.
- Αποστολέας είναι ο **διοργανωτής** — άρα το «Απάντηση» πάει στον σωστό.
- Μόνο `PUBLISHED` ακυρώνεται· αλλιώς 409 `EVENT_NOT_ACTIVE`.

Μετά την ακύρωση το `unread-count` των συμμετεχόντων ανεβαίνει. Αν κάνεις
polling ανά 30s όπως λέει το §2.5, το badge θα ενημερωθεί μόνο του.

---

## 8. Τι **δεν** υπάρχει ακόμα

| | Γιατί |
|---|---|
| `DELETE /messages/{id}` | Η ίδια γραμμή εξυπηρετεί inbox και outbox· σκέτο DELETE θα έσβηνε το μήνυμα **και από τον άλλον**. Θέλει `deleted_by_sender` / `deleted_by_receiver` + migration 002. |
| `POST /events/{id}/visit` | Το συμβόλαιο το ορίζει ως *προαιρετικό, αν δεν γίνεται implicit*. Γίνεται implicit στο `GET /events/{id}` (βλ. 4.3). |
| Media upload | Το ίδιο το συμβόλαιο το έχει **TBD**. Σήμερα το `media` είναι απλός πίνακας filenames. Χρειάζεται συμφωνία. |

---

## 9. Εκκίνηση

```bash
bash make-certs.sh    # self-signed πιστοποιητικό (μία φορά)
bash run.sh           # https://localhost:8000
```

### 🔴 Άνοιξε **μία φορά** το `https://localhost:8000/docs` στον browser

Το πιστοποιητικό είναι self-signed. Μέχρι να αποδεχτείς την εξαίρεση, **κάθε
κλήση του axios θα αποτυγχάνει σιωπηλά** χωρίς κατανοητό μήνυμα. Είναι το
πρώτο πράγμα που θα σε μπερδέψει και το τελευταίο που θα υποψιαστείς.

CORS: επιτρέπονται `http://localhost:5173` και `https://localhost:5173`.
Αν αλλάξεις θύρα, πες μου να την προσθέσω στο `main.py`.

Διαδραστικό API docs: **`https://localhost:8000/docs`** — έχει όλα τα schemas.

---

## 10. Τι θέλω από σένα

1. Επιβεβαίωσε ότι το `PUT /events/{id}` με ταίριασμα κατά όνομα σου κάνει,
   ή συμφωνούμε να στέλνεις `id` στους τύπους εισιτηρίων (θέλει αλλαγή
   συμβολαίου και στις δύο πλευρές).
2. Απόφαση για το media upload (multipart vs filenames).
3. Θες `DELETE /messages/{id}`; Αν ναι, το γράφω με το migration 002.
4. Bump στο changelog του `API_CONTRACT.md` για τα 3.1–3.4.
