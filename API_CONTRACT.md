# StayApp — API Contract (v1)

> **Source of truth** για backend (Ανδρέας / Python) ↔ frontend (Γιώργος / React).
> Καμία αλλαγή χωρίς συμφωνία και των δύο. Κάθε αλλαγή → bump στο changelog στο τέλος.

---

## 0. Γενικές Συμβάσεις

- **Base URL:** `https://localhost:8000/api` (όλα μέσω SSL/TLS — απαίτηση εκφώνησης §1).
- **Format:** Όλα τα requests/responses είναι `application/json` (UTF-8). Εξαίρεση: το XML export.
- **Auth:** JWT στο header → `Authorization: Bearer <token>`.
- **Ημερομηνίες:** ISO-8601 σε UTC, π.χ. `2026-07-12T20:30:00Z`.
- **Χρήματα:** decimal ως **string** με 2 δεκαδικά (αποφυγή float σφαλμάτων), π.χ. `"18.00"`.
- **IDs:** integers (auto-increment από τη βάση). Το `EventID="EV1024"` του DTD αφορά **μόνο το XML export** — εσωτερικά χρησιμοποιούμε integer `id`.

### Ρόλοι (per-action, ΟΧΙ σταθερός ρόλος ανά χρήστη)
Ένας εγγεγραμμένος χρήστης είναι ταυτόχρονα **Διοργανωτής** (στα event που φτιάχνει) και **Συμμετέχων** (στα event που κρατάει). Το JWT κρατά:
```
role: "ADMIN" | "USER" | "GUEST"
```
- `ADMIN` → ενσωματωμένος διαχειριστής (seed).
- `USER` → εγγεγραμμένος & **APPROVED**. Δικαιώματα διοργανωτή/συμμετέχοντα ελέγχονται per-resource (ownership).
- `GUEST` → χωρίς login: μόνο read/search εκδηλώσεων.

### Τυποποιημένη μορφή σφάλματος
Όλα τα errors επιστρέφουν:
```json
{ "error": { "code": "SEATS_UNAVAILABLE", "message": "Εξαντλήθηκαν οι θέσεις." } }
```
| HTTP | code (παραδείγματα) | Πότε |
|------|---------------------|------|
| 400 | `VALIDATION_ERROR` | Λάθος/ελλιπή πεδία (βλ. `details`) |
| 401 | `UNAUTHENTICATED` | Λείπει/έληξε το JWT |
| 403 | `FORBIDDEN` | Λάθος ρόλος ή όχι owner |
| 404 | `NOT_FOUND` | Δεν υπάρχει το resource |
| 409 | `USERNAME_TAKEN`, `SEATS_UNAVAILABLE`, `CAPACITY_EXCEEDED`, `EVENT_NOT_ACTIVE`, `DELETE_NOT_ALLOWED` | Conflict κανόνα |

Το `VALIDATION_ERROR` περιλαμβάνει `details`:
```json
{ "error": { "code": "VALIDATION_ERROR", "message": "...", "details": { "email": "Μη έγκυρο email" } } }
```

### Σελιδοποίηση (παντού όπου υπάρχει λίστα)
Query params: `?page=1&pageSize=20`. Response wrapper:
```json
{ "items": [ ... ], "page": 1, "pageSize": 20, "total": 137, "totalPages": 7 }
```

---

## 1. Μοντέλα Δεδομένων (DTOs)

### User (public view — ό,τι βλέπει frontend)
```json
{
  "id": 12,
  "username": "maria21",
  "firstName": "Μαρία",
  "lastName": "Παπαδοπούλου",
  "email": "maria@example.com",
  "phone": "+302101234567",
  "address": "Λεωφ. Κεντρική 25",
  "city": "Αθήνα",
  "country": "Greece",
  "geoLocation": { "lat": 37.9838, "lng": 23.7275 },
  "afm": "123456789",
  "status": "PENDING" | "APPROVED" | "REJECTED",
  "role": "ADMIN" | "USER",
  "createdAt": "2026-06-01T10:00:00Z"
}
```
> Το `password` **ποτέ** δεν επιστρέφεται. Στο register στέλνεται plain πάνω από TLS, αποθηκεύεται hashed (bcrypt/argon2).

