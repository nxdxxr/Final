# คู่มืออ้างอิง express-rate-limit (Quick Reference)

เอกสารนี้สรุปคำสั่ง `express-rate-limit` ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (Rate Limiting vs Throttling, เหตุผลที่ต้อง `trust proxy`, ข้อจำกัดของ in-memory store) อยู่ใน [wk12.md](wk12.md) หัวข้อ 3 ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้งและตั้งค่าพื้นฐาน](#1-ติดตั้งและตั้งค่าพื้นฐาน)
2. [นำไปใช้กับ Route](#2-นำไปใช้กับ-route)
3. [ตั้งค่า trust proxy เมื่ออยู่หลัง Reverse Proxy](#3-ตั้งค่า-trust-proxy-เมื่ออยู่หลัง-reverse-proxy)
4. [จำกัดตามผู้ใช้ด้วย keyGenerator](#4-จำกัดตามผู้ใช้ด้วย-keygenerator)
5. [ตรวจสอบ Header ที่ตอบกลับ](#5-ตรวจสอบ-header-ที่ตอบกลับ)
6. [ข้อผิดพลาดที่พบบ่อย](#6-ข้อผิดพลาดที่พบบ่อย)
7. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#7-ตัวเลือกพารามิเตอร์เพิ่มเติม)
8. [ตัวอย่างโค้ดเพิ่มเติม](#8-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้งและตั้งค่าพื้นฐาน

```bash
npm install express-rate-limit
```

```javascript
// middlewares/rateLimiter.js
const rateLimit = require("express-rate-limit");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // หน้าต่างเวลา 15 นาที
  max: 5, // จำกัด 5 ครั้งต่อ key ต่อหน้าต่างเวลา
  standardHeaders: "draft-7", // ส่ง header RateLimit ตามมาตรฐาน IETF draft-7 (ค่า true ไม่เท่ากับ "draft-7")
  legacyHeaders: false, // ปิด header X-RateLimit-* แบบเก่า
  message: {
    error: { code: "TOO_MANY_REQUESTS", message: "พยายามเข้าสู่ระบบเกินจำนวนที่กำหนด กรุณาลองใหม่ภายหลัง" },
  },
});

module.exports = { authLimiter };
```

| ตัวเลือก | ความหมาย |
| --- | --- |
| `windowMs` | ความยาวของหน้าต่างเวลา (มิลลิวินาที) |
| `max` | จำนวนคำขอสูงสุดต่อ key ต่อหน้าต่างเวลา |
| `standardHeaders` | `"draft-7"` ส่ง header `RateLimit` รวมค่าเดียว; `true`/`"draft-6"` ส่งแยกเป็น `RateLimit-Limit`/`RateLimit-Remaining`/`RateLimit-Reset` |
| `legacyHeaders` | `false` ปิด header เก่า `X-RateLimit-*` |
| `message` | body ที่ตอบกลับเมื่อเกินโควตา (status `429`) |

---

## 2. นำไปใช้กับ Route

```javascript
const { authLimiter, generalLimiter } = require("./middlewares/rateLimiter");

app.use(generalLimiter); // ครอบคลุมทุก route เป็นค่าเริ่มต้น (โควตาหลวม)
app.use("/auth/login", authLimiter); // route เสี่ยง brute-force ใช้โควตาที่เข้มกว่า
```

endpoint ที่มีความเสี่ยงต่างกันควรมีโควตาต่างกัน — กำหนด limiter แยกเฉพาะ route ที่เสี่ยงสูง (เช่น login) แทนใช้ค่าเดียวทั้งระบบ

---

## 3. ตั้งค่า trust proxy เมื่ออยู่หลัง Reverse Proxy

```javascript
app.set("trust proxy", 1);
```

ค่าเริ่มต้นนับโควตาตาม `req.ip` — เมื่อ deploy หลัง reverse proxy/load balancer (เช่น Nginx) `req.ip` จะกลายเป็น IP ของ proxy เอง ทำให้ผู้ใช้ทุกคนถูกนับรวมเป็นคนเดียว ต้องตั้งค่านี้ควบคู่กับตรวจสอบว่า proxy ส่ง header `X-Forwarded-For` มาถูกต้อง

---

## 4. จำกัดตามผู้ใช้ด้วย keyGenerator

```javascript
const { rateLimit, ipKeyGenerator } = require("express-rate-limit");

const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req.ip), // ใช้ userId เมื่อ login แล้ว, fallback เป็น IP ผ่าน helper
  standardHeaders: "draft-7",
  legacyHeaders: false,
});

app.use("/api/v1/students", authenticateToken, userLimiter); // authenticateToken ต้องมาก่อนเสมอ
```

`authenticateToken` ต้องทำงานก่อน `userLimiter` เสมอ เพราะ `keyGenerator` ต้องอ่าน `req.user.id` ที่ authenticateToken เป็นผู้กำหนด fallback ต้องเรียกผ่าน `ipKeyGenerator(req.ip)` เสมอ ไม่ใช่ใช้ `req.ip` ตรง ๆ (ดูหัวข้อ 6) และยังมีข้อจำกัดเดิมอยู่ดี (ผู้ใช้ที่ยังไม่ login หลัง NAT เดียวกันยังถูกนับรวมกัน)

---

## 4.1 กำหนดโควตาต่างกันตาม Role ด้วย `max` แบบฟังก์ชัน

`max` (ชื่อใหม่คือ `limit` แต่ `max` ยังใช้ได้เพื่อความเข้ากันได้ย้อนหลัง) ไม่จำเป็นต้องเป็นตัวเลขคงที่ รับเป็นฟังก์ชัน (sync หรือ async) ที่คืนค่าตัวเลขได้ ทำให้กำหนดโควตาต่างกันตามเงื่อนไขของแต่ละ request ได้ เช่น ตาม role ของผู้ใช้

```javascript
const userLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: (req) => {
    if (req.user?.role === "admin") return 200; // admin ได้โควตาสูงกว่า
    return 30; // ผู้ใช้ทั่วไป (student) ได้โควตาปกติ
  },
  keyGenerator: (req) => req.user?.id?.toString() || ipKeyGenerator(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
```

ฟังก์ชันนี้รับ `req` (และ `res`) เข้ามาเหมือน middleware ทั่วไป จึงอ่าน `req.user.role` ที่ `authenticateToken` ตั้งไว้ก่อนหน้าได้โดยตรง เช่นเดียวกับ `keyGenerator`

---

## 5. ตรวจสอบ Header ที่ตอบกลับ

เมื่อเกินโควตา ตอบ `429` พร้อม header `RateLimit` (รวมค่า `limit`, `remaining`, `reset` ไว้ในค่าเดียวตาม draft-7) — ตรวจสอบจากแท็บ Headers ของ response ใน Postman ไม่ใช่ใน body

---

## 6. ข้อผิดพลาดที่พบบ่อย

- **ใช้ `standardHeaders: true` แล้วคิดว่าได้ draft-7** — `true` ให้ผลเหมือน `"draft-6"` (header แยกเป็น `RateLimit-*`) ไม่ใช่ header รวม ต้องระบุ `"draft-7"` อย่างชัดเจน
- **ไม่ตั้ง `trust proxy` ตอน deploy หลัง reverse proxy** — ผู้ใช้ทุกคนถูกนับรวมเป็น IP เดียวกัน (ของ proxy) ทำให้คนแรกที่โดน rate limit บล็อกคนอื่นทั้งหมดไปด้วย
- **คาดหวังว่า in-memory store จะ sync ข้ามหลาย instance** — ค่าเริ่มต้นเก็บ counter ใน memory ของ process เดียว หาก deploy หลาย instance โควตารวมจริงจะกลายเป็น `max` × จำนวน instance โดยไม่ตั้งใจ ต้องใช้ store ภายนอก (เช่น Redis ผ่าน `rate-limit-redis`) เมื่อ scale หลาย instance
- **ตั้ง `keyGenerator` แบบ custom เองโดยใช้ `req.ip` ตรง ๆ** — มีปัญหา IPv6 representation ต้องใช้ helper `ipKeyGenerator` ของไลบรารีแทน
- **สลับลำดับ `userLimiter` มาก่อน `authenticateToken`** — `keyGenerator` จะอ่าน `req.user` ที่ยังเป็น `undefined`
- **สร้าง limiter instance ใหม่ทุกครั้งที่ route handler ถูกเรียก** เช่น ประกาศ `rateLimit({...})` ไว้ข้างในฟังก์ชัน route handler แทนที่ระดับบนของไฟล์ — ทุก request จะได้ counter ใหม่ของตัวเองเสมอ ทำให้ rate limit ไม่มีผลเลยในทางปฏิบัติ (ไม่เคยถึงโควตาเพราะนับใหม่ทุกครั้ง) ต้องสร้าง instance ครั้งเดียวที่ module scope แล้วนำไปใช้ซ้ำ
- **ลืมว่าค่า default ของ `skipFailedRequests`/`skipSuccessfulRequests` คือ `false` ทั้งคู่** — หมายความว่าค่าเริ่มต้นนับทุก request ไม่ว่าผลลัพธ์จะเป็น 2xx หรือ error ก็ตาม ถ้าต้องการนับเฉพาะ login ที่ "ผิดพลาด" เท่านั้น (ไม่นับ login ที่ถูกต้อง) ต้องตั้ง `skipSuccessfulRequests: true` เองอย่างรู้ตัว ไม่ใช่ค่าเริ่มต้น
- **ใช้ limiter ตัวเดียวกันครอบทั้ง `GET` และ `POST`/`PUT`/`DELETE` ของ resource เดียวกัน** โดยตั้งใจจะให้โควตาต่างกันตาม HTTP method — `express-rate-limit` ไม่แยกตาม method โดยอัตโนมัติ ถ้าต้องการโควตาต่างกันตาม method ต้องตรวจสอบ `req.method` เองใน `skip` หรือสร้าง limiter แยกแล้ว mount เฉพาะ method ที่ต้องการ (เช่นผ่าน `router.post(path, limiter, handler)` แทน `app.use(path, limiter)`)
- **เข้าใจผิดว่า reset ของ `windowMs` คือ sliding window** — ค่าเริ่มต้นของ `express-rate-limit` (fixed window) counter จะรีเซ็ตเป็น 0 ทันทีที่ครบ `windowMs` นับจากคำขอแรกของหน้าต่างนั้น ไม่ใช่แบบ sliding ที่ขยับหน้าต่างตามเวลาปัจจุบันตลอด ทำให้เกิดช่องโหว่เล็ก ๆ ที่ผู้โจมตียิง request จำนวนมากในช่วงท้ายของหน้าต่างหนึ่ง แล้วยิงอีกจำนวนมากทันทีที่หน้าต่างใหม่เริ่ม (ได้โควตาสองเท่าในเวลาสั้น ๆ คร่อมรอยต่อ)

---

## 7. ตัวเลือก/พารามิเตอร์เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `skip` | ฟังก์ชัน (sync/async) รับ `req`/`res` คืน `true` เพื่อข้ามการนับ/จำกัดของ request นั้นไปเลย เช่น ข้าม rate limit สำหรับ IP ของทีมทดสอบภายใน |
| `skipFailedRequests` | ถ้า `true` จะไม่นับ request ที่ตอบด้วย status code ที่ error (เช่น `401`) เป็นส่วนหนึ่งของโควตา |
| `skipSuccessfulRequests` | ถ้า `true` จะไม่นับ request ที่ตอบสำเร็จ (2xx) เป็นส่วนหนึ่งของโควตา เหมาะกับ limiter ที่ต้องการนับเฉพาะความพยายามที่ผิดพลาด เช่น login ผิดรหัสผ่านซ้ำ ๆ |
| `handler` | ฟังก์ชันกำหนดเองที่เรียกเมื่อเกินโควตา (แทนการตอบด้วย `message`/status เริ่มต้น) รับ `(req, res, next, options)` ใช้เมื่อต้องการ custom logic เพิ่มเติม เช่น log การถูกบล็อก |
| `statusCode` | HTTP status code ที่ตอบเมื่อเกินโควตา ค่าเริ่มต้นคือ `429` เปลี่ยนได้ถ้าจำเป็น (ไม่แนะนำให้เปลี่ยนโดยไม่มีเหตุผล เพราะ `429` เป็นมาตรฐานที่ client/Postman คาดหวัง) |
| `store` | กำหนด store ภายนอกแทน in-memory store เริ่มต้น เช่น `RedisStore` จากแพ็กเกจ `rate-limit-redis` จำเป็นเมื่อ deploy หลาย instance (ดูหัวข้อ 6) |
| `requestPropertyName` | ชื่อ property ที่ middleware นี้แนบข้อมูล rate limit (เช่น `remaining`, `limit`) ไว้ใน `req` object ค่าเริ่มต้นคือ `rateLimit` เข้าถึงได้ผ่าน `req.rateLimit` ใน handler ถัดไป |
| `identifier`/`name` (บางเวอร์ชัน) | ใช้ตั้งชื่อ limiter เพื่อแยก log/debug เมื่อมีหลาย limiter ทำงานพร้อมกันในระบบเดียว |

---

## 8. ตัวอย่างโค้ดเพิ่มเติม

### 8.1 Limiter ที่นับเฉพาะ login ที่ผิดพลาด (ไม่นับ login ที่ถูกต้อง)

```javascript
const loginFailureLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // login ที่ถูกต้อง (2xx) ไม่ถูกนับเป็นส่วนหนึ่งของโควตา
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: { code: "TOO_MANY_FAILED_ATTEMPTS", message: "พยายามเข้าสู่ระบบผิดเกินจำนวนที่กำหนด กรุณาลองใหม่ภายหลัง" },
  },
});

app.use("/auth/login", loginFailureLimiter);
```

ผู้ใช้ที่พิมพ์รหัสผ่านถูกต้องตั้งแต่ครั้งแรกจะไม่ถูกจำกัดเลย มีแต่ผู้ที่พิมพ์ผิดซ้ำ ๆ (ลักษณะ brute-force) เท่านั้นที่โควตาลดลง

### 8.2 ยกเว้น Rate Limit สำหรับ IP ภายใน (เช่น เครื่อง CI/CD ที่รัน Newman ทดสอบ)

```javascript
const INTERNAL_IPS = ["127.0.0.1", "::1"];

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skip: (req) => INTERNAL_IPS.includes(req.ip),
  standardHeaders: "draft-7",
  legacyHeaders: false,
});
```

### 8.3 Custom handler เพื่อ log เมื่อมี IP ถูกบล็อกบ่อยผิดปกติ (เฝ้าระวัง brute-force)

```javascript
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    console.warn(`[SECURITY] Rate limit exceeded: key=${options.keyGenerator(req)} path=${req.originalUrl}`);
    res.status(options.statusCode).json(options.message);
  },
});
```

### 8.4 ใช้ Redis store เพื่อให้หลาย instance นับโควตาร่วมกัน (เมื่อ scale เกิน 1 process)

```bash
npm install rate-limit-redis redis
```

```javascript
const { RedisStore } = require("rate-limit-redis");
const { redisClient } = require("./cache"); // client จาก ref-redis.md ที่ connect() ไว้แล้ว

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args), // ใช้ connection เดียวกับที่ใช้ทำ caching
  }),
});
```

## เอกสารอ้างอิงประกอบ

- express-rate-limit (GitHub): https://github.com/express-rate-limit/express-rate-limit
- เนื้อหาสอนเต็ม (Rate Limiting vs Throttling, trust proxy, key generator): [wk12.md](wk12.md)
- ปฏิบัติการ: [wk12-lab.md](wk12-lab.md)
- ไลบรารีคู่กัน (Throttling): [ref-express-slow-down.md](ref-express-slow-down.md)

ต้องเรียก `redisClient.connect()` ให้เสร็จก่อน request แรกเข้ามาเช่นเดียวกับที่ทำไว้ตอนตั้งค่า caching (ดู [ref-redis.md](ref-redis.md) หัวข้อ 2)
