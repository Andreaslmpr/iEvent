"""Biased Matrix Factorization — υλοποίηση εκ του μηδενός (εκφώνηση §13).

Το αρχείο ΔΕΝ γνωρίζει τίποτα για FastAPI ή SQLAlchemy: δέχεται ένα pandas
DataFrame και επιστρέφει προβλέψεις. Έτσι ο αλγόριθμος δοκιμάζεται μεμονωμένα,
χωρίς βάση δεδομένων και χωρίς HTTP.

Το μοντέλο
----------
Η πρόβλεψη για τον χρήστη u και την εκδήλωση i είναι:

    r̂(u,i) = μ + b_u + b_i + q_iᵀ · p_u

    μ   : ο γενικός μέσος όρος όλων των βαθμολογιών
    b_u : προκατάληψη χρήστη — πόσο πιο δραστήριος είναι από τον μέσο όρο
    b_i : προκατάληψη εκδήλωσης — πόσο πιο δημοφιλής είναι από τον μέσο όρο
    p_u : διάνυσμα λανθανόντων χαρακτηριστικών του χρήστη   (k διαστάσεις)
    q_i : διάνυσμα λανθανόντων χαρακτηριστικών της εκδήλωσης (k διαστάσεις)

Οι όροι b_u και b_i είναι ακριβώς αυτό που κάνει το μοντέλο «biased»: χωρίς
αυτούς, το γινόμενο q·p θα έπρεπε να εξηγήσει μόνο του και τη δημοτικότητα κάθε
εκδήλωσης και τη δραστηριότητα κάθε χρήστη, πράγματα που δεν έχουν σχέση με το
ταίριασμα των δύο.

Η εκπαίδευση (Stochastic Gradient Descent)
------------------------------------------
Για κάθε παρατήρηση υπολογίζουμε το σφάλμα e = r − r̂ και κινούμαστε αντίθετα
από την κλίση της συνάρτησης κόστους

    Σ (r − r̂)² + λ(b_u² + b_i² + ‖p_u‖² + ‖q_i‖²)

Ο όρος λ (regularization) τιμωρεί τις μεγάλες τιμές και εμποδίζει το μοντέλο να
«αποστηθίσει» τα λίγα δεδομένα μας (overfitting).
"""

from __future__ import annotations

import numpy as np
import pandas as pd


