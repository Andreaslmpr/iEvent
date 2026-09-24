# CLAUDE.md — iEvent Frontend
ΛΑΜΠΡΟΠΟΥΛΟΣ ΑΝΔΡΕΑΣ sdi2200252-ΠΑΤΣΑΚΑΣ Γεωργιος sdi2200144
Οδηγίες για ανάπτυξη του **frontend** (React) της εργασίας ΤΕΔ 2026.
Εφαρμογή διαχείρισης εκδηλώσεων & ηλεκτρονικών κρατήσεων.



## Ομάδα & branches
- **Γιώργος** → frontend (React) · branch εργασίας: `frontend-giorgos`
- **Ανδρέας** → backend (Python REST API) + βάση + αλγόριθμος συστάσεων
- Κοινό συμβόλαιο API: **`API_CONTRACT.md`** (στο `main`) — η μόνη πηγή αλήθειας για τα endpoints/DTOs.

## Stack
- React 18 + Vite 6 + React Router 6 (plain JS, `.jsx` — όχι TypeScript)
- axios για HTTP, JWT στο `localStorage`
- **Καθαρό CSS** με design tokens (CSS variables) — όχι Tailwind/component lib

## Εντολές
```bash
npm install      # εγκατάσταση
npm run dev      # dev server → https://localhost:5173 (SSL, εκφώνηση §1)
                 # Χρειάζεται `bash make-certs.sh` μία φορά· αλλιώς πέφτει σε HTTP.
                 # Την πρώτη φορά ο browser ζητά αποδοχή του self-signed.
npm run build    # production build (έλεγχος ότι compiles)
npm run preview  # preview του build
```

## Δομή
```
src/
  api/            # API facade — ΜΟΝΟ από εδώ γίνονται κλήσεις
    index.js      #   facade με toggle USE_MOCK (mock-first)
    client.js     #   axios instance + JWT interceptor
    mock/db.js    #   in-memory mock δεδομένα (DTOs του contract)
  auth/token.js   # JWT/user στο localStorage (μοναδικό σημείο)
  context/        # AuthContext (user, role, login, logout)
  routes/         # ProtectedRoute (περιορισμός ανά ρόλο)
  components/      # επαναχρησιμοποιήσιμα components (layout/, ...)
  pages/          # μία σελίδα ανά route
  styles/         # theme.css (tokens) · components.css (.btn/.card) · global.css
```

## Συμβάσεις (σημαντικές για συνέπεια & προφορική)
- **Πλέον μιλάμε στο πραγματικό backend.** Το `USE_MOCK` οδηγείται από το
  `VITE_USE_MOCK` και είναι **false** χωρίς ρύθμιση. Τα mocks μένουν δίπλα στις
  real κλήσεις — για δουλειά χωρίς server: `VITE_USE_MOCK=true` στο `.env.local`
  (βλ. `.env.example`). Τα `/api` requests τα προωθεί ο proxy του Vite στο
  `https://localhost:8000` (κανένα CORS, κανένα self-signed πρόβλημα).
- **Ποτέ hardcoded χρώμα/spacing** μέσα σε component CSS — πάντα μέσω των tokens του `theme.css`.
- **Ποτέ απευθείας axios** σε component — πάντα μέσω `api/index.js`.
- **Ρόλοι:** `GUEST` (χωρίς login) / `USER` (APPROVED) / `ADMIN`. Το «είμαι διοργανωτής»
  κρίνεται από ownership του event, όχι από ρόλο.
- Χρήματα ως **string** (`"18.00"`), ημερομηνίες **ISO-8601 UTC**.
- Κώδικας **απλός & κατανοητός** — η προφορική ελέγχει αν καταλαβαίνουμε τι γράψαμε.

## Mock χρήστες (για δοκιμές login)
| username | password | ρόλος / status |
|----------|----------|----------------|
| `admin` | `admin123` | ADMIN |
| `maria21` | `maria123` | USER / APPROVED |
| `org_athens_events` | `nikos123` | USER (διοργανωτής) |
| `pending_user` | `elena123` | USER / PENDING |
| `giannis_p` | `giannis123` | USER / APPROVED |

## Roadmap (φάσεις)
0. ✅ Scaffold + routing + auth context + design system
1. ✅ Auth pages (Welcome/Login/Register/Pending)
2. ✅ Core USER (αναζήτηση, σελίδα event + χάρτης, κράτηση)
3. ✅ Dashboard διοργανωτή (φόρμα event, κρατήσεις)
4. ✅ Admin panel + Messaging
5. ✅ Widget συστάσεων (§13 — απαλλάσσει από τη γραπτή εξέταση, ΟΧΙ απλό bonus)
6. Σκλήρυνση (security/simplify/polish)

## Εκκρεμότητες προς παράδοση (από την εκφώνηση)
- ✅ **PDF αναφοράς** (§Λοιπές 3): `docs/report.pdf`, από το `docs/report.html` —
  11 κεφάλαια, κατά τη ζητούμενη δομή. Μετά από αλλαγή στο HTML ξαναβγάλε το PDF
  (Chrome → Εκτύπωση → «Αποθήκευση ως PDF»). Ονόματα και ΑΜ συμπληρώθηκαν (15/09).
- ✅ **Φωτογραφίες** (§7α): ανέβασμα με `POST /events/{id}/media`, συλλογή στη
  σελίδα εκδήλωσης, εξώφυλλο στις κάρτες (API_CONTRACT v1.2).
- **Dataset συστάσεων** (§13): στο `dataset/rel_event_csvs/` — 1,5 GB, **εκτός git
  και εκτός zip**. Αξιολόγηση: `.venv/bin/python -m services.evaluate_recommender`
  → αποτελέσματα στο `docs/recommender_evaluation.md`, ερμηνεία στο §7.5 της αναφοράς.
- **Zip παράδοσης**: ΧΩΡΙΣ `node_modules/`, `.venv/`, `.env`, `certs/`, `media/`,
  `dataset/`, `dist/`, `get-pip.py`.
- **Mock δεδομένα**: τα `startDateTime` στο `mock/db.js` είναι Ιουνίου–
  Ιουλίου 2026 και έχουν ήδη περάσει. Σε mock mode οι προτάσεις (που
  φιλτράρουν μελλοντικές εκδηλώσεις) δείχνουν ελάχιστα.