### Event
```json
{
  "id": 1024,
  "title": "Συναυλία Σύγχρονης Μουσικής",
  "categories": ["Music", "Live Performance"],
  "eventType": "Concert",
  "venue": "Θέατρο Πόλης",
  "address": "Λεωφόρος Κεντρική 25",
  "city": "Αθήνα",
  "country": "Greece",
  "geoLocation": { "lat": 37.9838, "lng": 23.7275 },
  "startDateTime": "2026-07-12T20:30:00Z",
  "endDateTime": "2026-07-12T23:00:00Z",
  "capacity": 350,
  "ticketTypes": [ /* TicketType[] */ ],
  "organizer": { "id": 7, "username": "org_athens_events" },
  "status": "DRAFT" | "PUBLISHED" | "COMPLETED" | "CANCELLED",
  "description": "Βραδιά με έργα σύγχρονων δημιουργών...",
  "media": ["cover1.jpg", "hall.jpg"],
  "reservedTotal": 2,
  "isDeletable": true,
  "createdAt": "2026-06-15T09:00:00Z"
}
```
- `reservedTotal` = σύνολο δεσμευμένων θέσεων (όλα τα ticket types). Υπολογίζεται server-side.
- `isDeletable` = `true` αν η εκδήλωση **δεν έχει καμία κράτηση** και είναι `DRAFT` **ή** `PUBLISHED` — εκφώνηση §7γ: «η διαγραφή επιτρέπεται μόνο πριν από τη δημοσίευση ή, το αργότερο, πριν από την υποβολή της πρώτης κράτησης». Η `CANCELLED` δεν διαγράφεται (τα δεδομένα διατηρούνται). Το frontend οδηγεί το κουμπί διαγραφής **μόνο** από αυτό το πεδίο.
- `media` = ονόματα αρχείων που έδωσε ο server· το πλήρες URL = `{Base}/media/{filename}` (δημόσιο). Ανεβαίνουν με `POST /events/{id}/media`.

### TicketType
```json
{
  "id": 1,
  "name": "General Admission",
  "price": "18.00",
  "quantity": 250,
  "available": 180
}
```
- `available` = `quantity − (δεσμευμένα αυτού του τύπου)`. **Read-only** για το frontend (το διαχειρίζεται ο server σε κάθε booking).
- **Invariant (server-enforced):** `Σ(quantity κάθε type) ≤ event.capacity`. Έλεγχος σε create ΚΑΙ update.

### Booking
```json
{
  "id": 501,
  "eventId": 1024,
  "eventTitle": "Συναυλία Σύγχρονης Μουσικής",
  "eventStartDateTime": "2026-07-12T20:30:00Z",
  "eventStatus": "PUBLISHED",
  "eventCover": "3f2a9c1e.jpg" | null,
  "attendee": { "id": 12, "username": "maria21" },
  "ticketTypeId": 1,
  "ticketTypeName": "General Admission",
  "numberOfTickets": 2,
  "totalCost": "36.00",
  "status": "PENDING" | "CONFIRMED" | "CANCELLED",
  "time": "2026-06-20T11:42:10Z"
}
```

### Message
```json
{
  "id": 88,
  "fromUser": { "id": 7, "username": "org_athens_events" },
  "toUser": { "id": 12, "username": "maria21" },
  "eventId": 1024,
  "subject": "Σχετικά με την κράτησή σας",
  "body": "Καλησπέρα...",
  "read": false,
  "sentAt": "2026-06-21T08:00:00Z"
}
```

---

## 2. Endpoints

### 2.1 Authentication

#### `POST /auth/register`  — *(GUEST)*
Request:
```json
{
  "username": "maria21",
  "password": "secret123",
  "confirmPassword": "secret123",
  "firstName": "Μαρία",
  "lastName": "Παπαδοπούλου",
  "email": "maria@example.com",
  "phone": "+302101234567",
  "address": "Λεωφ. Κεντρική 25",
  "city": "Αθήνα",
  "country": "Greece",
  "geoLocation": { "lat": 37.9838, "lng": 23.7275 },
  "afm": "123456789"
}
```
- **201** → `{ "id": 12, "status": "PENDING" }` (frontend → Pending Page).
- **409 `USERNAME_TAKEN`** → frontend ζητά νέο username.
- **400 `VALIDATION_ERROR`** → `details` ανά πεδίο (password mismatch, invalid email/afm κ.λπ.).
- Το `geoLocation` είναι **υποχρεωτικό** (εκφώνηση §2: η εγγραφή «θα απαιτεί» γεωγραφική τοποθεσία), με `lat` ∈ [−90, 90] και `lng` ∈ [−180, 180]. Σφάλματα έρχονται ως `details["geoLocation"]` ή `details["geoLocation.lat"]`.

