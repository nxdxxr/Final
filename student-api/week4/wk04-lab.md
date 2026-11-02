# ปฏิบัติการสัปดาห์ที่ 4: เพิ่มชั้นความปลอดภัยพื้นฐานด้วย Middleware

## วัตถุประสงค์ของปฏิบัติการ

เมื่อทำปฏิบัติการนี้เสร็จสิ้น นิสิตจะสามารถ

1. ติดตั้งและใช้งาน Helmet, CORS และ Logger middleware ในโปรเจกต์จริงได้
2. ย้ายค่าคงที่และข้อมูลลับออกจากโค้ดไปเก็บไว้ใน Environment Variables ได้
3. ตรวจสอบ HTTP Header และรูปแบบ error response ด้วย Postman ได้
4. จำลองสถานการณ์โจมตีพื้นฐาน (attack scenario) เพื่อตรวจสอบว่าระบบมีการป้องกันเบื้องต้นหรือไม่

ปฏิบัติการนี้ต่อยอดจากเนื้อหาบรรยายในเอกสาร `wk04.md` และปรับปรุงโปรเจกต์ `student-api` ที่สร้างต่อเนื่องมาจากปฏิบัติการสัปดาห์ที่ 1-3 (`wk01-lab.md`, `wk02-lab.md`, `wk03-lab.md`) เป็นส่วนหนึ่งของการประเมินผล CLO1 (ใบงานส่งสัปดาห์ที่ 4) ตามที่กำหนดไว้ใน `course_plan.md`

## เวลาที่ใช้

| ช่วงเวลา    | กิจกรรม                                                |
| ----------- | ------------------------------------------------------ |
| 0-15 นาที   | ทบทวนเนื้อหาสัปดาห์ที่ 3 (Review W3)                   |
| 15-90 นาที  | เพิ่ม Helmet/CORS/Logger ทุก route                     |
| 90-120 นาที | ทดสอบ Header, Error Format และ Attack Scenario พื้นฐาน |

## เครื่องมือที่ต้องใช้

1. โปรเจกต์ `student-api` จากปฏิบัติการสัปดาห์ที่ 1-3
2. Node.js และ npm
3. Postman
4. ไลบรารี `helmet`, `cors`, `morgan`, `dotenv`

---

## ส่วนที่ 1: ทบทวนเนื้อหาสัปดาห์ที่ 3 (0-15 นาที)

### ขั้นตอนที่ 1.1 ตรวจสอบโปรเจกต์เดิม

เปิดโฟลเดอร์ `student-api` และรันเซิร์ฟเวอร์เพื่อยืนยันว่า endpoint ทั้งหมดจากสัปดาห์ที่ 1-3 (รวมถึง PATCH และการปรับปรุง Status Code) ยังทำงานถูกต้อง

```bash
cd student-api
npm run dev
```

### ขั้นตอนที่ 1.2 ทบทวนแนวคิดสำคัญ

ก่อนเริ่มปฏิบัติการ ให้ทบทวนหัวข้อต่อไปนี้จากเอกสารบรรยาย `wk04.md` ร่วมกัน

1. Middleware pipeline ทำงานตามลำดับอย่างไร
2. Helmet และ CORS แก้ปัญหาด้านความปลอดภัยประเภทใด
3. เหตุใดจึงไม่ควรเขียนข้อมูลลับตายตัวไว้ในโค้ด

### จุดตรวจสอบที่ 1

- เซิร์ฟเวอร์และ endpoint ทั้งหมดจากสัปดาห์ก่อนหน้ายังทำงานได้ปกติ
- สามารถอธิบายลำดับการทำงานของ middleware pipeline ได้ก่อนเริ่มลงมือปฏิบัติ

---

## ส่วนที่ 2: เพิ่ม Helmet, CORS และ Logger ทุก Route (15-90 นาที)

### ขั้นตอนที่ 2.1 ติดตั้งไลบรารีที่จำเป็น

```bash
npm install helmet cors morgan dotenv
```

