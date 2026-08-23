/* ============================================================
   EventMap — χάρτης OpenStreetMap για τη θέση της εκδήλωσης
   (εκφώνηση: εμφάνιση geoLocation σε χάρτη).

   Χρησιμοποιούμε το επίσημο embed του OpenStreetMap σε <iframe>:
   δεν χρειάζεται εξωτερική βιβλιοθήκη ή API key — κρατά το
   frontend απλό, όπως συμφωνήσαμε στο CLAUDE.md.
   ============================================================ */
import './EventMap.css'

/* Μικρό «κουτί» γύρω από το σημείο ώστε ο χάρτης να ανοίγει με ζουμ. */
const DELTA = 0.006

export default function EventMap({ geoLocation, label }) {
  if (!geoLocation) return null
  const { lat, lng } = geoLocation

  const bbox = [lng - DELTA, lat - DELTA / 2, lng + DELTA, lat + DELTA / 2].join(',')
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`
  const fullMap = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}`

  return (
    <div className="event-map">
      <iframe
        className="event-map__frame"
        src={src}
        title={`Χάρτης: ${label ?? 'τοποθεσία εκδήλωσης'}`}
        loading="lazy"
      />
      <a className="event-map__link" href={fullMap} target="_blank" rel="noreferrer">
        Άνοιγμα σε μεγαλύτερο χάρτη ↗
      </a>
    </div>
  )
}
