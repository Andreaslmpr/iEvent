-- =====================================================================
-- Migration 001 — event_categories: ένα-προς-πολλά  ➜  πολλά-προς-πολλά
-- =====================================================================
-- ΓΙΑΤΙ:
--   Το αρχικό dump είχε `event_categories.event_id NOT NULL`, δηλαδή κάθε
--   γραμμή κατηγορίας ανήκε σε ΜΙΑ εκδήλωση. Αυτό σημαίνει ότι για 50
--   συναυλίες θα είχαμε 50 ξεχωριστές γραμμές με category_name = 'Music'.
--   Αδύνατο να φιλτράρεις σωστά (API_CONTRACT.md §2.3 -> GET /events?category=Music)
--   και σπάει το Event DTO που θέλει "categories": ["Music", "Live Performance"].
--
--   Επιβάλλουμε τον σχεδιασμό του models.py: ο `event_categories` γίνεται
--   κατάλογος μοναδικών κατηγοριών και ο πίνακας-γέφυρα `event_has_categories`
--   κρατά τη σχέση Ν:Μ.
--
-- ΑΣΦΑΛΕΙΑ: ο πίνακας `event_categories` είναι ΑΔΕΙΟΣ στο dump
-- (staywebapp_event_categories.sql — κανένα INSERT), οπότε δεν χάνονται δεδομένα.
--
-- ΕΚΤΕΛΕΣΗ:  mysql -u root -p staywebapp < db/migrations/001_event_categories_many_to_many.sql
-- =====================================================================

USE `staywebapp`;

START TRANSACTION;

-- --- 1. Ο κατάλογος κατηγοριών ξεκόβει από τη συγκεκριμένη εκδήλωση -------
ALTER TABLE `event_categories` DROP FOREIGN KEY `event_id_idx`;
ALTER TABLE `event_categories` DROP INDEX `event_id_idx`;
ALTER TABLE `event_categories` DROP COLUMN `event_id`;

-- Η κατηγορία «Music» πρέπει να υπάρχει ΜΙΑ φορά. Το UNIQUE είναι αυτό που
-- κάνει το get-or-create στο POST /api/events να μη γεμίσει διπλοεγγραφές.
ALTER TABLE `event_categories`
  ADD UNIQUE KEY `category_name_UNIQUE` (`category_name`);

-- --- 2. Ο πίνακας-γέφυρα (αντιστοιχεί στο event_has_categories του models.py)
CREATE TABLE IF NOT EXISTS `event_has_categories` (
  `event_id`    int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`event_id`, `category_id`),
  KEY `fk_ehc_category_idx` (`category_id`),
  CONSTRAINT `fk_ehc_event`
    FOREIGN KEY (`event_id`) REFERENCES `events` (`events_id`)
    ON DELETE CASCADE,
  CONSTRAINT `fk_ehc_category`
    FOREIGN KEY (`category_id`) REFERENCES `event_categories` (`event-categories_id`)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

COMMIT;