`morgan` เป็นไลบรารีสำหรับบันทึก log ของคำขอ HTTP โดยอัตโนมัติ ใช้แทนการเขียน custom logger เอง

### ขั้นตอนที่ 2.2 ย้ายค่าคงที่ไปไว้ใน Environment Variables

สร้างไฟล์ `.env` ที่รากของโปรเจกต์

```
PORT=3000
NODE_ENV=development
ALLOWED_ORIGIN=http://localhost:3001
```

สร้างไฟล์ `.env.example` ที่มีรายชื่อตัวแปรแต่ไม่มีค่าจริง เพื่อเตรียมพร้อมสำหรับการทำงานเป็นทีม

```
PORT=
NODE_ENV=
ALLOWED_ORIGIN=
```

ตรวจสอบไฟล์ `.gitignore` ว่ามีบรรทัด `.env` อยู่แล้ว หากยังไม่มีให้เพิ่ม

```
node_modules/
.env
```

### ขั้นตอนที่ 2.3 เพิ่ม Middleware ทั้งหมดในไฟล์ index.js

แก้ไขไฟล์ `index.js` ให้โหลดค่าตัวแปรและเพิ่ม middleware ตามลำดับที่เหมาะสม โดยวางไว้ **ก่อน** route ทั้งหมด

```javascript
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 3000;

// ลำดับ middleware มีความสำคัญ: security header → CORS → logger → body parser
// (ลำดับนี้ต่างจากแผนภาพตัวอย่างในหัวข้อ 1.2 ของ wk04.md ซึ่งวาง Logger ไว้ก่อน Helmet
// ทั้งสองลำดับใช้ได้ ตราบใดที่ Error-Handling Middleware ยังอยู่ท้ายสุดเสมอ)
app.use(helmet());
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);
app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));

// ... route ทั้งหมดจากสัปดาห์ที่ 1-3 อยู่ต่อจากนี้ ...
```

### ขั้นตอนที่ 2.4 เพิ่ม Error-Handling Middleware แบบรวมศูนย์

เพิ่มโค้ดต่อไปนี้ไว้ **หลัง** route ทั้งหมด ก่อนบรรทัด `app.listen`

```javascript
// 404: ไม่พบ route ที่ร้องขอ (ต้องอยู่หลัง route ทั้งหมด)
app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบเส้นทางที่ร้องขอ" },
  });
});

// Error-handling middleware (ต้องมีพารามิเตอร์ 4 ตัวเสมอ)
app.use((err, req, res, next) => {
  console.error(err.stack);
  // ใช้ err.status/err.statusCode หากมี (เช่น PayloadTooLargeError จาก express.json ที่ส่งมาเป็น 413)
  // เพื่อไม่ให้ error ที่มีรหัสสถานะของตัวเองถูกกลบด้วย 500 เสมอไป
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.type || "ERROR",
      message:
        statusCode === 500
          ? "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ"
          : err.message,
    },
  });
});

app.listen(PORT, () => {
  console.log(`Server กำลังทำงานที่พอร์ต ${PORT} (${process.env.NODE_ENV})`);
});
```

### ขั้นตอนที่ 2.5 ทดสอบว่า Logger ทำงานถูกต้อง

รันเซิร์ฟเวอร์ใหม่ แล้วเรียก endpoint ใด ๆ ผ่าน Postman เช่น `GET /api/v1/students` จากนั้นสังเกต log ที่แสดงใน Terminal ควรมีลักษณะคล้าย

```
GET /api/v1/students 200 5.234 ms - 128
```

### จุดตรวจสอบที่ 2

- ติดตั้ง `helmet`, `cors`, `morgan`, `dotenv` สำเร็จ และเซิร์ฟเวอร์รันได้โดยไม่มีข้อผิดพลาด
- ไฟล์ `.env` และ `.env.example` ถูกสร้างขึ้น และ `.env` อยู่ใน `.gitignore`
- เรียก endpoint ใด ๆ แล้วเห็น log ปรากฏใน Terminal ผ่าน `morgan`
- เรียก URL ที่ไม่มีอยู่จริง (เช่น `GET /api/v1/unknown`) แล้วได้ Status Code `404` พร้อมโครงสร้าง error มาตรฐาน

