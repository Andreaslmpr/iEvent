"""Αξιολόγηση του Biased Matrix Factorization στο dataset του e-class (εκφώνηση §13).

Η εκφώνηση αναφέρει ότι «για το σκοπό αυτό παρέχεται dataset στο e-class». Η
εφαρμογή εκπαιδεύει το μοντέλο στα δικά της δεδομένα (επισκέψεις/κρατήσεις),
που σε μια νέα εγκατάσταση είναι ελάχιστα. Εδώ δοκιμάζουμε ΤΟΝ ΙΔΙΟ κώδικα
(services/recommender.py) σε πραγματικά δεδομένα και τον συγκρίνουμε με
απλούστερα μοντέλα αναφοράς.

Εκτέλεση από τη ρίζα του έργου:
    .venv/bin/python -m services.evaluate_recommender

Προαπαιτούμενο: dataset/rel_event_csvs/event_interest.csv (ΔΕΝ είναι στο git).

Γιατί το event_interest.csv:
  - Είναι το μόνο αρχείο με αλληλεπιδράσεις χρήστη–εκδήλωσης όπου και τα δύο
    αναγνωριστικά είναι συμπληρωμένα. Στο event_attendees.csv, σε δείγμα ενός
    εκατομμυρίου γραμμών, μόνο ~0,8% έχει user_id.
  - Το events.csv δεν έχει τίτλους/χώρους (μόνο συχνότητες λέξεων), άρα δεν
    προσφέρεται ούτε ως δεδομένα επίδειξης της εφαρμογής.

Δύο ερωτήματα, δύο μετρήσεις:
  1. «Από τις εκδηλώσεις που ΠΡΟΒΛΗΘΗΚΑΝ στον χρήστη, ποιες τον ενδιέφεραν;»
     → RMSE / MAE / AUC πάνω στα ζεύγη ελέγχου του dataset.
  2. «Από εκδηλώσεις που ΔΕΝ έχει δει, ποιες να του προτείνουμε;» — αυτό κάνει
     η εφαρμογή. Για κάθε εκδήλωση ελέγχου που ενδιέφερε τον χρήστη, πόσο ψηλά
     την κατατάσσει το μοντέλο ανάμεσα σε 99 τυχαίες αθέατες (HR@10, AUC).
"""

import argparse
from pathlib import Path

import numpy as np
import pandas as pd

from services.recommender import BOOKING_WEIGHT, MAX_RATING, VISIT_WEIGHT, BiasedMF

DEFAULT_PATH = (
    Path(__file__).resolve().parent.parent / "dataset" / "rel_event_csvs" / "event_interest.csv"
)
SAMPLED_NEGATIVES = 99
CUTOFF = 10


def load_ratings(path: Path) -> pd.DataFrame:
    """event_interest.csv → πίνακας implicit feedback με τα ΒΑΡΗ της εφαρμογής.

    Αντιστοίχιση με ό,τι βλέπει η εφαρμογή:
      - κάθε γραμμή = ο χρήστης είδε την εκδήλωση   → όπως μια επίσκεψη (βάρος 1)
      - interested = 1                               → όπως μια κράτηση  (+5)
      - not_interested = 1 → ρητό «όχι», που η εφαρμογή δεν έχει → βαθμολογία 0
    """
    raw = pd.read_csv(path)
    frame = raw.rename(columns={"user": "user_id", "event": "item_id"})

    rating = VISIT_WEIGHT + BOOKING_WEIGHT * frame["interested"]
    rating = rating.where(frame["not_interested"] == 0, 0.0).clip(upper=MAX_RATING)
    frame = frame.assign(rating=rating.astype(float))

    # Ένα ζεύγος χρήστη–εκδήλωσης μπορεί να εμφανίζεται πολλές φορές: κρατάμε
    # το ισχυρότερο σήμα.
    return frame.groupby(["user_id", "item_id"], as_index=False).agg(
        rating=("rating", "max"), interested=("interested", "max")
    )


def split(frame: pd.DataFrame, fraction: float, rng: np.random.Generator):
    mask = rng.random(len(frame)) < fraction
    return frame[~mask], frame[mask]


