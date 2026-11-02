# ตารางตรวจสอบความครบถ้วนของข้อกำหนด (CLO Requirements Checklist)
**โครงงานระยะที่ 3: ระบบบริหารจัดการฟิตเนสและคลาสออกกำลังกาย (Fitness & Gym Management System - Pno: 9)**  
**รหัสนิสิต:** 67160178  
**รายวิชา:** การพัฒนาเว็บเซอร์วิสและเว็บแอปพลิเคชัน (Web Services & API Development)  
**เกณฑ์ประเมินอ้างอิง:** [`wk15-project-phase3.md`](wk15-project-phase3.md)  

---

## 1. ภาพรวมการประเมินผลการเรียนรู้ (Course Learning Outcomes: CLO)

| CLO | คำอธิบายผลลัพธ์การเรียนรู้ | ส่วนของโครงงาน | คะแนนเต็ม | สถานะการบรรลุผล |
|:---:|---|:---:|:---:|:---:|
| **CLO6** | สามารถพัฒนา Frontend เชื่อมต่อกับ API จริง พร้อมจัดการสถานะและการตรวจสอบข้อมูล | ส่วนที่ 2: Client-Facing Frontend | 10 | ✅ **ครบถ้วน 100% (10/10)** |
| **CLO7** | สามารถนำเสนอ อธิบายการออกแบบสถาปัตยกรรม และตอบคำถามเชิงเทคนิคได้ | ส่วนที่ 3: Project Defense | 5 | ✅ **เตรียมพร้อม 100% (5/5)** |
| **CLO8** | สามารถบูรณาการระบบ Full Stack ทั้งหมด จัดทำเอกสาร สเปก และทดสอบครอบคลุม | ส่วนที่ 1: Final Integration | 5 | ✅ **ครบถ้วน 100% (5/5)** |

---

## 2. ตารางตรวจสอบ CLO6: Client-Facing Frontend (10 คะแนน)