---

## ส่วนที่ 3: ทดสอบ Header, Error Format และ Attack Scenario พื้นฐาน (90-120 นาที)

### ขั้นตอนที่ 3.1 ตรวจสอบ Security Header ด้วย Postman

เรียก `GET http://localhost:3000/api/v1/students` ด้วย Postman จากนั้นไปที่แท็บ `Headers` ของ response และตรวจสอบว่ามี Header ต่อไปนี้ปรากฏอยู่ (มาจาก Helmet)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- ไม่ปรากฏ Header `X-Powered-By` อีกต่อไป (Helmet ปิดค่านี้ให้โดยอัตโนมัติ)

### ขั้นตอนที่ 3.2 ทดสอบ CORS ด้วยการจำลอง Origin ที่ไม่ได้รับอนุญาต

ใน Postman ไปที่แท็บ `Headers` ของคำขอ (request) แล้วเพิ่ม Header กำหนดเอง

```
Origin: http://malicious-site.example.com
```

ส่งคำขอ `GET /api/v1/students` แล้วสังเกตว่า response ไม่มี Header `Access-Control-Allow-Origin` ที่ตรงกับโดเมนนี้ ซึ่งหมายความว่าหากคำขอนี้มาจากเบราว์เซอร์จริง เบราว์เซอร์จะปฏิเสธไม่ให้ JavaScript ฝั่ง client อ่านผลลัพธ์ได้ (แม้ Postman เองจะยังแสดงผลลัพธ์ให้เห็น เนื่องจาก CORS เป็นกลไกที่บังคับใช้ในระดับเบราว์เซอร์ ไม่ใช่ระดับเซิร์ฟเวอร์)

### ขั้นตอนที่ 3.3 ทดสอบรูปแบบ Error Response ที่เป็นมาตรฐาน

ทดสอบกรณีต่อไปนี้ และตรวจสอบว่า error response ทุกกรณีมีโครงสร้างเดียวกัน (`{ "error": { "code": ..., "message": ... } }`)

| กรณีทดสอบ    | คำขอ                                            | Status Code ที่คาดหวัง |
| ------------ | ----------------------------------------------- | ---------------------- |
| ไม่พบ route  | `GET /api/v1/unknown-route`                     | 404                    |
| ไม่พบข้อมูล  | `GET /api/v1/students/999`                      | 404                    |
| ข้อมูลไม่ครบ | `POST /api/v1/students` (ไม่ส่ง `name`)         | 400                    |
| อีเมลซ้ำ     | `POST /api/v1/students` (ใช้อีเมลที่มีอยู่แล้ว) | 409                    |

### ขั้นตอนที่ 3.4 จำลอง Attack Scenario พื้นฐาน: Payload ขนาดใหญ่ผิดปกติ

ทดสอบว่าการจำกัดขนาด body ด้วย `express.json({ limit: "10kb" })` ทำงานถูกต้อง โดยส่งคำขอ `POST /api/v1/students` พร้อม body ที่มีขนาดเกิน 10KB

ใน Postman ไปที่แท็บ `Body` เลือก `raw` และประเภท `JSON` จากนั้นไปที่แท็บ `Scripts` (หรือ `Pre-request Script` ในเวอร์ชันเก่า) ของคำขอนี้ แล้วใส่โค้ดต่อไปนี้เพื่อสร้างข้อความยาวเกิน 10KB โดยอัตโนมัติก่อนส่งคำขอ

```javascript
pm.variables.set("longName", "x".repeat(15000));
```