def auc(labels: np.ndarray, scores: np.ndarray) -> float:
    """Πιθανότητα μια θετική παρατήρηση να βαθμολογηθεί ψηλότερα από μια
    αρνητική (0,5 = τυχαία σειρά, 1 = τέλεια κατάταξη) — τύπος Mann–Whitney."""
    labels = labels.astype(bool)
    positives, negatives = int(labels.sum()), int((~labels).sum())
    if positives == 0 or negatives == 0:
        return float("nan")
    ranks = pd.Series(scores).rank(method="average").to_numpy()
    return float((ranks[labels].sum() - positives * (positives + 1) / 2) / (positives * negatives))


def shown_metrics(predict, test: pd.DataFrame) -> dict:
    """Ερώτημα 1: ζεύγη που υπάρχουν στο dataset (εκδηλώσεις που προβλήθηκαν)."""
    pred = np.array([predict(u, i) for u, i in zip(test["user_id"], test["item_id"])])
    truth = test["rating"].to_numpy()
    return {
        "RMSE": float(np.sqrt(np.mean((truth - pred) ** 2))),
        "MAE": float(np.mean(np.abs(truth - pred))),
        "AUC": auc(test["interested"].to_numpy(), pred),
    }


def build_ranking_tasks(ratings: pd.DataFrame, test: pd.DataFrame, rng: np.random.Generator) -> list:
    """Ερώτημα 2: για κάθε εκδήλωση ελέγχου που ενδιέφερε τον χρήστη, 99 τυχαίες
    εκδηλώσεις που ο χρήστης ΔΕΝ έχει δει πουθενά στο dataset.

    Τα ίδια σύνολα χρησιμοποιούνται για ΟΛΑ τα μοντέλα, ώστε η σύγκριση να είναι
    δίκαιη.
    """
    all_items = ratings["item_id"].unique()
    seen = ratings.groupby("user_id")["item_id"].agg(set).to_dict()
    positives = test[test["interested"] == 1]
    tasks = []
    for user, item in zip(positives["user_id"], positives["item_id"]):
        negatives = set()
        while len(negatives) < SAMPLED_NEGATIVES:
            candidate = all_items[rng.integers(len(all_items))]
            if candidate not in seen[user]:
                negatives.add(candidate)
        tasks.append((user, item, list(negatives)))
    return tasks


def ranking_metrics(predict, tasks: list, seed: int) -> dict:
    rng = np.random.default_rng(seed)
    hits, aucs = [], []
    for user, item, negatives in tasks:
        positive = predict(user, item)
        scores = np.array([predict(user, j) for j in negatives])
        above, ties = int(np.sum(scores > positive)), int(np.sum(scores == positive))
        # Ισοβαθμίες (π.χ. άγνωστες εκδηλώσεις με ίδιο σκορ): τυχαία θέση μεταξύ
        # τους — αλλιώς ένα μοντέλο που δίνει σε όλα το ίδιο σκορ θα φαινόταν
        # τέλειο ή άχρηστο ανάλογα με τον κανόνα.
        rank = 1 + above + int(rng.integers(0, ties + 1))
        hits.append(rank <= CUTOFF)
        aucs.append((np.sum(scores < positive) + 0.5 * ties) / len(scores))
    return {f"HR@{CUTOFF}": float(np.mean(hits)), "AUC αθέατων": float(np.mean(aucs))}


