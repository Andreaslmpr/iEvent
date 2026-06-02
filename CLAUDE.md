# CLAUDE.md — StayApp Frontend

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
npm run dev      # dev server → http://localhost:5173
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
- **Mock-first:** όλη η ανάπτυξη γίνεται με `USE_MOCK = true` στο `src/api/index.js`.
  Όταν έρθει το backend → γυρνάμε σε `false` (οι real κλήσεις υπάρχουν ήδη δίπλα στις mock).
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

## Roadmap (φάσεις)
0. ✅ Scaffold + routing + auth context + design system
1. Auth pages (Welcome/Login/Register/Pending)
2. Core USER (αναζήτηση, σελίδα event + χάρτης, κράτηση)
3. Dashboard διοργανωτή (φόρμα event, κρατήσεις)
4. Admin panel + Messaging
5. Bonus widget συστάσεων
6. Σκλήρυνση (security/simplify/polish)
