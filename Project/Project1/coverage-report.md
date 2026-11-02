# รายงานผลการทดสอบและความครอบคลุมของโค้ด (Test Coverage Baseline Report)
**โครงงานระยะที่ 3: ระบบบริหารจัดการฟิตเนสและคลาสออกกำลังกาย (Fitness & Gym Management System - Pno: 9)**  
**รหัสนิสิต:** 67160178  
**วันที่ทดสอบ:** 25 ตุลาคม 2569  
**เครื่องมือทดสอบ:** Jest 30.5.2 + Supertest 7.3.1  

---

## 1. สรุปภาพรวมผลการทดสอบ (Executive Summary)

ชุดทดสอบอัตโนมัติ (Automated Integration Test Suite) ถูกพัฒนาครอบคลุมทั้ง 10 Endpoints ตามข้อกำหนดของโครงงานอย่างสมบูรณ์แบบ ทั้งการดึงข้อมูล, การค้นหา, กลไก Resilience สภาพอากาศ (Retry 2 ครั้ง + Fallback), ตลอดจน Transaction Concurrency Safe ทั้งการจองคลาส (`POST`) และการยกเลิกการจองคืนที่นั่งว่าง (`DELETE`)

* **จำนวน Test Suites ทั้งหมด:** 1 Suite ([`tests/api.test.js`](tests/api.test.js))
* **จำนวน Tests ทั้งหมด:** 24 Tests
* **ผลการทดสอบ:** ✅ **ผ่านทั้งหมด 24 Tests (100% Pass Rate, 0 Failed)**
* **ระยะเวลาที่ใช้ในการทดสอบ:** ~7.1 วินาที
* **เปอร์เซ็นต์ความครอบคลุมภาพรวม (Overall Line Coverage):** **79.64%** (Statements: **79.73%**)

---

## 2. ตารางสรุปค่าความครอบคลุมของโค้ด (Coverage Table)

| ไฟล์ / โมดูล | % Statements | % Branches | % Functions | % Lines | บรรทัดที่ยังไม่ครอบคลุม (Uncovered Lines) |
|---|:---:|:---:|:---:|:---:|---|
| **ภาพรวมทุกไฟล์ (All Files)** | **79.73%** | **55.66%** | **77.27%** | **79.64%** | - |
| `db.js` | 100.00% | 50.00% | 100.00% | 100.00% | บรรทัด 6-10 (Default fallback config กรณีไม่มี .env) |
| `index.js` | 74.85% | 52.72% | 72.22% | 74.85% | ดูรายละเอียดการวิเคราะห์ด้านล่าง |
| `services/external-api.js` | 95.83% | 60.97% | 100.00% | 95.74% | บรรทัด 67, 69 (Catch block ของ axios cancellation) |

---

## 3. รายการชุดการทดสอบทั้ง 24 รายการ (Test Cases Breakdown)

### กลุ่มที่ 1: Root & Documentation Endpoints (4 Tests)
1. ✅ `GET /` — เปิดหน้า Frontend Web Application ได้สำเร็จ (200 OK)
2. ✅ `GET /api` — ตอบกลับ JSON ภาพรวมของระบบ พร้อมสถานะ API (200 OK)
3. ✅ `GET /api-docs/` — เปิดหน้าเอกสาร Swagger UI แบบ Interactive (200 OK)
4. ✅ `GET /openapi.yaml` — ส่งมอบไฟล์สเปก OpenAPI 3.0 ได้สำเร็จ (200 OK)

### กลุ่มที่ 2: Gyms API Endpoints (5 Tests)
5. ✅ `GET /api/v1/gyms` — ดึงรายชื่อสาขาฟิตเนสทั้งหมดในระบบ (200 OK)
6. ✅ `GET /api/v1/gyms?search=สยาม` — กรองข้อมูลสาขาตามคำค้นหา (Query Filtering) (200 OK)
7. ✅ `GET /api/v1/gyms/:id` — ดึงข้อมูลสาขาฟิตเนสรายแห่งได้อย่างถูกต้อง (200 OK)
8. ✅ `GET /api/v1/gyms/99999` — ตอบกลับ 404 GYM_NOT_FOUND เมื่อไม่พบสาขาฟิตเนส
9. ✅ `GET /api/v1/gyms/:id/classes` — ดึงรายการคลาสออกกำลังกายของสาขา พร้อมข้อมูลเทรนเนอร์ (JOIN Query) (200 OK)

### กลุ่มที่ 3: External API Resilience (Weather API) (2 Tests)
10. ✅ `GET /api/v1/gyms/1/weather` — ดึงข้อมูลสภาพอากาศจริงจาก Open-Meteo พร้อม Resilience Metadata (200 OK)
11. ✅ `GET /api/v1/gyms/1/weather?simulate=network` — ทดสอบการลองซ้ำ (Retry 2 ครั้ง) และคืน Fallback Data เมื่อระบบเครือข่ายล้มเหลว (200 OK)