ใช้อักขระภาษาอังกฤษ (`x`) แทนภาษาไทย เนื่องจากนับได้ 1 byte ต่อ 1 ตัวอักษรพอดี ทำให้คำนวณขนาดรวมได้ตรงไปตรงมา (15000 ตัวอักษร ≈ 15KB ซึ่งเกิน 10KB แน่นอน) ต่างจากอักขระภาษาไทยที่ใช้หลาย byte ต่อ 1 ตัวอักษรเมื่อเข้ารหัสแบบ UTF-8 ทำให้คาดเดาขนาดจริงได้ยากกว่า

จากนั้นใน Body ให้ใช้ตัวแปรที่สร้างไว้แทนการพิมพ์ข้อความเอง

```json
{
  "name": "{{longName}}",
  "major": "วิทยาการคอมพิวเตอร์",
  "email": "test@example.com"
}
```

**ข้อควรระวัง**: ต้องตั้ง Body เป็น `raw` + `JSON` และมี Header `Content-Type: application/json` เท่านั้น (ปกติ Postman ตั้งให้อัตโนมัติเมื่อเลือกประเภท JSON) เนื่องจากขีดจำกัด `limit: "10kb"` ของ `express.json()` จะมีผลกับคำขอที่ระบุ `Content-Type: application/json` เท่านั้น หากส่งเป็นรูปแบบอื่นจะไม่ได้ผลลัพธ์ตามที่คาดหวัง

ผลลัพธ์ที่คาดหวัง: เซิร์ฟเวอร์ตอบกลับด้วย Status Code `413 Payload Too Large` แทนที่จะประมวลผลคำขอที่มีขนาดใหญ่ผิดปกติ

### ขั้นตอนที่ 3.5 จำลอง Attack Scenario พื้นฐาน: การส่งข้อมูลประเภทผิด (Type Confusion)

ทดสอบส่งคำขอ `POST /api/v1/students` โดยระบุ `name` เป็นอ็อบเจกต์แทนที่จะเป็นข้อความ

```json
{
  "name": { "malicious": "payload" },
  "major": "วิทยาการคอมพิวเตอร์",
  "email": "test2@example.com"
}
```

สังเกตว่าระบบปัจจุบันตรวจสอบเพียงว่าฟิลด์มีค่าหรือไม่ (`!name`) แต่ไม่ได้ตรวจสอบชนิดข้อมูล จึงอาจยอมรับค่าที่ไม่ถูกต้องเข้าสู่ระบบ จดบันทึกข้อสังเกตนี้ไว้ เนื่องจากเป็นช่องโหว่ประเภท Injection (A05 ตาม OWASP Top 10:2025) ที่กล่าวถึงใน `wk04.md` ซึ่งจะได้รับการแก้ไขอย่างเป็นระบบด้วยไลบรารี Zod ในสัปดาห์ที่ 12

### จุดตรวจสอบที่ 3

- ตรวจสอบ Security Header จาก Helmet ได้ครบตามที่ระบุในขั้นตอนที่ 3.1
- ทดสอบ CORS กับ Origin ที่ไม่ได้รับอนุญาตและเข้าใจข้อจำกัดของการทดสอบผ่าน Postman
- ทดสอบ error response ครบทั้ง 4 กรณีในขั้นตอนที่ 3.3 และได้ Status Code ตรงตามที่คาดหวัง
- ทดสอบ payload ขนาดใหญ่และได้ Status Code `413`
- บันทึกข้อสังเกตเรื่อง Type Confusion จากขั้นตอนที่ 3.5 ไว้เป็นลายลักษณ์อักษร

---

## ส่วนต่อยอด: แบบฝึกหัดเพิ่มเติมด้วยตนเอง

### แบบฝึกหัดที่ 1: เขียน Middleware ตรวจสอบ Content-Type

เขียน middleware ที่ตรวจสอบว่าทุกคำขอที่มี body (POST, PUT, PATCH) ต้องมี Header `Content-Type: application/json` มิฉะนั้นให้ตอบกลับด้วย Status Code `415 Unsupported Media Type`

