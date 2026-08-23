/* ============================================================
   EventFilters — τα φίλτρα αναζήτησης του contract §2.3
   (q, category, city, from, to, minPrice, maxPrice, sort).
   Κρατά δικό του τοπικό state και τα «εφαρμόζει» στο submit·
   η σελίδα τα γράφει στο URL, ώστε η αναζήτηση να μοιράζεται.
   ============================================================ */
import { useState } from 'react'
import { EVENT_CATEGORIES } from '../../api/mock/db.js'
import './EventFilters.css'

const EMPTY = {
  q: '', category: '', city: '', from: '', to: '',
  minPrice: '', maxPrice: '', sort: 'date',
}

export default function EventFilters({ initial = {}, onApply, onReset }) {
  const [values, setValues] = useState({ ...EMPTY, ...initial })

  function handleChange(e) {
    const { name, value } = e.target
    setValues((prev) => ({ ...prev, [name]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onApply(values)
  }

  function handleReset() {
    setValues(EMPTY)
    onReset()
  }

  return (
    <form className="filters" onSubmit={handleSubmit}>
      <div className="filters__grid filters__grid--main">
        <label className="filters__field">
          <span className="filters__label">Αναζήτηση</span>
          <input
            className="filters__input" name="q" value={values.q} onChange={handleChange}
            placeholder="Τίτλος ή περιγραφή…"
          />
        </label>

        <label className="filters__field">
          <span className="filters__label">Κατηγορία</span>
          <select className="filters__input" name="category" value={values.category} onChange={handleChange}>
            <option value="">Όλες</option>
            {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>

        <label className="filters__field">
          <span className="filters__label">Πόλη</span>
          <input
            className="filters__input" name="city" value={values.city} onChange={handleChange}
            placeholder="π.χ. Αθήνα"
          />
        </label>
      </div>

      <div className="filters__grid" style={{ marginTop: 'var(--space-4)' }}>
        <label className="filters__field">
          <span className="filters__label">Από</span>
          <input className="filters__input" type="date" name="from" value={values.from} onChange={handleChange} />
        </label>

        <label className="filters__field">
          <span className="filters__label">Έως</span>
          <input className="filters__input" type="date" name="to" value={values.to} onChange={handleChange} />
        </label>

        <div className="filters__field">
          <span className="filters__label">Τιμή (€)</span>
          <div className="filters__prices">
            <input
              className="filters__input" type="number" min="0" name="minPrice"
              value={values.minPrice} onChange={handleChange} placeholder="από" aria-label="Ελάχιστη τιμή"
            />
            <input
              className="filters__input" type="number" min="0" name="maxPrice"
              value={values.maxPrice} onChange={handleChange} placeholder="έως" aria-label="Μέγιστη τιμή"
            />
          </div>
        </div>

        <label className="filters__field">
          <span className="filters__label">Ταξινόμηση</span>
          <select className="filters__input" name="sort" value={values.sort} onChange={handleChange}>
            <option value="date">Ημερομηνία</option>
            <option value="price">Τιμή</option>
            <option value="title">Τίτλος</option>
          </select>
        </label>
      </div>

      <div className="filters__row">
        <button type="button" className="btn btn--muted" onClick={handleReset}>Καθαρισμός</button>
        <button type="submit" className="btn btn--primary">Αναζήτηση</button>
      </div>
    </form>
  )
}