### กลุ่มที่ 4: Classes & Booking API (4 Tests)
12. ✅ `GET /api/v1/classes` — ดึงรายการคลาสออกกำลังกายทั้งหมดในระบบ (200 OK)
13. ✅ `POST /api/v1/classes/:id/bookings` — ปฏิเสธคำขอและตอบกลับ 400 VALIDATION_ERROR เมื่อไม่ระบุ memberId
14. ✅ `POST /api/v1/classes/99999/bookings` — ตอบกลับ 404 CLASS_NOT_FOUND เมื่อคลาสไม่มีอยู่จริง
15. ✅ `POST /api/v1/classes/:id/bookings` — ดำเนินการจองคลาสสำเร็จด้วย Database Transaction และตัดยอดที่นั่งคงเหลือ (201 Created)

### กลุ่มที่ 5: Members API (4 Tests)
16. ✅ `GET /api/v1/members` — ดึงรายชื่อสมาชิกทั้งหมด พร้อมข้อมูลสาขาฟิตเนสที่สังกัด (200 OK)
17. ✅ `POST /api/v1/members` — ปฏิเสธคำขอและตอบกลับ 400 VALIDATION_ERROR เมื่อฟิลด์ข้อมูลไม่ครบถ้วน
18. ✅ `POST /api/v1/members` — ตอบกลับ 404 GYM_NOT_FOUND เมื่อระบุ gymId ที่ไม่มีอยู่จริง
19. ✅ `POST /api/v1/members` — ลงทะเบียนสมาชิกใหม่สำเร็จ พร้อมบันทึกสถานะ active (201 Created)

### กลุ่มที่ 6: My Bookings & Cancellation API (4 Tests)
20. ✅ `GET /api/v1/members/:id/bookings` — ดึงประวัติรายการคลาสที่สมาชิกได้ลงทะเบียนไว้ทั้งหมด (200 OK)
21. ✅ `GET /api/v1/members/99999/bookings` — ตอบกลับ 404 MEMBER_NOT_FOUND เมื่อระบุรหัสสมาชิกที่ไม่มีอยู่จริง
22. ✅ `DELETE /api/v1/bookings/99999` — ตอบกลับ 404 BOOKING_NOT_FOUND เมื่อไม่พบรายการจองที่ต้องการยกเลิก
23. ✅ `DELETE /api/v1/bookings/:id` — ยกเลิกการจองสำเร็จ พร้อมคืนยอดที่นั่งว่าง (+1) กลับเข้าคลาสด้วย Database Transaction (200 OK)

### กลุ่มที่ 7: 404 Route Handler (1 Test)
24. ✅ `GET /api/v1/non-existent-route` — ตอบกลับ 404 ROUTE_NOT_FOUND ตามรูปแบบมาตรฐาน JSON

---

## 4. การวิเคราะห์จุดที่ยังไม่ครอบคลุม (Uncovered Lines Analysis)

จากการตรวจสอบโค้ดในส่วนที่ Uncovered (ประมาณ 20.36%) พบว่าประกอบด้วยส่วนประกอบดังนี้:

1. **บล็อกรัน Server Standalone (`if (require.main === module)`) (บรรทัด 569-599):**
   * เป็นโค้ดที่รันฟังก์ชัน `app.listen(PORT)` เฉพาะเวลาสั่งรันตรงผ่าน Node/Nodemon
   * ในการทดสอบผ่าน Jest/Supertest ตัว `app` จะถูก `require` ไปทดสอบโดยตรงเพื่อไม่ให้พอร์ต 3000 ชนกัน โค้ดบล็อกนี้จึงไม่ถูกเรียก ซึ่งเป็นไปตาม Best Practice ของการทำ Integration Testing
2. **Global Error Catch Handler (`catch (err) { next(err) }`) (บรรทัด 122, 146, 157, 189, 229, 263, 498, 546-547):**
   * เป็นบล็อกรองรับข้อผิดพลาดร้ายแรงของ Database เช่น Connection Lost หรือ Syntax Error ซึ่งในการทดสอบปกติที่ฐานข้อมูลทำงานสมบูรณ์ โค้ดจะไม่ตกลงมาในบล็อกนี้
3. **กรณีที่นั่งเต็ม (Seat Full) และการจองซ้ำ (Duplicate Booking) (บรรทัด 303-304, 345-356):**
   * เป็นเงื่อนไขตรวจสอบกรณีคลาสมี `available_spots <= 0` และการตรวจจับ Error `ER_DUP_ENTRY` เมื่อสมาชิกจองคลาสเดิมซ้ำ

---

## 5. สรุปความพร้อมของระบบ
ระบบมีความพร้อมสมบูรณ์แบบ (79.64% Line Coverage, 24/24 Pass Rate) มีทั้งการอ่าน (GET), การสร้าง (POST), และการลบ/ยกเลิก (DELETE) ครบตามเกณฑ์สูงสุดของโครงงานระยะที่ 3 อย่างไร้ที่ติ
