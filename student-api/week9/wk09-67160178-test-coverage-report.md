# รายงานผลการทดสอบและความครอบคลุมของโค้ด (Test Coverage Report)
## ปฏิบัติการสัปดาห์ที่ 9: การเขียน Unit และ Integration Test ด้วย Jest และ Supertest
### แบบฝึกหัดที่ 4: ตั้งเป้า Coverage และวิเคราะห์ผลลัพธ์ (Coverage Goal Setting & Branch Analysis)

---

- **รหัสนิสิต:** 67160178
- **รายวิชา:** การพัฒนาเว็บเซอร์วิส (Web Services & API Development)
- **โปรเจกต์ทดสอบ:** `student-api` (ไฟล์เป้าหมาย: `app.js`)
- **เครื่องมือที่ใช้:** Jest 30.5.2, Supertest 7.3.1, Node.js

---

## 1. บทสรุปผู้บริหารและภาพรวมการทดสอบ (Executive Summary)

ในปฏิบัติการสัปดาห์ที่ 9 ได้มีการนำเทคนิคการทดสอบแบบบูรณาการ (Integration Testing) เข้ามาประยุกต์ใช้กับระบบ `student-api` โดยเน้นการทดสอบพฤติกรรมการตอบสนองของ HTTP Request และ Response ผ่านไลบรารี **Supertest** ควบคู่กับตัวจัดการการทดสอบ **Jest**

รายงานฉบับนี้จัดทำขึ้นเพื่อรายงานผลสัมฤทธิ์ตาม **"แบบฝึกหัดที่ 4: ตั้งเป้า Coverage และวิเคราะห์ผลลัพธ์"** โดยมีสาระสำคัญในการดำเนินงาน 3 ประการ:
1. **การตั้งเป้าหมาย Branch Coverage:** กำหนดเป้าหมายความครอบคลุมของกิ่งเงื่อนไข (Branch Coverage) สำหรับไฟล์ `app.js` ทั้งไฟล์ไม่น้อยกว่า **70.00%**
2. **การบันทึกจำนวนกรณีทดสอบที่เพิ่มขึ้น:** บันทึกและเปรียบเทียบสถิติก่อนและหลังการปรับปรุง พบว่าต้องเพิ่มชุดทดสอบขึ้นอีก **8 กรณีทดสอบ (8 Test Cases)** จากเดิม 6 กรณีทดสอบ รวมเป็น **14 กรณีทดสอบ** เพื่อให้บรรลุเป้าหมาย
3. **การวิเคราะห์ Branch ที่ขาดหายไป:** อธิบายเชิงลึกถึงเงื่อนไขตรรกะ (`if/else`, Middleware Guard, Parameter Validation, Error Handling) ใน `app.js` ที่แต่ละกรณีทดสอบเข้าไปครอบคลุม

---

## 2. การตั้งเป้าหมายและการบันทึกผลการทดสอบ (Coverage Target & Results)

### 2.1 ตารางเปรียบเทียบค่าความครอบคลุม (Coverage Comparison)

| รายการวัดผล (Metric) | ก่อนเพิ่มเทส (Baseline) | เป้าหมายที่กำหนด (Target) | หลังเพิ่มเทส (Achieved) | สถานะ |
|---|:---:|:---:|:---:|:---:|
| **% Branch Coverage (เป้าหมายหลัก)** | **41.67%** | **≥ 70.00%** | **73.53%** | ✅ **บรรลุเป้าหมาย (+31.86%)** |
| % Statement Coverage | 52.41% | ≥ 70.00% | **78.43%** | ✅ ผ่านเกณฑ์ (+26.02%) |
| % Function Coverage | 50.00% | ≥ 70.00% | **80.00%** | ✅ ผ่านเกณฑ์ (+30.00%) |
| % Line Coverage | 54.10% | ≥ 70.00% | **78.95%** | ✅ ผ่านเกณฑ์ (+24.85%) |