#### `POST /auth/login`  — *(GUEST)*
Request: `{ "username": "maria21", "password": "secret123" }`
- **200** →
```json
{
  "token": "eyJhbGciOi...",
  "user": { /* User DTO */ }
}
```
- **401 `UNAUTHENTICATED`** → λάθος credentials.
- **403 `FORBIDDEN`** με `message` «Η αίτησή σας εκκρεμεί/απορρίφθηκε» αν `status != APPROVED`.

> JWT payload (ενδεικτικά): `{ "sub": 12, "username": "maria21", "role": "USER", "exp": ... }`.

---

### 2.2 Admin  — *(ADMIN only)*

| Method | Path | Περιγραφή |
|--------|------|-----------|
| GET | `/admin/users?status=PENDING&page=1&pageSize=20` | Λίστα χρηστών (paginated), προαιρετικό φίλτρο status |
| GET | `/admin/users/{id}` | Πλήρη στοιχεία χρήστη |
| POST | `/admin/users/{id}/approve` | → `{ "id":12, "status":"APPROVED" }` |
| POST | `/admin/users/{id}/reject` | → `{ "id":12, "status":"REJECTED" }` |
| GET | `/admin/events/export?format=xml` | Όλες οι εκδηλώσεις ως **XML κατά το DTD** (`Content-Type: application/xml`) |
| GET | `/admin/events/export?format=json` | Όλες οι εκδηλώσεις ως JSON array από Event DTOs |

> Το XML export πρέπει να βγαίνει **ακριβώς** όπως το DTD της εκφώνησης (§7): root `<Events>`, `EventID="EV{id}"`, `<GeoLocation Latitude=".." Longitude=".."/>` κ.λπ.

---

### 2.3 Events

#### `GET /events`  — *(GUEST + USER)*  — αναζήτηση/πλοήγηση
Query params (όλα optional, συνδυάζονται):
| param | τύπος | σημασία |
|-------|-------|---------|
| `category` | string | φίλτρο κατηγορίας |
| `q` | string | ελεύθερο κείμενο σε title + description |
| `city` | string | τοποθεσία |
| `from`,`to` | ISO date | χρονικό διάστημα (startDateTime) |
| `minPrice`,`maxPrice` | decimal | εύρος τιμής εισιτηρίου |
| `page`,`pageSize` | int | σελιδοποίηση |
| `sort` | enum | `date` \| `price` \| `title` (default `date`) |

- Επιστρέφει **μόνο** `status==PUBLISHED` για GUEST/USER (τα DRAFT/CANCELLED δικά τους φαίνονται μέσω `/events/mine`).
- **200** → paginated wrapper με `Event[]` (μπορεί ελαφρύ DTO χωρίς `bookings`).

#### `GET /events/{id}`  — *(GUEST + USER)*
- **200** → πλήρες Event DTO (με `ticketTypes`, geoLocation για τον OpenStreetMap χάρτη).
- Side-effect: αν καλείται από logged-in USER, ο server **καταγράφει visit** (cold-start data). Εναλλακτικά ρητό endpoint παρακάτω.

#### `POST /events/{id}/visit`  — *(USER)*  — *(προαιρετικό, αν δεν γίνεται implicit)*
Καταγράφει επίσκεψη για τον αλγόριθμο συστάσεων (cold start). **204** No Content.

#### `GET /events/mine`  — *(USER)*  — εκδηλώσεις που διοργανώνω
- **200** → paginated `Event[]` του τρέχοντος χρήστη (όλα τα statuses).

#### `POST /events`  — *(USER → γίνεται organizer)*
Request (δεν στέλνουμε `available`/`reservedTotal`/`status` — τα ορίζει ο server):
```json
{
  "title": "...", "categories": ["Music"], "eventType": "Concert",
  "venue": "...", "address": "...", "city": "Αθήνα", "country": "Greece",
  "geoLocation": { "lat": 37.98, "lng": 23.72 },
  "startDateTime": "2026-07-12T20:30:00Z",
  "endDateTime": "2026-07-12T23:00:00Z",
  "capacity": 350,
  "ticketTypes": [
    { "name": "General Admission", "price": "18.00", "quantity": 250 },
    { "name": "Student", "price": "12.00", "quantity": 100 }
  ],
  "description": "...",
  "media": ["cover1.jpg"]
}
```
- **201** → πλήρες Event DTO με `status:"DRAFT"`, `available==quantity` παντού.
- **409 `CAPACITY_EXCEEDED`** αν `Σ(quantity) > capacity`.
- Το `media` του body **αγνοείται**: μια νέα εκδήλωση δεν έχει φωτογραφίες. Ανεβαίνουν μετά, με `POST /events/{id}/media`.

