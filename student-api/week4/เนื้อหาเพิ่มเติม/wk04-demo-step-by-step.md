# สัปดาห์ที่ 4: Demo ประกอบการบรรยาย (Step-by-Step)

## วัตถุประสงค์ของเอกสารนี้

เอกสารนี้ใช้ประกอบเนื้อหาบรรยายใน `wk04.md` แต่ละ step อ้างอิงหัวข้อใน `wk04.md` โดยตรง พิมพ์โค้ดทีละบล็อกแล้วรันให้นิสิตเห็นผลจริงทันที

โปรเจกต์ demo ในเอกสารนี้เป็นโปรเจกต์แยกต่างหาก ชื่อ `demo-api` ไม่ใช่ `student-api` ที่นิสิตใช้ต่อเนื่องมาจากสัปดาห์ 1-3 (เพื่อไม่ให้กระทบข้อมูลที่นิสิตทำใน lab) ทุกคำสั่งทดสอบด้วย `curl` เพราะเปิดแสดงในเทอร์มินัลได้ทันทีโดยไม่ต้องสลับหน้าจอไป Postman แต่สามารถสลับไป Postman แทนได้ในจุดที่ต้องการเน้นการดู Header แบบ GUI

## เตรียมก่อนขึ้นเรียน

```bash
mkdir demo-api && cd demo-api
npm init -y
npm install express helmet cors morgan dotenv
npm install --save-dev nodemon
```

เปิดไฟล์ `package.json` เพิ่ม script `dev`

```json
"scripts": {
  "dev": "nodemon index.js"
}
```

สร้างไฟล์ `index.js` เปล่าไว้ก่อน จะเติมโค้ดทีละ step ตามด้านล่าง ตลอดทั้งเอกสารนี้ใช้คำสั่งเดียว

```bash
npm run dev
```

รันค้างไว้ในหน้าต่าง terminal เดียวตลอด demo เมื่อแก้ไขและ save ไฟล์ `index.js` ในแต่ละ step nodemon จะ reload เซิร์ฟเวอร์ให้อัตโนมัติ **ไม่ต้อง** กด `Ctrl+C` แล้วรันคำสั่งใหม่เอง

---

## Step 1: Middleware พื้นฐานและ Pipeline (อ้างอิง wk04.md หัวข้อ 1.1–1.2)

### 1.1 เขียน custom middleware ตัวแรก

```javascript
// index.js
const express = require("express");
const app = express();
const PORT = 3000;

function myMiddleware(req, res, next) {
  console.log(`ได้รับคำขอ: ${req.method} ${req.url}`);
  next();
}

app.use(myMiddleware);

app.get("/", (req, res) => {
  res.json({ message: "Hello Middleware" });
});

app.listen(PORT, () => {
  console.log(`Server กำลังทำงานที่พอร์ต ${PORT}`);
});
```

บันทึกไฟล์ (nodemon จะรันเซิร์ฟเวอร์ให้อัตโนมัติจากคำสั่ง `npm run dev` ที่รันค้างไว้)

เปิด terminal อีกหน้าต่างเรียก

```bash
curl http://localhost:3000/
```

**ให้นิสิตสังเกต**: terminal ฝั่งเซิร์ฟเวอร์จะพิมพ์ `ได้รับคำขอ: GET /` ก่อนที่ client จะได้ response กลับมา — พิสูจน์ว่า middleware ทำงานก่อน route handler จริง

### 1.2 Demo: middleware ที่ไม่เรียก `next()` ทำให้คำขอค้าง

เปลี่ยน `myMiddleware` ชั่วคราวเป็น

```javascript
function myMiddleware(req, res, next) {
  console.log(`ได้รับคำขอ: ${req.method} ${req.url}`);
  // ไม่เรียก next() และไม่ส่ง response กลับ (ตัวอย่างข้อผิดพลาด)
}
```

