-- Law Firm Database Setup

DROP DATABASE IF EXISTS law_firm;
CREATE DATABASE law_firm;
USE law_firm;

-- ============================================================
-- USERS TABLE (shared credentials for all roles)
-- ============================================================
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100) NOT NULL UNIQUE,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password      VARCHAR(255) NOT NULL,
    role          ENUM('client', 'lawyer', 'admin') NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ============================================================
-- CLIENTS TABLe
-- ============================================================
CREATE TABLE clients (
    client_id     INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT NOT NULL UNIQUE,
    phone         VARCHAR(20),
    address       VARCHAR(255),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- LAWYERS TABLE 
-- ============================================================
CREATE TABLE lawyers (
    lawyer_id       INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT NOT NULL UNIQUE,
    specialization  VARCHAR(100) NOT NULL,
    location        VARCHAR(100) NOT NULL,
    experience_years INT NOT NULL DEFAULT 0,
    consultation_fee DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    bio              TEXT,
    verification_doc VARCHAR(500) DEFAULT NULL,
    verification_status ENUM('Pending','Verified','Rejected') NOT NULL DEFAULT 'Pending',
    is_verified      TINYINT(1) NOT NULL DEFAULT 0,
    verified_by      INT DEFAULT NULL,
    verified_at      TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (verified_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- ============================================================
-- CASES TABLE 
-- ============================================================
CREATE TABLE cases (
    case_id       INT AUTO_INCREMENT PRIMARY KEY,
    client_id     INT NOT NULL,
    lawyer_id     INT DEFAULT NULL,
        title           VARCHAR(200) NOT NULL,
    description     TEXT,
    case_type       VARCHAR(100),
    opposing_party  VARCHAR(150) DEFAULT NULL,
    court_name      VARCHAR(200) DEFAULT NULL,
    case_number     VARCHAR(100) DEFAULT NULL,
    status          ENUM('Pending','Accepted','Rejected','In Progress','Waiting for Documents','Scheduled for Hearing','Closed','Won','Lost') 
                  NOT NULL DEFAULT 'Pending',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- CASE TASKS TABLE
CREATE TABLE case_tasks (
    task_id INT AUTO_INCREMENT PRIMARY KEY,
    case_id INT NOT NULL,
    lawyer_id INT NOT NULL,
    task_title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date DATE NOT NULL,
    status ENUM('Pending', 'Done') DEFAULT 'Pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- APPOINTMENTS TABLE
-- ============================================================
CREATE TABLE appointments (
    appointment_id  INT AUTO_INCREMENT PRIMARY KEY,
    case_id         INT NOT NULL,
    client_id       INT NOT NULL,
    lawyer_id       INT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    session_slot     TINYINT NOT NULL,
    status          ENUM('Pending','Confirmed','Rejected','Cancelled','Completed') NOT NULL DEFAULT 'Pending',
    notes           TEXT,
    created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (client_id) REFERENCES clients(client_id) ON DELETE CASCADE,
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- DOCUMENTS TABLE
-- ============================================================
CREATE TABLE documents (
    document_id   INT AUTO_INCREMENT PRIMARY KEY,
    case_id       INT NOT NULL,
    uploaded_by   INT NOT NULL,
    document_type ENUM('Contract','Evidence','Court Notice','Legal Form','Other') NOT NULL DEFAULT 'Other',
    file_name     VARCHAR(255) NOT NULL,
    file_path     VARCHAR(500) NOT NULL,
    file_size     INT DEFAULT 0,
    uploaded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (case_id) REFERENCES cases(case_id) ON DELETE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ============================================================
-- LAWYER AVAILABILITY TABLE
-- ============================================================
CREATE TABLE lawyer_availability (
    availability_id INT AUTO_INCREMENT PRIMARY KEY,
    lawyer_id       INT NOT NULL,
    day_of_week     ENUM('Saturday','Sunday','Monday','Tuesday','Wednesday','Thursday') NOT NULL,
    slot_1          TINYINT(1) NOT NULL DEFAULT 0, -- 8:00 AM - 9:20 AM
    slot_2          TINYINT(1) NOT NULL DEFAULT 0, -- 9:30 AM - 10:50 AM
    slot_3          TINYINT(1) NOT NULL DEFAULT 0, -- 11:00 AM - 12:20 PM
    slot_4          TINYINT(1) NOT NULL DEFAULT 0, -- 12:30 PM - 1:50 PM
    slot_5          TINYINT(1) NOT NULL DEFAULT 0, -- 2:00 PM - 3:20 PM
    slot_6          TINYINT(1) NOT NULL DEFAULT 0, -- 3:30 PM - 4:50 PM
    slot_7          TINYINT(1) NOT NULL DEFAULT 0, -- 5:00 PM - 6:20 PM
    FOREIGN KEY (lawyer_id) REFERENCES lawyers(lawyer_id) ON DELETE CASCADE,
    UNIQUE KEY (lawyer_id, day_of_week)
) ENGINE=InnoDB;

-- ============================================================
-- SAMPLE DATA
-- ============================================================

-- Admin account  (password: admin123)
INSERT INTO users (full_name, email, username, password, role) VALUES
('System Admin', 'admin@lawfirm.com', 'admin', '$2y$10$ZfoAD/bQ8spCOQBWrBUcC.Ej0zCH5aruFiA9gNEICBNN0UrBmc1A6', 'admin');

-- Client accounts (password: password123)
INSERT INTO users (full_name, email, username, password, role) VALUES
('John Doe',     'john@gmail.com',    'john_doe',    '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'client'),
('Ayesha Rahman','ayesha@gmail.com',  'ayesha_r',    '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'client'),
('Karim Uddin',  'karim@gmail.com',   'karim_u',     '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'client');

-- Lawyer accounts (password: password123)
INSERT INTO users (full_name, email, username, password, role) VALUES
('Sarah Khan',    'sarah@lawmail.com',   'sarah_khan',   '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'lawyer'),
('Rafiq Ahmed',   'rafiq@lawmail.com',   'rafiq_ahmed',  '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'lawyer'),
('Nadia Islam',   'nadia@lawmail.com',   'nadia_islam',  '$2y$10$BmfYrAeUWgKvS23AWNuTu.MsHaEwhotX6ptJneYIWzr6mySEUChFm', 'lawyer');

-- Client profiles
INSERT INTO clients (user_id, phone, address) VALUES
((SELECT user_id FROM users WHERE username = 'john_doe'),   '01711111111', 'Gulshan, Dhaka'),
((SELECT user_id FROM users WHERE username = 'ayesha_r'),   '01722222222', 'Dhanmondi, Dhaka'),
((SELECT user_id FROM users WHERE username = 'karim_u'),    '01733333333', 'Chittagong');

-- Lawyer profiles (all verified for demo purposes)
INSERT INTO lawyers (user_id, specialization, location, experience_years, consultation_fee, bio, verification_doc, verification_status, is_verified, verified_by, verified_at) VALUES
((SELECT user_id FROM users WHERE username = 'sarah_khan'),
 'Criminal Law', 'Dhaka', 12, 5000.00,
 'Experienced criminal defense attorney with 12 years of practice in the High Court.',
 NULL, 'Verified', 1, (SELECT user_id FROM users WHERE username = 'admin'), NOW()),

((SELECT user_id FROM users WHERE username = 'rafiq_ahmed'),
 'Corporate Law', 'Dhaka', 8, 7500.00,
 'Specializes in corporate mergers, acquisitions, and business compliance.',
 NULL, 'Verified', 1, (SELECT user_id FROM users WHERE username = 'admin'), NOW()),

((SELECT user_id FROM users WHERE username = 'nadia_islam'),
 'Family Law', 'Chittagong', 5, 3000.00,
 'Dedicated family law practitioner handling divorce, custody, and inheritance cases.',
 NULL, 'Verified', 1, (SELECT user_id FROM users WHERE username = 'admin'), NOW());

-- Weekly availability for the sample lawyers (so appointments can be booked right away)
INSERT INTO lawyer_availability (lawyer_id, day_of_week, slot_1, slot_2, slot_3, slot_4, slot_5, slot_6, slot_7) VALUES
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'sarah_khan'),  'Saturday',  1, 1, 1, 0, 1, 1, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'sarah_khan'),  'Sunday',    1, 1, 1, 0, 1, 1, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'sarah_khan'),  'Monday',    1, 1, 1, 0, 1, 1, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'rafiq_ahmed'), 'Sunday',    0, 1, 1, 1, 1, 0, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'rafiq_ahmed'), 'Tuesday',   0, 1, 1, 1, 1, 0, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'rafiq_ahmed'), 'Thursday',  0, 1, 1, 1, 1, 0, 0),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'nadia_islam'), 'Saturday',  0, 0, 1, 1, 1, 1, 1),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'nadia_islam'), 'Monday',    0, 0, 1, 1, 1, 1, 1),
((SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'nadia_islam'), 'Wednesday', 0, 0, 1, 1, 1, 1, 1);

-- Sample cases already accepted by a lawyer (so documents and appointments can be tried right away)
INSERT INTO cases (client_id, lawyer_id, title, description, case_type, status) VALUES
((SELECT client_id FROM clients c JOIN users u ON c.user_id = u.user_id WHERE u.username = 'john_doe'),
 (SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'sarah_khan'),
 'Property Dispute in Gulshan', 'Neighbour has built a wall on part of my plot and refuses to remove it.', 'Property Law', 'In Progress'),
((SELECT client_id FROM clients c JOIN users u ON c.user_id = u.user_id WHERE u.username = 'ayesha_r'),
 (SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'rafiq_ahmed'),
 'Supplier Contract Breach', 'A supplier stopped deliveries halfway through a signed one-year contract.', 'Corporate Law', 'Accepted'),
((SELECT client_id FROM clients c JOIN users u ON c.user_id = u.user_id WHERE u.username = 'karim_u'),
 (SELECT lawyer_id FROM lawyers l JOIN users u ON l.user_id = u.user_id WHERE u.username = 'nadia_islam'),
 'Inheritance Settlement', 'Dividing my late father''s property among the family.', 'Family Law', 'In Progress');