#### `PUT /events/{id}`  — *(USER, owner only)*
Ίδιο body με create. Ισχύει ο ίδιος `CAPACITY_EXCEEDED` έλεγχος. Δεν επιτρέπεται μείωση `quantity` κάτω από ήδη δεσμευμένα.
Το `media` λειτουργεί **αφαιρετικά**: όσες φωτογραφίες λείπουν από τη λίστα σβήνονται (και από τον δίσκο)· ονόματα που δεν ανήκουν ήδη στην εκδήλωση αγνοούνται.

#### `DELETE /events/{id}`  — *(USER, owner only)*
- **204** αν `isDeletable`: καμία κράτηση **και** `status` `DRAFT` ή `PUBLISHED` (εκφώνηση §7γ). Σβήνονται και τα αρχεία των φωτογραφιών.
- **409 `DELETE_NOT_ALLOWED`** αν υπάρχουν κρατήσεις ή η εκδήλωση είναι `CANCELLED`.

#### `POST /events/{id}/media`  — *(USER, owner only)*  — φωτογραφίες (εκφώνηση §7α)
`multipart/form-data` με ένα ή περισσότερα πεδία `files`.
- **201** → ενημερωμένο Event DTO· τα νέα ονόματα (τυχαία, τα δίνει ο server) μπαίνουν στο `media`.
- Δεκτά JPEG, PNG, GIF, WebP. Ο τύπος κρίνεται από τα **bytes** του αρχείου, όχι από κατάληξη ή `Content-Type`· SVG απορρίπτεται. ≤ 5 MB ανά αρχείο, ≤ 10 φωτογραφίες ανά εκδήλωση. **Όλα ή τίποτα.**
- **400 `VALIDATION_ERROR`** άκυρος τύπος / μέγεθος / πλήθος · **403** μη-owner · **409 `EVENT_NOT_ACTIVE`** αν η εκδήλωση δεν είναι `DRAFT`/`PUBLISHED`.

#### `POST /events/{id}/publish`  — *(USER, owner)* → `status: PUBLISHED`.

#### `POST /events/{id}/cancel`  — *(USER, owner)*
- `status → CANCELLED`. Δεδομένα/κρατήσεις **διατηρούνται** (ιστορικότητα).
- Side-effect: ο server στέλνει **broadcast message** σε όλους όσους έχουν booking (απαίτηση §10). Optional body: `{ "note": "Λυπούμαστε..." }`.
- **200** → ενημερωμένο Event DTO.

#### `GET /events/{id}/bookings`  — *(USER, owner)*
Λίστα κρατήσεων της εκδήλωσης (paginated `Booking[]`). 403 αν δεν είσαι owner.

---

### 2.4 Bookings

#### `POST /bookings`  — *(USER only — όχι GUEST)*
Request:
```json
{ "eventId": 1024, "ticketTypeId": 1, "numberOfTickets": 2 }
```
Server checks (atomic / με transaction lock κατά overbooking):
1. event `status==PUBLISHED` → αλλιώς **409 `EVENT_NOT_ACTIVE`**
2. η εκδήλωση **δεν έχει ξεκινήσει** (`startDateTime` > τώρα) → αλλιώς **409 `EVENT_NOT_ACTIVE`** (εκφώνηση §9: κρατήσεις «όταν η εκδήλωση είναι ενεργή»)
3. `numberOfTickets ≤ ticketType.available` → αλλιώς **409 `SEATS_UNAVAILABLE`**
4. δεν παραβιάζεται capacity
- **201** → Booking DTO με `status:"CONFIRMED"`, `totalCost` υπολογισμένο server-side.
- Μετά: μειώνεται `available`, αυξάνεται `reservedTotal`.
> Το frontend δείχνει **Confirmation Modal** πριν το POST — η κράτηση είναι **μη αναστρέψιμη** (§9).

#### `GET /bookings/mine`  — *(USER)* → paginated `Booking[]` του χρήστη.

---

### 2.5 Messaging

