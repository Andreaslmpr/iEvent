"""Αποθήκευση φωτογραφιών εκδηλώσεων (εκφώνηση §7α).

Η εκφώνηση ζητά να «αποθηκεύονται προαιρετικά μία ή περισσότερες φωτογραφίες
για κάθε εκδήλωση». Τα αρχεία γράφονται στον φάκελο `media/` και η βάση κρατά
μόνο το όνομα (πίνακας `event_media`). Το main.py τα σερβίρει στη διαδρομή
`/api/media/{filename}`, όπως ορίζει το API_CONTRACT.md §1.

Ασφάλεια — τρεις κανόνες:
  1. Ο τύπος κρίνεται από τα ΠΡΩΤΑ BYTES του αρχείου, όχι από την κατάληξη ή το
     Content-Type: αυτά τα ορίζει ο client και ψεύδονται εύκολα.
  2. Το όνομα στον δίσκο το φτιάχνει ο server (τυχαίο uuid). Το όνομα που έστειλε
     ο χρήστης δεν χρησιμοποιείται ποτέ, οπότε δεν γίνεται path traversal
     (`../../main.py`) ούτε σύγκρουση ονομάτων.
  3. Δεν δεχόμαστε SVG: είναι XML και μπορεί να περιέχει JavaScript.
"""

import os
import uuid
from pathlib import Path
from typing import Optional

MEDIA_DIR = Path(os.getenv("MEDIA_DIR", Path(__file__).resolve().parent.parent / "media"))
MEDIA_DIR.mkdir(parents=True, exist_ok=True)

MAX_PHOTO_BYTES = 5 * 1024 * 1024   # 5 MB ανά φωτογραφία
MAX_PHOTOS_PER_EVENT = 10


def detect_image_type(head: bytes) -> Optional[str]:
    """Κατάληξη από την «υπογραφή» του αρχείου (magic bytes), ή None."""
    if head.startswith(b"\xff\xd8\xff"):
        return ".jpg"
    if head.startswith(b"\x89PNG\r\n\x1a\n"):
        return ".png"
    if head[:6] in (b"GIF87a", b"GIF89a"):
        return ".gif"
    if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
        return ".webp"
    return None


def save_image(data: bytes) -> str:
    """Γράφει ήδη ελεγμένη εικόνα στον δίσκο και επιστρέφει το νέο όνομα."""
    extension = detect_image_type(data[:12])
    if extension is None:
        raise ValueError("Το αρχείο δεν είναι εικόνα JPEG, PNG, GIF ή WebP.")
    filename = f"{uuid.uuid4().hex}{extension}"
    (MEDIA_DIR / filename).write_bytes(data)
    return filename


def delete_file(filename: str) -> None:
    """Σβήνει αρχείο από τον φάκελο media — αθόρυβα αν δεν υπάρχει.

    Το `Path(...).name` κρατά μόνο το τελικό όνομα, ώστε ακόμη κι ένα αλλοιωμένο
    όνομα στη βάση να μην μπορεί να οδηγήσει σε διαγραφή εκτός του φακέλου.
    """
    try:
        (MEDIA_DIR / Path(filename).name).unlink()
    except FileNotFoundError:
        pass
