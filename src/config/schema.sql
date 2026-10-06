-- Run this once against your PostgreSQL database (e.g. Aiven's
-- `defaultdb`) to create the tables this phase needs. Later phases will
-- add more tables (events, news, notices, gallery, teachers, students,
-- payments) in the same style.
--
--   psql "postgresql://USER:PASSWORD@HOST:PORT/DBNAME?sslmode=require" \
--     -f backend/src/config/schema.sql

-- Shared trigger function: keeps updated_at current on every UPDATE,
-- since Postgres has no built-in "ON UPDATE CURRENT_TIMESTAMP" like MySQL.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'admin'
    CHECK (role IN ('admin', 'teacher', 'student', 'parent')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- 2026-09: allow admin-created Teacher / Principal / Staff accounts.
-- Idempotent — safe to re-run.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'teacher', 'principal', 'staff', 'student', 'parent'));

CREATE TABLE IF NOT EXISTS enquiries (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  email VARCHAR(255) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'read', 'responded')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_enquiries_updated_at ON enquiries;
CREATE TRIGGER trg_enquiries_updated_at
  BEFORE UPDATE ON enquiries
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries (created_at);

CREATE TABLE IF NOT EXISTS admissions (
  id SERIAL PRIMARY KEY,
  student_name VARCHAR(150) NOT NULL,
  date_of_birth DATE NOT NULL,
  grade_applied VARCHAR(50) NOT NULL,
  parent_name VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  message TEXT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'under_review', 'accepted', 'rejected')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_admissions_updated_at ON admissions;
CREATE TRIGGER trg_admissions_updated_at
  BEFORE UPDATE ON admissions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_admissions_status ON admissions (status);
CREATE INDEX IF NOT EXISTS idx_admissions_created_at ON admissions (created_at);

-- 2026-09: allow admin to deactivate staff accounts without deleting them.
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

-- 2026-09: Attendance feature — classes, students, teacher-class assignment, attendance records.
CREATE TABLE IF NOT EXISTS classes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL,
  section VARCHAR(10) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, section)
);

DROP TRIGGER IF EXISTS trg_classes_updated_at ON classes;
CREATE TRIGGER trg_classes_updated_at
  BEFORE UPDATE ON classes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS students (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  roll_number VARCHAR(20) NULL,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

DROP TRIGGER IF EXISTS trg_students_updated_at ON students;
CREATE TRIGGER trg_students_updated_at
  BEFORE UPDATE ON students
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_students_class_id ON students (class_id);

CREATE TABLE IF NOT EXISTS teacher_classes (
  id SERIAL PRIMARY KEY,
  teacher_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (teacher_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_teacher_classes_teacher_id ON teacher_classes (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_classes_class_id ON teacher_classes (class_id);

CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status VARCHAR(10) NOT NULL CHECK (status IN ('present', 'absent', 'late')),
  marked_by INTEGER NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (student_id, date)
);

DROP TRIGGER IF EXISTS trg_attendance_updated_at ON attendance;
CREATE TRIGGER trg_attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX IF NOT EXISTS idx_attendance_class_date ON attendance (class_id, date);

CREATE TABLE IF NOT EXISTS fees (
  id SERIAL PRIMARY KEY,
  student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  description VARCHAR(255) DEFAULT 'School Fee',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  razorpay_order_id VARCHAR(100),
  razorpay_payment_id VARCHAR(100),
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fees_student ON fees(student_id);

-- 2026-09: Parent dashboard fee-verification gate — students need
-- father_name + a unique admission_number to be looked up by parents.
ALTER TABLE students ADD COLUMN IF NOT EXISTS father_name VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS admission_number VARCHAR(30) UNIQUE;

-- Admission approval + class allocation workflow
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS assigned_class_id INTEGER REFERENCES classes(id);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS reviewed_by INTEGER REFERENCES users(id);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP;
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS student_id INTEGER REFERENCES students(id);
ALTER TABLE admissions ADD COLUMN IF NOT EXISTS reject_reason TEXT;


-- =====================================================================
-- Extras that were applied manually in the Aiven SQL editor and were
-- NOT in the original schema.sql. Inferred from the backend code.
-- All idempotent, safe to re-run.
-- =====================================================================

-- 'accountant' role is used by auth.service.js (ADMIN_CREATABLE_ROLES) and
-- the fee routes, but was missing from the CHECK constraint above.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('admin', 'teacher', 'principal', 'staff', 'accountant', 'student', 'parent'));

-- Admissions status: code uses 'approved' (original CHECK only allowed 'accepted',
-- which made Approve fail with a constraint error).
ALTER TABLE admissions DROP CONSTRAINT IF EXISTS admissions_status_check;
ALTER TABLE admissions ADD CONSTRAINT admissions_status_check
  CHECK (status IN ('pending', 'under_review', 'accepted', 'approved', 'rejected'));

-- Monthly fee model (principalFee / accountantFee / fee.service)
ALTER TABLE fees ADD COLUMN IF NOT EXISTS fee_month VARCHAR(7);      -- 'YYYY-MM'
ALTER TABLE fees ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20);  -- 'online' / 'cash' / ...
ALTER TABLE fees ADD COLUMN IF NOT EXISTS marked_by INTEGER REFERENCES users(id);
-- Needed by ON CONFLICT (student_id, fee_month) in the controllers
CREATE UNIQUE INDEX IF NOT EXISTS uq_fees_student_month ON fees (student_id, fee_month);
CREATE INDEX IF NOT EXISTS idx_fees_order ON fees (razorpay_order_id);

-- Principal sets monthly fee per class per academic year
CREATE TABLE IF NOT EXISTS class_fees (
  id SERIAL PRIMARY KEY,
  class_id INTEGER NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  academic_year VARCHAR(9) NOT NULL,           -- e.g. '2026-2027'
  amount NUMERIC(10,2) NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (class_id, academic_year)
);

-- Teacher / staff self check-in / check-out
CREATE TABLE IF NOT EXISTS staff_attendance (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  check_in_time TIMESTAMP,
  check_out_time TIMESTAMP,
  status VARCHAR(20) NOT NULL DEFAULT 'half_day'
    CHECK (status IN ('full_day', 'half_day', 'absent')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_id, date)
);

-- Announcements (admin sends, parents/students get push)
CREATE TABLE IF NOT EXISTS announcements (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_announcements_created_at ON announcements (created_at);

-- Web Push subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  keys_p256dh TEXT NOT NULL,
  keys_auth TEXT NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