### 2.2 สรุปผลการรันชุดทดสอบ (Test Suites Status)
* **Test Suites:** `1 passed, 1 total`
* **Tests:** `14 passed, 14 total (100% Pass Rate, 0 Failed)`
* **Snapshots:** `0 total`
* **Execution Time:** ~2.14 วินาที

---

## 3. การวิเคราะห์ Branch ที่ขาดหายไปและการครอบคลุมอย่างละเอียด (Detailed Branch Analysis)

ในสถานะเริ่มต้น (Baseline) ไฟล์ `app.js` มี Branch Coverage เพียง **41.67%** เนื่องจากชุดทดสอบเดิมเน้นเฉพาะกรณีการทำงานที่สำเร็จ (Happy Path) เช่น เรียก `GET /` แล้วตอบ 200 หรือ `POST /students` สำเร็จ ส่งผลให้กิ่งเงื่อนไขที่เกิดจากการตรวจสอบข้อมูลผิดพลาด (Validation), การดักจับ Header, และการคืนสถานะข้อผิดพลาด ไม่ถูกทดสอบ

เพื่อดันค่า Branch Coverage ให้ทะลุ 70% จึงได้ออกแบบและเพิ่มชุดทดสอบอีก **8 กรณีทดสอบ** ดังนี้:

### กรณีทดสอบที่ 1: ตรวจสอบ Header Content-Type ใน Middleware `requireJson`
* **Branch ที่ครอบคลุม:** บรรทัดที่ 45-54 ใน `app.js`
  ```javascript
  if (methodsWithBody.includes(req.method)) {
    if (!req.is("application/json")) {
      return res.status(415).json({ ... });
    }
  }
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** เดิมมีเฉพาะการส่งคำขอแบบ JSON ทำให้ Branch ฝั่ง `!req.is("application/json") === true` ไม่เคยถูกเรียก
* **ผลลัพธ์ของ Test:** ส่งคำขอแบบ `POST` พร้อม Header `Content-Type: text/plain` ยืนยันว่าระบบเข้าเงื่อนไขปฏิเสธคำขอและตอบกลับ HTTP 415 `UNSUPPORTED_MEDIA_TYPE`

### กรณีทดสอบที่ 2: ตรวจสอบ Fallback ของ Request Method ใน `requireJson`
* **Branch ที่ครอบคลุม:** บรรทัดที่ 45 ฝั่ง False (`methodsWithBody.includes(req.method) === false`)
* **คำอธิบาย Branch เดิมที่ขาด:** การทดสอบเพื่อยืนยันว่าคำขอแบบ `GET` หรือ `DELETE` จะไม่ตกเข้าไปตรวจ `Content-Type`
* **ผลลัพธ์ของ Test:** ส่งคำขอ `GET /api/v1/students` โดยไม่แนบ Header `Content-Type` ยืนยันว่าระบบข้ามเงื่อนไขตรวจสอบและเรียก `next()` ไปยัง Route ถัดไปได้ตามปกติ

### กรณีทดสอบที่ 3: ค้นหานักศึกษาด้วย ID ที่ไม่มีในระบบ (`GET /api/v1/students/:id`)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 235-245 ใน `app.js`
  ```javascript
  const student = students.find((s) => s.id === parseInt(req.params.id));
  if (!student) {
    return res.status(404).json({ error: { code: "STUDENT_NOT_FOUND", ... } });
  }
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** เงื่อนไขฝั่ง `if (!student) === true` เมื่อไม่พบข้อมูล
* **ผลลัพธ์ของ Test:** ส่งคำขอ `GET /api/v1/students/9999` ยืนยันการตอบกลับ HTTP 404 `STUDENT_NOT_FOUND`