class BiasedMF:
    """Biased Matrix Factorization εκπαιδευμένο με SGD.

    Παράμετροι
    ----------
    n_factors : πλήθος λανθανόντων χαρακτηριστικών (k). Μικρό, γιατί τα δεδομένα
                μιας φοιτητικής εφαρμογής είναι ελάχιστα — μεγάλο k θα έκανε
                overfit αμέσως.
    n_epochs  : πόσες φορές περνάμε πάνω από όλα τα δεδομένα.
    lr        : ρυθμός μάθησης (learning rate, η).
    reg       : συντελεστής κανονικοποίησης (λ).
    seed      : για αναπαραγώγιμα αποτελέσματα — ίδια δεδομένα, ίδιες προτάσεις.
    negative_ratio : αρνητικά δείγματα ανά θετική παρατήρηση, σε κάθε εποχή.

    Γιατί αρνητικά δείγματα
    -----------------------
    Στην εφαρμογή ΟΛΕΣ οι παρατηρήσεις είναι θετικές (επίσκεψη, κράτηση): δεν
    υπάρχει «δεν μου αρέσει». Ένα μοντέλο παλινδρόμησης που βλέπει μόνο «του
    άρεσε» μαθαίνει να προβλέπει «του αρέσει» για τα πάντα, άρα δεν μπορεί να
    ξεχωρίσει ποιες ΑΓΝΩΣΤΕΣ εκδηλώσεις ταιριάζουν στον χρήστη. Γι' αυτό, σε
    κάθε εποχή, για τυχαίες θετικές παρατηρήσεις κρατάμε τον χρήστη και
    διαλέγουμε τυχαία μια εκδήλωση που ΔΕΝ έχει δει, με στόχο βαθμολογία 0: μια
    αθέατη εκδήλωση είναι ασθενής ένδειξη αδιαφορίας. Τα δείγματα αλλάζουν σε
    κάθε εποχή, ώστε καμία συγκεκριμένη αθέατη εκδήλωση να μην «τιμωρείται»
    μόνιμα.
    """

    def __init__(
        self,
        n_factors: int = 8,
        # Οι προεπιλογές προέκυψαν από αξιολόγηση (services/evaluate_recommender.py).
        # Με τις αρχικές 60 εποχές το μοντέλο έκανε overfitting στο dataset του
        # e-class — χειρότερο RMSE ακόμη και από τον σκέτο μέσο όρο. Τα αρνητικά
        # δείγματα είναι απαραίτητα για να κατατάσσονται ΑΘΕΑΤΕΣ εκδηλώσεις, που
        # είναι ακριβώς οι υποψήφιες προτάσεις της εφαρμογής.
        n_epochs: int = 20,
        lr: float = 0.01,
        reg: float = 0.1,
        seed: int = 42,
        negative_ratio: float = 1.0,
    ) -> None:
        self.n_factors = n_factors
        self.n_epochs = n_epochs
        self.lr = lr
        self.reg = reg
        self.seed = seed
        self.negative_ratio = negative_ratio

    # -----------------------------------------------------------------
    def fit(self, ratings: pd.DataFrame) -> "BiasedMF":
        """Εκπαίδευση. Το `ratings` έχει στήλες: user_id, item_id, rating."""
        if ratings.empty:
            raise ValueError("Δεν υπάρχουν δεδομένα για εκπαίδευση.")

        # Αντιστοίχιση των ids της βάσης (αραιά, π.χ. 7, 42, 1024) σε συνεχείς
        # δείκτες πινάκων 0..n-1.
        self.user_index_ = {uid: i for i, uid in enumerate(ratings["user_id"].unique())}
        self.item_index_ = {iid: i for i, iid in enumerate(ratings["item_id"].unique())}
        n_users, n_items = len(self.user_index_), len(self.item_index_)

        u_idx = ratings["user_id"].map(self.user_index_).to_numpy()
        i_idx = ratings["item_id"].map(self.item_index_).to_numpy()
        r = ratings["rating"].to_numpy(dtype=float)

        # Όσα ζεύγη έχουν ήδη παρατηρηθεί — δεν επιτρέπεται να γίνουν αρνητικά.
        observed = set(zip(u_idx.tolist(), i_idx.tolist()))
        n_negatives = int(round(len(r) * self.negative_ratio))

        # μ = μέσος όρος των ΣΤΟΧΩΝ της εκπαίδευσης, μαζί με τα αρνητικά (0).
        # Χωρίς αρνητικά δείγματα είναι απλώς ο μέσος όρος των βαθμολογιών.
        self.mu_ = float(r.sum() / (len(r) + n_negatives))

        rng = np.random.default_rng(self.seed)
        # Οι προκαταλήψεις ξεκινούν στο μηδέν: «κανείς δεν διαφέρει από τον μέσο
        # όρο μέχρι να το δείξουν τα δεδομένα».
        self.b_u_ = np.zeros(n_users)
        self.b_i_ = np.zeros(n_items)
        # Οι λανθάνοντες παράγοντες ξεκινούν από μικρό τυχαίο θόρυβο. ΟΧΙ μηδέν:
        # αν P και Q ήταν μηδενικά, το γινόμενο και οι κλίσεις τους θα έμεναν
        # μηδέν για πάντα και το μοντέλο δεν θα μάθαινε ποτέ αλληλεπιδράσεις.
        self.P_ = rng.normal(0.0, 0.1, (n_users, self.n_factors))
        self.Q_ = rng.normal(0.0, 0.1, (n_items, self.n_factors))

        self.history_ = []

        for _ in range(self.n_epochs):
            users, items, targets = u_idx, i_idx, r
            if n_negatives:
                # Ο χρήστης κάθε αρνητικού δείγματος προέρχεται από τυχαία θετική
                # παρατήρηση, ώστε οι ενεργοί χρήστες να παίρνουν αναλογικά
                # περισσότερα αρνητικά. Η εκδήλωση επιλέγεται τυχαία.
                picked = rng.integers(0, len(r), n_negatives)
                neg_users = u_idx[picked]
                neg_items = rng.integers(0, n_items, n_negatives)
                unseen = np.fromiter(
                    ((a, b) not in observed for a, b in zip(neg_users.tolist(), neg_items.tolist())),
                    dtype=bool, count=n_negatives,
                )
                users = np.concatenate([u_idx, neg_users[unseen]])
                items = np.concatenate([i_idx, neg_items[unseen]])
                targets = np.concatenate([r, np.zeros(int(unseen.sum()))])

            # Ανακάτεμα σε κάθε εποχή: η σταθερή σειρά εισάγει συστηματική
            # μεροληψία στο SGD.
            order = rng.permutation(len(targets))
            squared_error = 0.0

            for k in order:
                u, i = users[k], items[k]

                prediction = (
                    self.mu_
                    + self.b_u_[u]
                    + self.b_i_[i]
                    + float(self.P_[u] @ self.Q_[i])
                )
                error = targets[k] - prediction
                squared_error += error * error

                # Ενημέρωση προκαταλήψεων
                self.b_u_[u] += self.lr * (error - self.reg * self.b_u_[u])
                self.b_i_[i] += self.lr * (error - self.reg * self.b_i_[i])

                # ΠΡΟΣΟΧΗ: κρατάμε αντίγραφο του p_u ΠΡΙΝ το ενημερώσουμε.
                # Οι δύο ενημερώσεις είναι ταυτόχρονες στα μαθηματικά· αν
                # χρησιμοποιούσαμε το ήδη ενημερωμένο p_u για το q_i, θα
                # υπολογίζαμε λάθος κλίση.
                p_u = self.P_[u].copy()
                self.P_[u] += self.lr * (error * self.Q_[i] - self.reg * p_u)
                self.Q_[i] += self.lr * (error * p_u - self.reg * self.Q_[i])

            self.history_.append(float(np.sqrt(squared_error / len(targets))))

        self.train_rmse_ = self.history_[-1]
        return self

    # -----------------------------------------------------------------
    def predict(self, user_id: int, item_id: int) -> float:
        """Προβλεπόμενη βαθμολογία. Χειρίζεται και άγνωστους χρήστες/εκδηλώσεις.

        Άγνωστη εκδήλωση → μένει μόνο το μ (+ b_u): δεν έχουμε καμία πληροφορία
        γι' αυτήν, οπότε επιστρέφουμε τον μέσο όρο αντί να σκάσουμε.
        """
        u = self.user_index_.get(user_id)
        i = self.item_index_.get(item_id)

        score = self.mu_
        if u is not None:
            score += self.b_u_[u]
        if i is not None:
            score += self.b_i_[i]
        if u is not None and i is not None:
            score += float(self.P_[u] @ self.Q_[i])
        return score

    # -----------------------------------------------------------------
    def recommend(
        self, user_id: int, candidate_item_ids: list[int], top_n: int = 10
    ) -> list[tuple[int, float]]:
        """Οι top_n υποψήφιες εκδηλώσεις, ταξινομημένες κατά φθίνουσα πρόβλεψη.

        Το φιλτράρισμα (τι έχει ήδη δει/κρατήσει ο χρήστης) γίνεται από τον
        καλούντα: εδώ μέσα δεν υπάρχει έννοια «εκδήλωση» ή «κράτηση».
        """
        scored = [(item_id, self.predict(user_id, item_id)) for item_id in candidate_item_ids]
        # Δεύτερο κριτήριο το id: σταθερή σειρά όταν δύο σκορ είναι ίσα.
        scored.sort(key=lambda pair: (-pair[1], pair[0]))
        return scored[:top_n]


