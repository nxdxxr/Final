# คู่มืออ้างอิง express-slow-down (Quick Reference)

เอกสารนี้สรุปคำสั่ง `express-slow-down` ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (Rate Limiting vs Throttling, เหตุผลที่รายวิชานี้เลือกสอน Rate Limiting เป็นหลัก) อยู่ใน [wk12.md](wk12.md) หัวข้อ 3.1 ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง เอกสารนี้เป็นส่วนเสริมสำหรับนิสิตที่ต้องการทดลอง Throttling จริงเพิ่มเติม ไม่ได้อยู่ในใบงานหรือจุดตรวจสอบของสัปดาห์ที่ 12

## สารบัญ

1. [ติดตั้งและตั้งค่าพื้นฐาน](#1-ติดตั้งและตั้งค่าพื้นฐาน)
2. [นำไปใช้กับ Route](#2-นำไปใช้กับ-route)
3. [ใช้ร่วมกับ Rate Limiting](#3-ใช้ร่วมกับ-rate-limiting)
4. [ทดสอบด้วย Postman](#4-ทดสอบด้วย-postman)
5. [ข้อผิดพลาดที่พบบ่อย](#5-ข้อผิดพลาดที่พบบ่อย)
6. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#6-ตัวเลือกพารามิเตอร์เพิ่มเติม)
7. [ตัวอย่างโค้ดเพิ่มเติม](#7-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้งและตั้งค่าพื้นฐาน

```bash
npm install express-slow-down
```

```javascript
// middlewares/speedLimiter.js
const slowDown = require("express-slow-down");

const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // หน้าต่างเวลา 15 นาที (หน่วยเดียวกับ express-rate-limit)
  delayAfter: 5, // request ที่ 1-5 ตอบปกติ ไม่หน่วงเวลา
  delayMs: (hits) => hits.used * 500, // request ที่ 6 หน่วง 500ms, ที่ 7 หน่วง 1000ms, ไล่ขึ้นไปเรื่อย ๆ
});

module.exports = { loginSpeedLimiter };
```

| ตัวเลือก | ความหมาย |
| --- | --- |
| `windowMs` | ความยาวของหน้าต่างเวลา (มิลลิวินาที) — ความหมายเดียวกับ `express-rate-limit` |
| `delayAfter` | จำนวน request แรกที่ยังไม่ถูกหน่วงเวลาในหน้าต่างเวลาเดียวกัน |
| `delayMs` | ฟังก์ชันคำนวณเวลาหน่วง (มิลลิวินาที) จาก `hits.used` (จำนวน request ที่นับไปแล้วในหน้าต่างเวลานี้) — **ไม่ปฏิเสธ** request ด้วย `429` เหมือน `express-rate-limit` |

---

## 2. นำไปใช้กับ Route

```javascript
const { loginSpeedLimiter } = require("./middlewares/speedLimiter");

app.use("/auth/login", loginSpeedLimiter);
```

ต่างจาก `express-rate-limit` ที่ปฏิเสธ request ด้วย `429` เมื่อเกินโควตา `express-slow-down` ยังส่ง request ต่อไปยัง route handler เสมอ เพียงแต่หน่วงเวลาก่อนเรียก `next()` จึงยังได้ response `200`/`401` ตามปกติ เพียงแต่ใช้เวลานานขึ้น

---

## 3. ใช้ร่วมกับ Rate Limiting

ทั้งสองไลบรารีใช้ร่วมกันได้ในระบบเดียว โดยทำหน้าที่คนละชั้น — `express-slow-down` ทำให้บอทที่ยิงถี่ ๆ ช้าลงก่อน แล้ว `express-rate-limit` เป็นชั้นสุดท้ายที่ตัดจริงเมื่อเกินโควตาที่รับไม่ได้

```javascript
const { authLimiter } = require("./middlewares/rateLimiter"); // จาก wk12-lab.md ขั้นตอนที่ 2.5
const { loginSpeedLimiter } = require("./middlewares/speedLimiter");

// ลำดับสำคัญ: หน่วงเวลาก่อน (ชั้นแรก) แล้วค่อยตัดด้วย 429 (ชั้นสุดท้าย)
app.use("/auth/login", loginSpeedLimiter, authLimiter);
```

ตัวอย่างข้างต้นใช้ `authLimiter` ตัวเดียวกับที่สร้างไว้ใน [wk12-lab.md](wk12-lab.md) ขั้นตอนที่ 2.5 — ไม่ต้องสร้างใหม่

---

## 4. ทดสอบด้วย Postman

ใช้ Collection Runner เดียวกับ [wk12-lab.md](wk12-lab.md) ขั้นตอนที่ 3.1 (20 iterations, delay 0ms) ยิงไปที่ `POST /auth/login`

- สังเกต field "Time" ของแต่ละ request ใน Collection Runner — request ที่ 1-5 ใช้เวลาตอบใกล้เคียงกัน ส่วนตั้งแต่ request ที่ 6 เป็นต้นไป เวลาตอบจะเพิ่มขึ้นทีละ ~500ms
- ทุก request ยังได้ status `200`/`401` ตามความถูกต้องของรหัสผ่าน **ไม่มี** request ใดได้ `429` — นี่คือความต่างหลักจาก Rate Limiting ที่ต้องสังเกตให้เห็น

---

## 5. ข้อผิดพลาดที่พบบ่อย

- **คาดหวังว่าจะเห็น `429`** — `express-slow-down` ไม่ปฏิเสธ request เลย ถ้าต้องการตัดจริงเมื่อเกินโควตาสูงสุด ต้องใช้ `express-rate-limit` ร่วมด้วยตามหัวข้อ 3
- **ตั้ง `delayMs` เป็นตัวเลขคงที่** — ทำให้ request ที่ 6 กับ request ที่ 100 หน่วงเวลาเท่ากัน ไม่ได้ภาพ "ช้าลงเรื่อย ๆ" ตามหลักการ Throttling ควรตั้งเป็นฟังก์ชันที่อิงจาก `hits.used`
- **ไม่ตั้ง `trust proxy` ตอน deploy หลัง reverse proxy** — มีผลเหมือนกับ `express-rate-limit` เพราะทั้งสองนับตาม `req.ip` เป็นค่าเริ่มต้น (ดูหัวข้อ 3 ของ [ref-express-rate-limit.md](ref-express-rate-limit.md))
- **ไม่ตั้ง `maxDelayMs` แล้วหน่วงเวลาเพิ่มขึ้นไม่มีขีดจำกัด** — ถ้าสูตร `delayMs` เป็นฟังก์ชันที่โตแบบ linear/exponential ไปเรื่อย ๆ (เช่น `hits.used * 500`) โดยไม่กำหนดเพดาน ผู้ใช้จริงที่ถูกนับปนไปกับบอท (เช่นอยู่หลัง NAT เดียวกัน) อาจต้องรอหลายสิบวินาทีถึงเป็นนาทีโดยไม่ตั้งใจ ควรกำหนด `maxDelayMs` เป็นเพดานเสมอ
- **เข้าใจผิดว่า `express-slow-down` ปล่อยให้ request ทำงานคู่ขนานระหว่างหน่วงเวลา** — จริง ๆ แล้ว middleware นี้หน่วงด้วย `setTimeout` ก่อนเรียก `next()` หมายความว่า request นั้นถูก "แช่แข็ง" รอ ไม่ได้ประมวลผล route handler จนกว่าเวลาหน่วงจะครบ ถ้ามีหลาย request ถูกหน่วงพร้อมกันจำนวนมาก อาจกินทรัพยากร connection/memory ของ Node.js ไว้รอเฉย ๆ นานขึ้นเรื่อย ๆ ซึ่งอาจเป็นช่องให้เกิด DoS แบบ slow-loris ได้เองถ้าไม่จำกัด `delayAfter`/`maxDelayMs` ให้เหมาะสม
- **ใช้ `delayMs` เป็นตัวเลขคงที่ (ไม่ใช่ฟังก์ชัน) ในไลบรารีเวอร์ชันปัจจุบัน** — เวอร์ชันใหม่ของ `express-slow-down` เปลี่ยนให้ `delayMs` ต้องเป็นฟังก์ชันที่รับ `hits` เพื่อคำนวณเอง (ไม่ใช่ตัวเลขคงที่แบบเวอร์ชันเก่า) โค้ดตัวอย่างเก่าบนอินเทอร์เน็ตที่เขียน `delayMs: 500` ตรง ๆ อาจใช้ไม่ได้ผลตามที่คาดกับเวอร์ชันปัจจุบัน ต้องตรวจสอบเวอร์ชันที่ติดตั้งจริงใน `package.json` เทียบกับ README ของไลบรารี

---

## 6. ตัวเลือก/พารามิเตอร์เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `maxDelayMs` | เพดานสูงสุดของเวลาหน่วง (มิลลิวินาที) ไม่ว่า `delayMs` จะคำนวณได้สูงกว่านี้เท่าไหร่ก็ตาม ป้องกันผู้ใช้จริงที่ถูกนับปนไปกับบอทต้องรอนานเกินสมควร |
| `skipFailedRequests` | ถ้า `true` จะไม่นับ request ที่ตอบด้วย error status เป็นส่วนหนึ่งของการคำนวณ `hits.used` |
| `skipSuccessfulRequests` | ถ้า `true` จะไม่นับ request ที่สำเร็จ (2xx) เป็นส่วนหนึ่งของการคำนวณ `hits.used` |
| `keyGenerator` | กำหนดวิธีระบุตัวตนของผู้เรียก (เหมือนใน `express-rate-limit`) ค่าเริ่มต้นใช้ `req.ip` เปลี่ยนเป็นตาม `userId` ได้ด้วยแนวทางเดียวกับหัวข้อ 4 ของ [ref-express-rate-limit.md](ref-express-rate-limit.md) |
| `store` | กำหนด store ภายนอกแทน in-memory store เริ่มต้น เช่นใช้ Redis เมื่อ deploy หลาย instance (ต้องใช้ store ที่รองรับ `express-slow-down` โดยเฉพาะ ไม่ใช่ store เดียวกับ `express-rate-limit` เสมอไป ตรวจสอบ compatibility ก่อนใช้งานจริง) |
| `headers` | ถ้าตั้งเป็น `true` จะส่ง header แจ้งสถานะการหน่วงเวลากลับไปด้วย (คล้าย `standardHeaders` ของ `express-rate-limit`) |

---

## 7. ตัวอย่างโค้ดเพิ่มเติม

### 7.1 ตั้งเพดานเวลาหน่วงสูงสุดด้วย `maxDelayMs`

```javascript
const loginSpeedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (hits) => hits.used * 500,
  maxDelayMs: 5000, // หน่วงสูงสุดไม่เกิน 5 วินาที ไม่ว่า hits.used จะสูงเท่าไหร่
});
```

ป้องกันไม่ให้ผู้ใช้จริงที่บังเอิญถูกนับปนไปกับบอท (เช่น อยู่หลัง NAT เดียวกันในหอพัก) ต้องรอนานเกินสมควรจนรู้สึกว่าระบบค้าง

### 7.2 ใช้ `keyGenerator` แบบเดียวกับ `express-rate-limit` เพื่อหน่วงเวลาตาม `userId` แทน IP

```javascript
const { ipKeyGenerator } = require("express-rate-limit");

const apiSpeedLimiter = slowDown({
  windowMs: 60 * 1000,
  delayAfter: 20,
  delayMs: (hits) => hits.used * 100,
  maxDelayMs: 2000,
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req.ip),
});

app.use("/api/v1/students", authenticateToken, apiSpeedLimiter);
```

ใช้ `keyGenerator` เดียวกันกับที่ตั้งไว้ใน `userLimiter` ของ `express-rate-limit` (หัวข้อ 4 ของ [ref-express-rate-limit.md](ref-express-rate-limit.md)) เพื่อให้การนับทั้งสองชั้นสอดคล้องกับผู้ใช้คนเดียวกัน

## เอกสารอ้างอิงประกอบ

- express-slow-down (GitHub): https://github.com/express-rate-limit/express-slow-down
- เนื้อหาสอนเต็ม (Rate Limiting vs Throttling): [wk12.md](wk12.md) หัวข้อ 3.1
- ไลบรารีคู่กัน (Rate Limiting): [ref-express-rate-limit.md](ref-express-rate-limit.md)