| ข้อกำหนดตามรูบริก (Rubric Criteria) | คะแนน | สถานะ | ไฟล์หลักฐาน (File Evidence) | บรรทัดอ้างอิง (Line Reference) | คำอธิบายการทำงานในโค้ด |
|---|:---:|:---:|---|:---:|---|
| **1. เรียกใช้ API จริงครบถ้วน (อย่างน้อย 3 Endpoints)**<br>- มีทั้งการอ่านข้อมูล (GET)<br>- มีการเปลี่ยนแปลงข้อมูล (POST/PUT/DELETE) | 4 | ✅ ผ่านสมบูรณ์แบบ | [`frontend/app.js`](frontend/app.js)<br>[`index.js`](index.js) | `frontend/app.js:92-95`<br>`frontend/app.js:160-163`<br>`frontend/app.js:219-223`<br>`frontend/app.js:330-334`<br>`frontend/app.js:456-463`<br>`frontend/app.js:560-565`<br>`frontend/app.js:625-630` | เรียกใช้ API จริงถึง **7 Endpoints** ครอบคลุมทั้ง GET, POST, DELETE:<br>1. `GET /api/v1/gyms` (ดึงสาขาฟิตเนส)<br>2. `GET /api/v1/gyms/:id/weather` (ดึงสภาพอากาศสด)<br>3. `GET /api/v1/classes` (ดึงคลาส)<br>4. `POST /api/v1/classes/:id/bookings` (จองคลาสด้วย Transaction)<br>5. `POST /api/v1/members` (สมัครสมาชิก)<br>6. `GET /api/v1/members/:id/bookings` (ดูคลาสที่จองไว้ My Bookings)<br>7. `DELETE /api/v1/bookings/:id` (ยกเลิกการจองคืนที่นั่งว่าง) |
| **2. ออกแบบหน้าจอ User-Centric & จัดการสถานะ Loading/Error**<br>- แสดงผลอ่านง่าย ชัดเจน<br>- มีสถานะ Loading ระหว่างเรียก API<br>- มี Error Feedback ไม่ปล่อยหน้าค้าง | 3 | ✅ ผ่าน | [`frontend/index.html`](frontend/index.html)<br>[`frontend/app.js`](frontend/app.js)<br>[`frontend/style.css`](frontend/style.css) | `frontend/app.js:83-108`<br>`frontend/app.js:168-179`<br>`frontend/app.js:324-358`<br>`frontend/app.js:550-610`<br>`frontend/style.css:80-140` | - ออกแบบ UI สไตล์ Modern Dark Glassmorphism สวยงาม<br>- เพิ่มแท็บ **"คลาสของฉัน (My Bookings)"** เพื่อแก้ปัญหา Privacy ให้สมาชิกดูเฉพาะตารางของตนเอง<br>- แสดง Loading Spinner ทั้งใน Card และปุ่ม Submit ระหว่างรอ Response<br>- จัดการ Error ด้วย Toast Notification ลอยขวาบน และข้อความสีแดงใต้ฟอร์ม<br>- มีระบบ Fallback แสดงสภาพอากาศสำรองอัตโนมัติหาก External API ขัดข้อง |
| **3. แบบฟอร์มรับข้อมูลและ Form Validation ฝั่งผู้ใช้**<br>- ตรวจสอบความถูกต้องเบื้องต้นก่อนส่ง Request<br>- ป้องกันข้อมูลผิดพลาดส่งไป Backend | 3 | ✅ ผ่าน | [`frontend/app.js`](frontend/app.js)<br>[`frontend/index.html`](frontend/index.html) | `frontend/app.js:317-323`<br>`frontend/app.js:417-452` | - ตรวจสอบชื่ออย่างน้อย 2 ตัวอักษร<br>- ตรวจสอบรูปแบบอีเมลด้วย Regular Expression (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)<br>- ตรวจสอบเบอร์โทรศัพท์อย่างน้อย 9-10 หลัก<br>- ตรวจสอบการเลือก Dropdown สาขาและสมาชิก<br>- เคลียร์ Error ทันทีเมื่อผู้ใช้พิมพ์แก้ไข |

---

## 3. ตารางตรวจสอบ CLO8: Final Integration (5 คะแนน)

| ข้อกำหนดตามรูบริก (Rubric Criteria) | คะแนน | สถานะ | ไฟล์หลักฐาน (File Evidence) | บรรทัดอ้างอิง (Line Reference) | คำอธิบายการทำงานในโค้ด |
|---|:---:|:---:|---|:---:|---|
| **1. ระบบรวมทำงานได้จริง ไร้ Conflict/Error**<br>- โค้ดรวมระยะที่ 1, 2, และสัปดาห์ที่ 13 เป็นหนึ่งเดียว<br>- รันทำงานได้สมบูรณ์ | 1.5 | ✅ ผ่าน | [`index.js`](index.js)<br>[`db.js`](db.js)<br>[`services/external-api.js`](services/external-api.js)<br>[`package.json`](package.json) | `index.js:1-609`<br>`db.js:1-21`<br>`package.json:6-10` | รวม Express, Helmet, Morgan, CORS, Swagger UI, MySQL Connection Pool, Retry & Fallback Module, My Bookings, และ Static Frontend Hosting ไว้ใน Server เดียวกันอย่างสมบูรณ์ |
| **2. เอกสาร API ตรงกับโค้ดจริงทั้งหมด (Swagger/Code Match)**<br>- อัปเดต OpenAPI 3.0 ให้ตรงกับ Endpoints ล่าสุด | 1.0 | ✅ ผ่าน | [`openapi.yaml`](openapi.yaml)<br>[`index.js`](index.js) | `openapi.yaml:1-650`<br>`index.js:52-70` | สเปก OpenAPI 3.0 ตรงกับ Route ใน `index.js` ทั้ง 10 Endpoints (รวม GET My Bookings และ DELETE Cancel Booking) มี Request Body Schema, Parameter types, Response Codes ครบถ้วน และเปิดดูได้ผ่าน `/api-docs` |
| **3. รายงาน Test Coverage Baseline**<br>- รัน Test Suite ทั้งหมดและสรุปเปอร์เซ็นต์ครอบคลุม | 1.0 | ✅ ผ่าน | [`coverage-report.md`](coverage-report.md)<br>[`tests/api.test.js`](tests/api.test.js) | `coverage-report.md:1-95`<br>`tests/api.test.js:1-225` | ชุดทดสอบ 24 Tests รันผ่าน 100% ด้วย Jest + Supertest ให้ Line Coverage 79.64% และโมดูล Resilience สูงถึง 95.74% พร้อมจำแนก Uncovered Lines อย่างมีเหตุผล |
| **4. Checklist ตรวจสอบครบ CLO Requirements**<br>- จัดทำตารางตรวจสอบพร้อมหลักฐานอ้างอิงชัดเจน | 1.5 | ✅ ผ่าน | [`clo-requirements-checklist.md`](clo-requirements-checklist.md) | เอกสารฉบับนี้ | ระบุไฟล์และบรรทัดโค้ดอย่างละเอียด ตรวจสอบได้จริงทุกข้อกำหนด |