บันทึกไฟล์ให้ nodemon reload แล้วเรียก `curl http://localhost:3000/` อีกครั้ง — **ให้นิสิตสังเกต**: curl จะค้างและไม่มี response กลับมา (กด `Ctrl+C` ที่หน้าต่าง curl เพื่อยกเลิก ไม่ใช่หน้าต่างเซิร์ฟเวอร์) นี่คือสิ่งที่ wk04.md หัวข้อ 1.1 อธิบายไว้ แสดงให้เห็นลักษณะของอาการ "ค้าง" อย่างชัดเจน

แก้กลับให้เรียก `next()` ตามเดิมก่อนไป step ถัดไป

---

## Step 2: Helmet — เปรียบเทียบ Header ก่อน/หลัง (อ้างอิง wk04.md หัวข้อ 2)

### 2.1 ดู Header ก่อนติดตั้ง Helmet

```bash
curl -sD - -o /dev/null http://localhost:3000/
```

**ให้นิสิตสังเกต**: มี Header `X-Powered-By: Express` ปรากฏอยู่ และไม่มี Header ด้านความปลอดภัยใด ๆ (ตรงกับตัวอย่างในหัวข้อ 2.1 ของ wk04.md)

### 2.2 ติดตั้งและเปิดใช้งาน Helmet

แก้ `index.js` เพิ่มด้านบนของไฟล์

```javascript
const helmet = require("helmet");
app.use(helmet());
```

**สำคัญ**: ต้องวาง `app.use(helmet())` ไว้ **ก่อน** `app.use(myMiddleware)` และก่อน route ทั้งหมด — บันทึกไฟล์ให้ nodemon reload แล้วเรียกซ้ำ

```bash
curl -sD - -o /dev/null http://localhost:3000/
```

**ให้นิสิตสังเกต**: `X-Powered-By` หายไป และมี Header ใหม่ เช่น `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` ปรากฏขึ้นทันที — ตรงกับตารางหัวข้อ 2.3 ของ wk04.md

### คำเตือน: มิดเดิลแวร์ต้องลงทะเบียนก่อนเส้นทางที่ต้องการใช้งานมิดเดิลแวร์นั้นเสมอ

Express ประมวลผล middleware และ route ตามลำดับที่ประกาศในโค้ดจากบนลงล่าง (ตามหัวข้อ 1.2 ของ wk04.md) หาก `app.use(helmet())` ถูกวางไว้ **หลัง** route ที่ต้องการป้องกัน route นั้นจะไม่ได้รับ Header ความปลอดภัยจาก Helmet เลย เพราะ request ตอบกลับไปแล้วก่อนจะถึงตำแหน่งที่ประกาศ Helmet

**Demo ให้เห็นจริง**: ลองย้าย `app.use(helmet())` ไปไว้ **หลัง** `app.get("/", ...)` ชั่วคราว บันทึกไฟล์ให้ nodemon reload แล้วเรียกซ้ำ

```bash
curl -sD - -o /dev/null http://localhost:3000/
```

**ให้นิสิตสังเกต**: `X-Powered-By: Express` กลับมาปรากฏอีกครั้ง และ Header ความปลอดภัยจาก Helmet หายไปทั้งหมด ทั้งที่โค้ดยังมี `app.use(helmet())` อยู่ในไฟล์ เพียงแค่ตำแหน่งเปลี่ยนไป — ย้าย `app.use(helmet())` กลับไปไว้ก่อน route ทั้งหมดตามเดิมก่อนไป step ถัดไป

หลักการนี้ใช้ได้กับ middleware ทุกตัวไม่ใช่แค่ Helmet เช่น CORS ใน Step 3 หรือ body parser (`express.json()`) ก็ต้องลงทะเบียนก่อน route ที่ต้องพึ่งพา middleware เหล่านั้นเช่นกัน

---

## Step 3: CORS — เปิดกว้างเทียบกับจำกัด origin (อ้างอิง wk04.md หัวข้อ 3)

### 3.1 เปิด CORS แบบไม่จำกัด (สาธิตปัญหา)

