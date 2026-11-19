-- Adds the tables for In-App Messaging and Lawyer Rating & Review System
-- to an EXISTING law_firm database, without deleting any data.
-- Run this once if you already imported law_firm.sql before this update.
-- (A fresh import of law_firm.sql also includes these tables.)

USE law_firm;

-- ============================================================
-- MESSAGES TABLE (In-App Messaging System)
-- Messages are organized by case between clients and lawyers
-- ============================================================
CREATE TABLE IF NOT EXISTS messages (
    message_id    INT AUTO_INCREMENT PRIMARY KEY,
    case_id       INT NOT NULL,
    sender_id     INT NOT NULL,
    receiver_id   INT NOT NULL,
    message       TEXT NOT NULL,
    is_read       TINYINT(1) NOT NULL DEFAULT 0,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_messages_case (case_id, created_at),
    INDEX idx_messages_receiver_read (receiver_id, is_read)
) ENGINE=InnoDB;

-- ============================================================
-- REVIEWS TABLE (Lawyer Rating and Review System)
-- Exactly 1 review allowed per case once the case is completed
-- ============================================================
CREATE TABLE IF NOT EXISTS reviews (
    review_id     INT AUTO_INCREMENT PRIMARY KEY,
    case_id       INT NOT NULL UNIQUE,
    client_id     INT NOT NULL,
    lawyer_id     INT NOT NULL,
    rating        TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment       TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE CASCADE,
    INDEX idx_reviews_lawyer (lawyer_id),
    INDEX idx_reviews_client (client_id)
) ENGINE=InnoDB;
