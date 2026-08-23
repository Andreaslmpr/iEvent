/* ============================================================
   Κατέβασμα κειμένου ως αρχείο (XML/JSON export του διαχειριστή).
   Φτιάχνουμε Blob και «πατάμε» έναν προσωρινό σύνδεσμο — έτσι δεν
   χρειάζεται ούτε βιβλιοθήκη ούτε άνοιγμα νέας καρτέλας.
   ============================================================ */
export function downloadText(filename, text, mimeType) {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()

  URL.revokeObjectURL(url)
}