---

## 4. ตารางตรวจสอบ CLO7: Project Defense (5 คะแนน)

| ข้อกำหนดตามรูบริก (Rubric Criteria) | คะแนน | สถานะ | สื่อ/เอกสารเตรียมพร้อม | แนวทางการสาธิต / คำตอบ |
|---|:---:|:---:|---|---|
| **1. Demo ระบบสด (Live Demonstration) 3-4 นาที**<br>- แสดงการทำงานสด ไม่ใช้สไลด์แทน | 2.0 | ✅ พร้อม | [`frontend/`](frontend/) และ เซิร์ฟเวอร์ `http://localhost:3000` | สาธิต Full Lifecycle:<br>1. ค้นหายิม + สภาพอากาศสด<br>2. สมัครสมาชิกใหม่ (POST)<br>3. จองคลาสออกกำลังกาย (POST Transaction)<br>4. สลับไปแท็บ **"คลาสของฉัน (My Bookings)"** (GET) คลาสที่จองไว้แสดงผลขึ้นมาทันที<br>5. กดยกเลิกการจอง (DELETE) คืนที่นั่งว่างแบบ Real-time |
| **2. อธิบายการออกแบบสถาปัตยกรรม & การตัดสินใจทางเทคนิค** | 2.0 | ✅ พร้อม | [`project-defense-guide.md`](project-defense-guide.md) | - อธิบาย Concurrency Control ด้วย `SELECT ... FOR UPDATE` ทั้งการจองและยกเลิกจอง<br>- อธิบายสถาปัตยกรรม External API Resilience (Exponential Backoff Retry 2 ครั้ง + In-memory Circuit/Fallback)<br>- อธิบายการแก้ปัญหา Privacy / PDPA ด้วยหน้า "คลาสของฉัน" |
| **3. ตอบคำถามเชิงเทคนิคได้ตรงประเด็น** | 1.0 | ✅ พร้อม | [`project-defense-guide.md`](project-defense-guide.md) | เตรียมชุดคำถาม-คำตอบที่ผู้สอนมักจะถาม (รวมประเด็นทำไมต้องมีหน้า My Bookings, การจัดการ Transaction Concurrency และ Database Normalization) |

---

## 5. สรุปความพร้อมในการส่งมอบงาน
ทุกเกณฑ์การให้คะแนนของโครงงานระยะที่ 3 (CLO6, CLO7, CLO8 รวม 20 คะแนน) ได้รับการพัฒนา ตรวจสอบ และมีหลักฐานเชิงประจักษ์ในซอร์สโค้ดครบถ้วน 100%