เพิ่มใน `index.js`

```javascript
const cors = require("cors");
app.use(cors());
```

บันทึกไฟล์ให้ nodemon reload แล้วทดสอบจำลอง origin ที่ไม่น่าเชื่อถือ

```bash
curl -sD - -o /dev/null -H "Origin: http://malicious-site.example.com" http://localhost:3000/
```

**ให้นิสิตสังเกต**: มี `Access-Control-Allow-Origin: *` ตอบกลับมา หมายความว่าทุกโดเมนสามารถเรียกใช้ได้ แม้จะเป็นโดเมนที่ไม่น่าเชื่อถือ — นี่คือความเสี่ยง Security Misconfiguration ตามที่ wk04.md หัวข้อ 3.3 อธิบายไว้

### 3.2 จำกัด origin ให้เฉพาะที่เชื่อถือได้

แก้เป็น

```javascript
app.use(cors({ origin: "http://localhost:3001" }));
```

บันทึกไฟล์ให้ nodemon reload แล้วทดสอบซ้ำด้วย origin เดิม

```bash
curl -sD - -o /dev/null -H "Origin: http://malicious-site.example.com" http://localhost:3000/
```

**ให้นิสิตสังเกต**: ไม่มี Header `Access-Control-Allow-Origin` ที่ตรงกับ origin นี้อีกต่อไป (เทียบต่อด้วย origin ที่อนุญาตจริงเพื่อให้เห็น contrast)

```bash
curl -sD - -o /dev/null -H "Origin: http://localhost:3001" http://localhost:3000/
```

**ให้นิสิตสังเกต**: ครั้งนี้มี `Access-Control-Allow-Origin: http://localhost:3001` ตอบกลับมา

---

## Step 4: Environment Variables (อ้างอิง wk04.md หัวข้อ 4)

### 4.1 ปัญหาของ hardcode

ชี้ให้นิสิตดูว่าขณะนี้ origin `http://localhost:3001` ถูกเขียนตายตัวในโค้ด — หาก deploy ขึ้น production จะต้องแก้โค้ดและ build ใหม่ทุกครั้งที่ domain เปลี่ยน

### 4.2 ย้ายไปไว้ใน `.env`

```bash
echo "ALLOWED_ORIGIN=http://localhost:3001" > .env
```

แก้ `index.js` เพิ่มบรรทัดแรกสุดของไฟล์

```javascript
require("dotenv").config();
```

และแก้ CORS เป็น

```javascript
app.use(cors({ origin: process.env.ALLOWED_ORIGIN }));
```

บันทึกไฟล์ให้ nodemon reload แล้วทดสอบซ้ำเหมือน step 3.2 — **ให้นิสิตสังเกต**: ผลลัพธ์เหมือนเดิมทุกประการ แต่ขณะนี้ค่าดึงมาจาก `.env` ไม่ใช่เขียนตายตัวในโค้ด สามารถเปลี่ยน origin ได้โดยไม่ต้องแก้โค้ด

**ข้อควรระวัง**: nodemon เฝ้าดูการเปลี่ยนแปลงเฉพาะไฟล์โค้ด (เช่น `.js`) ตามค่าเริ่มต้น **ไม่เฝ้าดูไฟล์ `.env`** ดังนั้นเมื่อแก้ค่าใน `.env` ต้อง restart เซิร์ฟเวอร์เอง (`Ctrl+C` แล้ว `npm run dev` ใหม่) จึงจะเห็นผล — ต่างจากการแก้ `index.js` ที่ reload อัตโนมัติ

**Demo เพิ่มเติม**: ทดลองเปลี่ยนค่าใน `.env` เป็น origin อื่น แล้ว restart เซิร์ฟเวอร์ด้วยตนเอง ให้นิสิตเห็นว่าพฤติกรรมเปลี่ยนตาม โดยไม่ได้แก้ไขไฟล์ `index.js`

---