def cell(runs: list, key: str) -> str:
    values = [run[key] for run in runs]
    return f"{np.mean(values):.3f} ± {np.std(values):.3f}"


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--path", type=Path, default=DEFAULT_PATH)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()

    ratings = load_ratings(args.path)
    rng = np.random.default_rng(args.seed)

    # Τρία ΞΕΧΩΡΙΣΤΑ σύνολα. Οι υπερπαράμετροι επιλέγονται στο validation· το
    # test το βλέπει μόνο η τελική μέτρηση.
    train, test = split(ratings, 0.2, rng)
    fit_part, validation = split(train, 0.2, rng)

    users, events = ratings.user_id.nunique(), ratings.item_id.nunique()
    print("## Αξιολόγηση Biased MF — dataset e-class (event_interest.csv)\n")
    print(f"- Ζεύγη χρήστη–εκδήλωσης: {len(ratings)} ({users} χρήστες, {events} εκδηλώσεις)")
    print(f"- Πυκνότητα πίνακα: {100 * len(ratings) / (users * events):.3f}%")
    print(f"- Εκπαίδευση / επικύρωση / έλεγχος: {len(fit_part)} / {len(validation)} / {len(test)}")

    # --- 1. Ρύθμιση στο validation ------------------------------------------
    # Σε προηγούμενη εκτέλεση με λ ∈ {0.05, 0.1, 0.2} και k ∈ {0, 8, 16}, το λ και
    # το k=16 έναντι k=8 δεν άλλαζαν το αποτέλεσμα πάνω από 0.002 AUC· εδώ
    # κρατάμε το μικρότερο πλέγμα που δείχνει τις διαφορές που μετράνε.
    print("\n### Ρύθμιση υπερπαραμέτρων (σύνολο επικύρωσης, λ = 0.1)\n")
    print(f"| k | αρνητικά ανά θετικό | εποχές | AUC προβληθέντων | HR@{CUTOFF} αθέατων |")
    print("|---:|---:|---:|---:|---:|")
    validation_tasks = build_ranking_tasks(ratings, validation, np.random.default_rng(args.seed + 1))
    for k in (0, 8):
        for neg in (0.0, 1.0):
            for epochs in (5, 10, 20, 40):
                model = BiasedMF(n_factors=k, reg=0.1, n_epochs=epochs, negative_ratio=neg).fit(fit_part)
                shown = shown_metrics(model.predict, validation)
                ranked = ranking_metrics(model.predict, validation_tasks, args.seed)
                print(f"| {k} | {neg:g} | {epochs} | {shown['AUC']:.3f} | {ranked[f'HR@{CUTOFF}']:.3f} |")

    # --- 2. Τελική μέτρηση σε ΠΕΝΤΕ διαχωρισμούς -----------------------------
    defaults = BiasedMF()
    candidates = [
        ("Γενικός μέσος όρος μ", None),
        ("Μόνο biases (k=0), χωρίς αρνητικά, 5 εποχές", dict(n_factors=0, reg=0.1, n_epochs=5, negative_ratio=0.0)),
        ("Μόνο biases (k=0), με αρνητικά, 20 εποχές", dict(n_factors=0, reg=0.1, n_epochs=20, negative_ratio=1.0)),
        ("Biased MF, αρχικές προεπιλογές (k=8, λ=0.05, 60 εποχές, χωρίς αρνητικά)",
         dict(n_factors=8, reg=0.05, n_epochs=60, negative_ratio=0.0)),
        ("Biased MF k=8, χωρίς αρνητικά, 5 εποχές", dict(n_factors=8, reg=0.1, n_epochs=5, negative_ratio=0.0)),
        (f"**Biased MF, προεπιλογές εφαρμογής** (k={defaults.n_factors}, λ={defaults.reg}, "
         f"{defaults.n_epochs} εποχές, αρνητικά {defaults.negative_ratio:g})",
         dict(n_factors=defaults.n_factors, reg=defaults.reg, n_epochs=defaults.n_epochs,
              negative_ratio=defaults.negative_ratio)),
    ]

    seeds = [args.seed + offset for offset in range(5)]
    collected = {name: [] for name, _ in candidates}
    for seed in seeds:
        split_rng = np.random.default_rng(seed)
        tr, te = split(ratings, 0.2, split_rng)
        tasks = build_ranking_tasks(ratings, te, np.random.default_rng(seed + 1000))
        mu = float(tr["rating"].mean())
        for name, params in candidates:
            if params is None:
                predict = lambda u, i, mu=mu: mu
            else:
                predict = BiasedMF(**params).fit(tr).predict
            collected[name].append({**shown_metrics(predict, te), **ranking_metrics(predict, tasks, seed)})

    print(f"\n### Σύνολο ελέγχου (μέσος όρος ± τυπ. απόκλιση, {len(seeds)} διαχωρισμοί)\n")
    print(f"| Μοντέλο | RMSE | MAE | AUC προβληθέντων | HR@{CUTOFF} αθέατων | AUC αθέατων |")
    print("|---|---:|---:|---:|---:|---:|")
    for name, _ in candidates:
        runs = collected[name]
        print(f"| {name} | {cell(runs, 'RMSE')} | {cell(runs, 'MAE')} | {cell(runs, 'AUC')} "
              f"| {cell(runs, f'HR@{CUTOFF}')} | {cell(runs, 'AUC αθέατων')} |")
    print(f"\nΤυχαία κατάταξη: HR@{CUTOFF} ≈ {CUTOFF / (SAMPLED_NEGATIVES + 1):.2f}, AUC = 0.50.")


if __name__ == "__main__":
    main()