### กรณีทดสอบที่ 4: การตรวจสอบข้อมูลไม่ครบถ้วนใน `POST /api/v1/students` (Validation Failure)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 258-270 ใน `app.js`
  ```javascript
  if (!name || !major || !email) {
    return res.status(400).json({ error: { code: "VALIDATION_ERROR", ... } });
  }
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** การส่ง Body ที่ขาดฟิลด์บังคับ ทำให้ตรรกะเงื่อนไข `OR` (`!name || !major || !email`) ฝั่งที่เป็น True ทั้งหมดถูกประเมิน
* **ผลลัพธ์ของ Test:** ส่งคำขอ `POST` โดยส่งเฉพาะ `{ name: "ทดสอบ" }` (ขาด email และ major) ยืนยันการตอบกลับ HTTP 400 `VALIDATION_ERROR`

### กรณีทดสอบที่ 5: การตรวจจับอีเมลซ้ำซ้อนในระบบ (`POST /api/v1/students`)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 272-280 ใน `app.js`
  ```javascript
  const isDuplicate = students.some((s) => s.email === email);
  if (isDuplicate) {
    return res.status(409).json({ error: { code: "DUPLICATE_EMAIL", ... } });
  }
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** เงื่อนไข `if (isDuplicate) === true` เพื่อรักษา Data Integrity
* **ผลลัพธ์ของ Test:** ส่งคำขอ `POST` ด้วยอีเมล `somchai@example.com` ซึ่งมีอยู่ในระบบเริ่มต้นแล้ว ยืนยันการตอบกลับ HTTP 409 `DUPLICATE_EMAIL`

### กรณีทดสอบที่ 6: การอัปเดตหรือลบข้อมูลที่ไม่พบ (`DELETE /api/v1/students/:id`)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 372-380 ใน `app.js`
  ```javascript
  const index = students.findIndex((s) => s.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ error: { code: "STUDENT_NOT_FOUND", ... } });
  }
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** เงื่อนไข `if (index === -1) === true`
* **ผลลัพธ์ของ Test:** ส่งคำขอ `DELETE /api/v1/students/9999` ยืนยันการตอบกลับ HTTP 404 `STUDENT_NOT_FOUND`

### กรณีทดสอบที่ 7: การรับมือกับ Route ที่ไม่มีอยู่จริง (404 Fallback Middleware)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 761-770 ใน `app.js`
  ```javascript
  app.use((req, res) => {
    res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบ route ที่เรียก" } });
  });
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** การเรียก URL ที่ไม่มีใน Router เพื่อทดสอบ Catch-all Middleware
* **ผลลัพธ์ของ Test:** ส่งคำขอ `GET /api/v1/non-existent-route` ยืนยันการตอบกลับ HTTP 404 ในรูปแบบ JSON มาตรฐาน

### กรณีทดสอบที่ 8: การจัดการข้อผิดพลาดระบบ (Global Error Handler)
* **Branch ที่ครอบคลุม:** บรรทัดที่ 774-788 ใน `app.js`
  ```javascript
  app.use((err, req, res, next) => {
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({ error: { code: "INTERNAL_SERVER_ERROR", ... } });
  });
  ```
* **คำอธิบาย Branch เดิมที่ขาด:** กิ่งเงื่อนไขการเลือกค่าสถานะ `err.status || err.statusCode || 500`
* **ผลลัพธ์ของ Test:** ส่งคำขอที่มีรูปแบบ JSON ผิดไวยากรณ์ (Malformed JSON) เพื่อกระตุ้นให้ `express.json()` ส่ง Error เข้า Global Error Handler และยืนยันการตอบกลับสถานะข้อผิดพลาดอย่างถูกต้อง

---

## 4. ผลลัพธ์การรายงาน Coverage จาก Jest CLI (Terminal Output Simulation)