# ---------------------------------------------------------------------
# Βάρη implicit feedback (εκφώνηση §13)
# ---------------------------------------------------------------------
# Δεν έχουμε ρητές βαθμολογίες (αστεράκια). Συνάγουμε προτίμηση από συμπεριφορά:
# η επίσκεψη δείχνει ενδιαφέρον, η κράτηση δείχνει δέσμευση — και κοστίζει
# χρήματα, γι' αυτό βαραίνει 5 φορές περισσότερο.
VISIT_WEIGHT = 1.0
BOOKING_WEIGHT = 5.0
# Ανώτατο όριο: χωρίς αυτό, ένας χρήστης που άνοιξε 40 φορές την ίδια σελίδα θα
# κυριαρχούσε στην εκπαίδευση και θα στρέβλωνε όλες τις προκαταλήψεις.
MAX_RATING = 10.0


def build_ratings(
    visits: list[tuple[int, int, int]],
    bookings: list[tuple[int, int, int]],
) -> pd.DataFrame:
    """Χτίζει τον πίνακα implicit feedback.

    visits / bookings: λίστες από (user_id, event_id, πλήθος).
    Επιστρέφει DataFrame με στήλες user_id, item_id, rating.
    """
    rows = [
        {"user_id": u, "item_id": e, "rating": n * VISIT_WEIGHT}
        for u, e, n in visits
    ] + [
        {"user_id": u, "item_id": e, "rating": n * BOOKING_WEIGHT}
        for u, e, n in bookings
    ]

    if not rows:
        return pd.DataFrame(columns=["user_id", "item_id", "rating"])

    frame = pd.DataFrame(rows)
    # Ένας χρήστης μπορεί και να επισκέφθηκε ΚΑΙ να κράτησε την ίδια εκδήλωση:
    # τα δύο σήματα αθροίζονται σε μία βαθμολογία.
    frame = frame.groupby(["user_id", "item_id"], as_index=False)["rating"].sum()
    frame["rating"] = frame["rating"].clip(upper=MAX_RATING)
    return frame
