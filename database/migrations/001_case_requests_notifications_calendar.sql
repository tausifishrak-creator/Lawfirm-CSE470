-- Adds the tables for case-request notifications and the availability calendar
-- to an EXISTING law_firm database, without deleting any data.
-- Run this once if you already imported law_firm.sql before this update.
-- (A fresh import of law_firm.sql already includes these tables.)

USE law_firm;

-- ============================================================
-- AVAILABILITY OVERRIDES (a lawyer opens or closes one slot on one specific date)
-- Weekly hours come from lawyer_availability; a row here wins for that date.
-- ============================================================
CREATE TABLE IF NOT EXISTS availability_overrides (
    lawyer_id     INT NOT NULL,
    override_date DATE NOT NULL,
    session_slot  TINYINT NOT NULL,
    is_available  TINYINT(1) NOT NULL,
    PRIMARY KEY (lawyer_id, override_date, session_slot),
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- NOTIFICATIONS TABLE
-- `link` is the page the notification opens, e.g. /cases?tab=pending
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    notification_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL,
    message         VARCHAR(255) NOT NULL,
    link            VARCHAR(255) DEFAULT NULL,
    is_read         TINYINT(1) NOT NULL DEFAULT 0,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_notifications_user (user_id, is_read)
) ENGINE=InnoDB;
