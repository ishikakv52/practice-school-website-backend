-- Run this once against your MySQL database to create the tables this
-- phase needs. Later phases will add more tables (events, news, notices,
-- gallery, teachers, students, users, payments) in the same style.
--
--   mysql -u root -p school_website < backend/src/config/schema.sql

CREATE DATABASE IF NOT EXISTS school_website
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE school_website;

CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('admin', 'teacher', 'student', 'parent') NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS enquiries (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status ENUM('new', 'read', 'responded') NOT NULL DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_enquiries_status (status),
  INDEX idx_enquiries_created_at (created_at)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS admissions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NOT NULL,
  grade_applied VARCHAR(50) NOT NULL,
  parent_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NULL,
  status ENUM('pending', 'under_review', 'accepted', 'rejected')
    NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_admissions_status (status),
  INDEX idx_admissions_created_at (created_at)
) ENGINE=InnoDB;