## Step 5: Morgan, Body Parser, Error-Handling Middleware และ OWASP ในทางปฏิบัติ (อ้างอิง wk04.md หัวข้อ 1.5–1.7 และ 5.3)

### 5.1 เพิ่ม morgan logger

```javascript
const morgan = require("morgan");
app.use(morgan("dev"));
```

บันทึกไฟล์ให้ nodemon reload แล้วเรียก `curl http://localhost:3000/` — **ให้นิสิตสังเกต**: terminal ฝั่งเซิร์ฟเวอร์พิมพ์บรรทัด log รูปแบบมาตรฐานอัตโนมัติ เช่น `GET / 200 2.145 ms - 25` โดยไม่ต้องเขียน custom logger เอง

### 5.2 เพิ่ม body parser และจำลอง route ที่มี error

เพิ่มท้ายไฟล์ (ก่อน `app.listen`)

```javascript
app.use(express.json({ limit: "10kb" }));

app.post("/echo", (req, res) => {
  res.json({ received: req.body });
});

app.use((req, res) => {
  res.status(404).json({
    error: { code: "ROUTE_NOT_FOUND", message: "ไม่พบเส้นทางที่ร้องขอ" },
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
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
```

บันทึกไฟล์ให้ nodemon reload แล้ว demo 3 กรณีติดกัน:

**(ก) เรียก route ที่ไม่มีจริง**

```bash
curl -s http://localhost:3000/does-not-exist
```

**ให้นิสิตสังเกต**: ได้ `{"error":{"code":"ROUTE_NOT_FOUND",...}}` พร้อม status 404

**(ข) ส่ง payload เกิน 10KB**

```bash
node -e 'require("fs").writeFileSync("/tmp/big.json", JSON.stringify({name:"x".repeat(15000)}))'
curl -s -X POST -H "Content-Type: application/json" --data-binary @/tmp/big.json http://localhost:3000/echo -w "\nHTTP: %{http_code}\n"
```

**ให้นิสิตสังเกต**: ได้ status `413` ไม่ใช่ 500 — เพราะ error-handling middleware อ่านค่า `err.status` ที่ Express ส่งมาจริง (ตามที่อธิบายในหัวข้อ 1.7) แทนที่จะตอบ 500 คงที่ทุกกรณี

**(ค) ส่ง request ปกติ**

```bash
curl -s -X POST -H "Content-Type: application/json" -d '{"name":"ทดสอบ"}' http://localhost:3000/echo
```

**ให้นิสิตสังเกต**: ทำงานปกติ ได้ `{"received":{"name":"ทดสอบ"}}` — ยืนยันว่าการแก้ error-handling middleware ไม่กระทบ flow ปกติ

### 5.3 เชื่อมโยงกลับไปที่ OWASP Top 10:2025

ปิดท้าย demo ด้วยการชี้ให้นิสิตเห็นว่าโค้ดที่เพิ่งเขียนทั้งหมดใน demo วันนี้ ป้องกันความเสี่ยงข้อไหนใน wk04.md หัวข้อ 5.2 ได้แล้วบ้าง (Helmet → Security Misconfiguration, error-handling ที่อ่าน `err.status` → Mishandling of Exceptional Conditions) และข้อไหนยังไม่ได้ป้องกัน (Injection, Broken Access Control) เพื่อโยงไปสัปดาห์ถัดไป

---

## สรุปท้าย Demo

โค้ดสุดท้ายที่ได้หลังจบทุก step คือโครงสร้าง middleware pipeline แบบเดียวกับที่ `wk04.md` หัวข้อ 5.3 สรุปไว้ (Helmet → CORS → morgan → body parser → route → error-handling) ให้นิสิตนำไปประยุกต์กับโปรเจกต์ `student-api` ของตนเองในปฏิบัติการ `wk04-lab.md` ต่อทันที

**ข้อควรระวัง**: โปรเจกต์ `demo-api` นี้เป็นของสาธิตเท่านั้น
— นิสิตทำงานจริงบน `student-api` ของตนเองตาม `wk04-lab.md`
