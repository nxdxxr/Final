-- ========================================================
-- โครงงานระยะที่ 1: สคริปต์สร้างฐานข้อมูลและตาราง (schema.sql)
-- ระบบข้อมูลฟิตเนส (Fitness & Gym Management System)
-- รหัสนิสิต: 67160178 | Pno: 9
-- ========================================================

CREATE DATABASE IF NOT EXISTS fitness_db
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE fitness_db;

-- 1. ตารางฟิตเนส/สาขายิม (Resource หลัก: gyms)
CREATE TABLE IF NOT EXISTS gyms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    address VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    monthly_fee DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    open_time TIME NOT NULL DEFAULT '06:00:00',
    close_time TIME NOT NULL DEFAULT '22:00:00',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 2. ตารางเทรนเนอร์ (trainers)
CREATE TABLE IF NOT EXISTS trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gym_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    specialty VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (gym_id)
        REFERENCES gyms(id)
        ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 3. ตารางคลาสออกกำลังกาย (classes)
CREATE TABLE IF NOT EXISTS classes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gym_id INT NOT NULL,
    trainer_id INT NOT NULL,
    class_name VARCHAR(100) NOT NULL,
    schedule_time VARCHAR(100) NOT NULL,
    max_spots INT NOT NULL DEFAULT 20,
    available_spots INT NOT NULL DEFAULT 20,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (gym_id)
        REFERENCES gyms(id)
        ON DELETE CASCADE,

    FOREIGN KEY (trainer_id)
        REFERENCES trainers(id)
        ON DELETE CASCADE
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 4. ตารางสมาชิก (members)
CREATE TABLE IF NOT EXISTS members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    gym_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL,
    membership_status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (gym_id)
        REFERENCES gyms(id)
        ON DELETE RESTRICT
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. ตารางการจองคลาสออกกำลังกาย (class_bookings - Many-to-Many junction)
CREATE TABLE IF NOT EXISTS class_bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    member_id INT NOT NULL,
    class_id INT NOT NULL,
    booked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'confirmed',

    FOREIGN KEY (member_id)
        REFERENCES members(id)
        ON DELETE CASCADE,

    FOREIGN KEY (class_id)
        REFERENCES classes(id)
        ON DELETE CASCADE,

    UNIQUE KEY unique_member_class (member_id, class_id)
) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