```javascript
function requireJson(req, res, next) {
  const methodsWithBody = ["POST", "PUT", "PATCH"];
  if (
    methodsWithBody.includes(req.method) &&
    req.headers["content-type"] !== "application/json"
  ) {
    return res.status(415).json({
      error: {
        code: "UNSUPPORTED_MEDIA_TYPE",
        message: "กรุณาส่งข้อมูลในรูปแบบ application/json",
      },
    });
  }
  next();
}
```

ทดสอบด้วย Postman โดยส่งคำขอ POST แบบไม่ระบุ `Content-Type` และยืนยันว่าได้ Status Code `415`

### แบบฝึกหัดที่ 2: จำกัดจำนวนคำขอด้วย Rate Limiting เบื้องต้น

ค้นคว้าและติดตั้งไลบรารี `express-rate-limit` แล้วจำกัดให้แต่ละ IP เรียก endpoint `POST /api/v1/students` ได้ไม่เกิน 5 ครั้งต่อนาที ทดสอบด้วยการเรียกคำขอซ้ำอย่างรวดเร็วผ่าน Postman (ใช้ฟีเจอร์ Runner) จนกว่าจะได้ Status Code `429 Too Many Requests`

### แบบฝึกหัดที่ 3: เขียน Middleware ตรวจสอบขนาดของค่าฟิลด์

ปรับปรุง route `POST /api/v1/students` ให้ปฏิเสธคำขอที่ `name` มีความยาวเกิน 100 ตัวอักษร โดยตอบกลับ Status Code `400` พร้อมข้อความอธิบายที่ชัดเจน

### แบบฝึกหัดที่ 4: ทดสอบผลกระทบของลำดับ Middleware

ทดลองย้ายตำแหน่งของ `app.use(helmet())` ไปไว้หลัง route ทั้งหมดแทนที่จะไว้ก่อน แล้วสังเกตว่า Security Header ยังปรากฏใน response หรือไม่ พร้อมอธิบายผลลัพธ์ที่เกิดขึ้นโดยอ้างอิงหลักการ middleware pipeline จาก `wk04.md`

**สำคัญ**: หลังทดลองและบันทึกผลเสร็จแล้ว ให้ย้าย `app.use(helmet())` กลับไปไว้ตำแหน่งเดิม (ก่อน route ทั้งหมด ตามขั้นตอนที่ 2.3) ทันที ไม่เช่นนั้นโปรเจกต์จะขาดการป้องกัน Security Header ต่อเนื่องไปในสัปดาห์ถัดไป

### เกณฑ์การประเมินแบบฝึกหัดต่อยอด (สำหรับนิสิตใช้ตรวจสอบตนเอง)

| รายการ         | ผ่านเกณฑ์เมื่อ                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| แบบฝึกหัดที่ 1 | ส่งคำขอ POST โดยไม่ระบุ `Content-Type` แล้วได้ Status Code `415` ตามที่กำหนด                                |
| แบบฝึกหัดที่ 2 | เรียกคำขอเกิน 5 ครั้งต่อนาทีแล้วได้ Status Code `429`                                                       |
| แบบฝึกหัดที่ 3 | ส่ง `name` ที่ยาวเกิน 100 ตัวอักษรแล้วได้ Status Code `400` พร้อมข้อความที่ชัดเจน                           |
| แบบฝึกหัดที่ 4 | มีบันทึกผลการทดลองและคำอธิบายที่ถูกต้องว่าเหตุใดตำแหน่งของ middleware จึงมีผลต่อ Header ที่ปรากฏใน response |

หมายเหตุ: แบบฝึกหัดต่อยอดนี้เป็นการเตรียมความพร้อมสำหรับเนื้อหาสัปดาห์ที่ 5 (MySQL Integration & Query Basics) ซึ่งจะเริ่มเชื่อมต่อฐานข้อมูลจริงแทนข้อมูลจำลองในหน่วยความจำที่ใช้มาตั้งแต่สัปดาห์ที่ 1 โดยชั้นความปลอดภัยที่เพิ่มในสัปดาห์นี้จะยังคงใช้งานต่อเนื่องกับทุก endpoint ในสัปดาห์ถัดไป
