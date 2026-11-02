-- ========================================================
-- โครงงานระยะที่ 1: ข้อมูลตัวอย่างเริ่มต้น (seed.sql)
-- ระบบข้อมูลฟิตเนส (Fitness & Gym Management System)
-- รหัสนิสิต: 67160178 | Pno: 9
-- ========================================================

USE fitness_db;

-- ปิด FOREIGN_KEY_CHECKS ชั่วคราวเพื่อความสะอาดในการ seed ซ้ำ
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE class_bookings;
TRUNCATE TABLE members;
TRUNCATE TABLE classes;
TRUNCATE TABLE trainers;
TRUNCATE TABLE gyms;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. เพิ่มข้อมูลตัวอย่างตาราง gyms (สาขาฟิตเนส) อย่างน้อย 4 สาขา
INSERT INTO gyms (id, name, address, phone, monthly_fee, open_time, close_time) VALUES
(1, 'FitZone สยามสแควร์', '999 ถนนพระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330', '02-111-2233', 1590.00, '06:00:00', '22:00:00'),
(2, 'IronGym ลาดพร้าว', '123/45 ถนนลาดพร้าว แขวงจอมพล เขตจตุจักร กรุงเทพฯ 10900', '02-222-3344', 1290.00, '05:30:00', '23:00:00'),
(3, 'ActiveLife อารีย์', '50 ซอยพหลโยธิน 7 แขวงพญาไท เขตพญาไท กรุงเทพฯ 10400', '02-333-4455', 1890.00, '06:00:00', '22:30:00'),
(4, 'PeakPerformance ทองหล่อ', '88 ซอยสุขุมวิท 55 แขวงคลองตันเหนือ เขตวัฒนา กรุงเทพฯ 10110', '02-444-5566', 2490.00, '06:00:00', '24:00:00');

-- 2. เพิ่มข้อมูลตัวอย่างตาราง trainers (เทรนเนอร์)
INSERT INTO trainers (id, gym_id, name, specialty, phone) VALUES
(1, 1, 'โค้ชก้อง ทศพล', 'Strength & Conditioning', '081-234-5671'),
(2, 1, 'โค้ชฟ้า นลินี', 'Yoga & Pilates', '082-345-6782'),
(3, 2, 'โค้ชแชมป์ ธีรเดช', 'Weight Training & Bodybuilding', '083-456-7893'),
(4, 3, 'โค้ชเบนซ์ อมร', 'HIIT & Functional Training', '084-567-8904');

-- 3. เพิ่มข้อมูลตัวอย่างตาราง classes (คลาสออกกำลังกาย)
INSERT INTO classes (id, gym_id, trainer_id, class_name, schedule_time, max_spots, available_spots) VALUES
(1, 1, 1, 'Power Kettlebell Circuit', 'จันทร์และพุธ 18:00 - 19:00 น.', 15, 14),
(2, 1, 2, 'Vinyasa Flow Yoga', 'อังคารและพฤหัสบดี 07:00 - 08:00 น.', 20, 19),
(3, 2, 3, 'Heavy Metal Deadlift Clinic', 'เสาร์ 10:00 - 12:00 น.', 12, 11),
(4, 3, 4, 'Tabata Cardio Blast', 'ศุกร์ 17:30 - 18:30 น.', 25, 24);

-- 4. เพิ่มข้อมูลตัวอย่างตาราง members (สมาชิกฟิตเนส)
INSERT INTO members (id, gym_id, name, email, phone, membership_status) VALUES
(1, 1, 'นายสมศักดิ์ สุขภาพดี', 'somsak@example.com', '089-111-0001', 'active'),
(2, 1, 'น.ส.วิภาวรรณ ฟิตเนส', 'wipawan@example.com', '089-222-0002', 'active'),
(3, 2, 'นายธนกฤต แข็งแรง', 'thanakrit@example.com', '089-333-0003', 'active'),
(4, 3, 'น.ส.แพรวา ออกกำลัง', 'praewa@example.com', '089-444-0004', 'active');

-- 5. เพิ่มข้อมูลตัวอย่างตาราง class_bookings (การจองคลาส)
INSERT INTO class_bookings (id, member_id, class_id, status) VALUES
(1, 1, 1, 'confirmed'),
(2, 2, 2, 'confirmed'),
(3, 3, 3, 'confirmed'),
(4, 4, 4, 'confirmed');