| Method | Path | Περιγραφή |
|--------|------|-----------|
| GET | `/messages/inbox?page=1` | Εισερχόμενα (paginated) |
| GET | `/messages/outbox?page=1` | Απεσταλμένα |
| GET | `/messages/unread-count` | `{ "count": 3 }` — για το Badge στο μενού (polling κάθε ~30s) |
| POST | `/messages` | Αποστολή: `{ "toUserId": 7, "eventId": 1024, "subject": "...", "body": "..." }` → 201 Message DTO |
| GET | `/messages/{id}` | Άνοιγμα μηνύματος → το μαρκάρει `read:true` |
| DELETE | `/messages/{id}` | Διαγραφή από τον κατάλογο **του χρήστη** → 204 |
| PUT | `/messages/{id}/read` | Ρητό μαρκάρισμα ως αναγνωσμένο (μόνο ο παραλήπτης) |

> **Η διαγραφή είναι soft delete ανά χρήστη** (migration 002). Η ίδια γραμμή
> είναι το εισερχόμενο του ενός και το απεσταλμένο του άλλου, οπότε ο καθένας
> κρύβει μόνο τη δική του όψη — ο συνομιλητής συνεχίζει να βλέπει το μήνυμα.
> Όταν το κρύψουν και οι δύο, ο server διαγράφει τη γραμμή οριστικά.
> Μετά τη διαγραφή, το `GET /messages/{id}` γυρίζει **404** για τον χρήστη που
> τη ζήτησε (όχι 403: το 403 θα αποκάλυπτε ότι το μήνυμα υπάρχει ακόμα).

> Επικοινωνία διοργανωτή↔συμμετέχοντα επιτρέπεται **μετά** από κράτηση (§10). Ο server μπορεί να επιβάλει ότι υπάρχει σχέση booking μεταξύ `from`/`to` για το συγκεκριμένο `eventId`.

---

### 2.6 Recommendations (Bonus)

#### `GET /recommendations`  — *(USER)*
- **200** →
```json
{
  "items": [ /* Event[] (PUBLISHED) */ ],
  "strategy": "matrix_factorization" | "cold_start_visits"
}
```
- Biased Matrix Factorization (υλοποίηση εκ του μηδενός, NumPy/Pandas).
- Αν ο χρήστης δεν έχει ιστορικό κρατήσεων → `cold_start_visits` (μόνο βάσει επισκέψεων).
- Το `strategy` βοηθά το frontend στο label («Προτεινόμενα για εσένα» vs «Δημοφιλή»).

---

## 3. Σημειώσεις Υλοποίησης (κοινές παραδοχές)

- **CORS:** Backend δέχεται origin του React dev server (π.χ. `https://localhost:5173`).
- **JWT αποθήκευση (frontend):** `localStorage` + axios interceptor που βάζει το header. *(Σημ.: ευάλωτο σε XSS — αποδεκτό για την εργασία· να το αναφέρουμε στο PDF.)*
- **Protected routes (frontend):** GUEST → δεν βλέπει create/book/messages. Μη-APPROVED → Pending Page.
- **Capacity / availability:** **πάντα** server-authoritative. Το frontend δείχνει, δεν αποφασίζει.
- **Visits για cold-start:** χρειάζεται πίνακας `event_visits(user_id, event_id, visited_at)` — **να προστεθεί στο DB schema** (δεν ήταν στο αρχικό πλάνο).
- **Media upload:** multipart σε `POST /events/{id}/media` (αποφασίστηκε στο v1.2). Τα αρχεία γράφονται στον φάκελο `media/` του backend (εκτός git) και σερβίρονται από το `{Base}/media/{filename}`.

---

## Changelog

- **v1.3 (2026-09-16):** Προσθετική αλλαγή (δεν σπάει κανέναν client).
  1. **Booking** — νέα πεδία `eventStartDateTime`, `eventStatus` και `eventCover`
     (η πρώτη φωτογραφία της εκδήλωσης ή `null`). Η λίστα «Οι κρατήσεις μου»
     δείχνει πότε γίνεται η εκδήλωση και αν ακυρώθηκε, χωρίς επιπλέον κλήσεις.

- **v1.2 (2026-09-15):** Ευθυγράμμιση με την **εκφώνηση**, μετά από έλεγχο
  συμμόρφωσης. Τα 1 και 4 **αλλάζουν συμπεριφορά** — το frontend ενημερώθηκε.
  1. **§7γ εκφώνησης** — `isDeletable` / `DELETE /events/{id}`: διαγράφεται και
     `PUBLISHED` εκδήλωση που δεν έχει ακόμα κράτηση (το v1 επέτρεπε μόνο
     `DRAFT`, αυστηρότερα από την εκφώνηση). Η `CANCELLED` δεν διαγράφεται.
  2. **§2.3** Νέο `POST /events/{id}/media` για φωτογραφίες (εκφώνηση §7α). Στο
     `POST /events` το `media` αγνοείται· στο `PUT` λειτουργεί αφαιρετικά.
  3. **§2.4** `POST /bookings` → 409 `EVENT_NOT_ACTIVE` αν η εκδήλωση έχει ήδη
     ξεκινήσει (εκφώνηση §9).
  4. **§2.1** Το `geoLocation` είναι υποχρεωτικό στην εγγραφή, με έλεγχο ορίων
     (εκφώνηση §2). Client που στέλνει `null` παίρνει 400.