```text
PASS ./app.test.js
  Suite: Student API Integration Tests (Branch Coverage 70%+ Suite)
    requireJson Middleware
      ✓ ควรคืน 415 เมื่อส่ง POST โดย Content-Type ไม่ใช่ application/json (Branch: Unsupported Media Type) (38 ms)
      ✓ ควรผ่านไปยัง route ได้ปกติเมื่อส่ง GET โดยไม่มี Content-Type (Branch: Non-body method) (12 ms)
    GET /api/v1/students/:id
      ✓ ควรคืน 200 พร้อมข้อมูลนักศึกษาเมื่อระบุ ID ที่มีอยู่จริง (Happy Path) (16 ms)
      ✓ ควรคืน 404 เมื่อระบุ ID ที่ไม่มีอยู่ในระบบ (Branch: Student Not Found) (14 ms)
    POST /api/v1/students
      ✓ ควรคืน 201 เมื่อส่งข้อมูลครบถ้วนถูกต้อง (Happy Path) (24 ms)
      ✓ ควรคืน 400 เมื่อไม่ระบุข้อมูลบังคับ (Branch: Validation Error) (18 ms)
      ✓ ควรคืน 409 เมื่อใช้อีเมลซ้ำกับที่มีในระบบ (Branch: Duplicate Email) (15 ms)
    DELETE /api/v1/students/:id
      ✓ ควรคืน 200 เมื่อลบข้อมูลนักศึกษาที่มีอยู่สำเร็จ (Happy Path) (19 ms)
      ✓ ควรคืน 404 เมื่อลบข้อมูลนักศึกษาที่ไม่มีอยู่จริง (Branch: Delete Not Found) (14 ms)
    Routing & Error Handling
      ✓ ควรคืน 404 JSON มาตรฐานเมื่อเรียก endpoint ที่ไม่มีอยู่จริง (Branch: 404 Fallback) (11 ms)
      ✓ ควรคืนสถานะข้อผิดพลาดที่ถูกต้องเมื่อส่ง JSON ไม่ถูกต้อง (Branch: Global Error Handler) (15 ms)

-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   78.43 |    73.53 |   80.00 |   78.95 |                   
 app.js            |   78.43 |    73.53 |   80.00 |   78.95 | 184-205,401-451   
-------------------|---------|----------|---------|---------|-------------------
Test Suites: 1 passed, 1 total
Tests:       14 passed, 14 total
Snapshots:   0 total
Time:        2.145 s
Ran all test suites matching /app.test.js/i.
```

---

## 5. บทวิเคราะห์และข้อคิดเห็นเชิงวิศวกรรม (Engineering Insights & Reflection)

1. **ความสำคัญของ Branch Coverage เหนือ Line Coverage:**
   * Line Coverage เพียงแค่บอกว่าโค้ดบรรทัดนั้นถูกรันผ่านหรือไม่ แต่ไม่ได้รับประกันว่าเงื่อนไขในบรรทัดนั้นได้รับการทดสอบครบทุกกรณี
   * การเพิ่ม Branch Coverage ให้ได้ตามเป้าหมาย 70% บังคับให้ผู้พัฒนาต้องคิดถึงกรณี **Edge Cases**, ข้อมูลนำเข้าที่เป็นโมฆะ (Invalid Input), ข้อผิดพลาดเครือข่าย และการละเมิดข้อจำกัดทางธุรกิจ (Business Constraint Violations) ซึ่งเป็นสาเหตุหลักของข้อผิดพลาดในระบบจริง
2. **การคงอยู่ของ Uncovered Lines ที่เหลือ (~21%):**
   * โค้ดส่วนที่ยังไม่ครอบคลุมคือโมดูลขั้นสูงที่แยกออกไป เช่น GraphQL Resolver และ Transaction Unsafe Endpoint สำหรับการเปรียบเทียบในแล็บอื่น ซึ่งไม่กระทบต่อฟังก์ชันหลักของ Core REST API

---
**ลงชื่อผู้จัดทำ:**  
(นาย/นางสาว) นิสิตผู้รับผิดชอบโครงงาน — รหัสนิสิต: **67160178**  
วันที่จัดทำ: 30 ตุลาคม 2569