- **v1.1 (2026-09-12):** Ευθυγράμμιση με την υλοποίηση, μετά το merge
  backend↔frontend. Καμία αλλαγή δεν σπάει client που γράφτηκε για το v1.

  *Προσθήκες του backend (υπερσύνολα — ό,τι όριζε το v1 εξακολουθεί να ισχύει):*
  1. **§2.6** `GET /recommendations`: η απάντηση περιλαμβάνει **και** τα πεδία
     σελιδοποίησης (`page`, `pageSize`, `total`, `totalPages`) πέρα από τα
     `items` / `strategy`. `pageSize` 1–50, default 10 — **όχι** 1–100.
  2. **§2.2** Προστέθηκε `PUT /admin/users/{id}/status` με body
     `{"status": "APPROVED"}`. Τα `POST /approve` και `/reject` παραμένουν·
     το νέο εκφράζει καθαρά τη μετάβαση `REJECTED → APPROVED`.
  3. **§2.5** Προστέθηκε `PUT /messages/{id}/read` δίπλα στο implicit
     μαρκάρισμα του `GET /messages/{id}`.

  *Διευκρινίσεις συμπεριφοράς (ίδια endpoints, ρητά καταγεγραμμένα):*
  4. **§0** Το `VALIDATION_ERROR` επιστρέφει **400**, ποτέ 422. Οι διαδρομές
     στο `details` είναι dotted με δείκτες λίστας (`ticketTypes.0.quantity`).
     Σφάλματα σχέσης δύο πεδίων έρχονται με κλειδί `"body"`.
  5. **§2.3** `PUT /events/{id}`: οι τύποι εισιτηρίων ταυτοποιούνται με το
     **`name`** (το body δεν στέλνει ids). Όνομα που λείπει → διαγραφή, νέο
     όνομα → δημιουργία. Άρα **μετονομασία τύπου με κρατήσεις → 409
     `SEATS_UNAVAILABLE`**. Διπλά ονόματα → 400. Το `media` αντικαθίσταται
     ολόκληρο: στείλε το υπάρχον πίσω, αλλιώς σβήνεται.
  6. **§2.3** `GET /events/{id}` έχει **παρενέργεια**: καταγράφει `EventVisit`
     για συνδεδεμένο μη-διοργανωτή σε PUBLISHED εκδήλωση (cold-start, §13).
     Μία κλήση ανά πραγματικό άνοιγμα σελίδας.
  7. **§2.3** DRAFT εκδήλωση άλλου χρήστη → **404**, όχι 403.
  8. **§2.5** Το `eventId` είναι **υποχρεωτικό** σε κάθε μήνυμα (η στήλη
     `messages.fk_event_id` είναι NOT NULL) — δεν υπάρχει «γενικό» μήνυμα.
  9. **§2.5** Το `DELETE /messages/{id}` υλοποιήθηκε ως **soft delete ανά
     χρήστη** (migration 002) — βλ. σημείωση στο §2.5.
  10. **§0** Το XML export γράφει ημερομηνίες **χωρίς `Z`**, κατά το DTD της
      εκφώνησης. Αφορά μόνο το export· το JSON API κρατά το `Z`.
  11. **§0** Το JWT `sub` είναι **string** (απαίτηση του προτύπου), όχι int.
  12. Σε αυτό το dataset τα λανθάνοντα χαρακτηριστικά δεν προσθέτουν μετρήσιμη βελτίωση πάνω από τα biases (0,364 έναντι 0,362). Όλο το κέρδος προέρχεται από τα αρνητικά δείγματα και τις λιγότερες εποχές.Μαζί με την εξήγηση: πυκνότητα 0,087% και μόλις ~1,7 αλληλεπιδράσεις ανά εκδήλωση. Αν σε ρωτήσουν, είναι καλύτερα να το έχεις γράψει εσύ παρά να το ανακαλύψουν.


