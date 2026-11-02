# คู่มืออ้างอิง Redis (node-redis v4+) (Quick Reference)

เอกสารนี้สรุปคำสั่ง Redis (ผ่าน `redis` package เวอร์ชัน 4 ขึ้นไป) ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (เมื่อใดควรทำแคช, Cache Invalidation, Cache Stampede) อยู่ใน [wk07.md](wk07.md) หัวข้อ 1-3 ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

> **คำเตือนเรื่องเวอร์ชัน**: `npm install redis` ปัจจุบันได้ node-redis v4+ ซึ่ง API เปลี่ยนจาก v3 มาก (ต้องเรียก `connect()` เอง, ทุกคำสั่งคืน Promise, TTL ใช้ object `{ EX: 60 }`) โค้ดตัวอย่างบนอินเทอร์เน็ตที่ใช้ callback หรือไม่เรียก `connect()` คือสไตล์ v3 ใช้กับคู่มือนี้ไม่ได้

## สารบัญ

1. [ติดตั้งและสร้าง Client](#1-ติดตั้งและสร้าง-client)
2. [เชื่อมต่อก่อนเปิดเซิร์ฟเวอร์](#2-เชื่อมต่อก่อนเปิดเซิร์ฟเวอร์)
3. [set/get/del พื้นฐาน](#3-setgetdel-พื้นฐาน)
4. [รูปแบบ Cache-aside ใน Route Handler](#4-รูปแบบ-cache-aside-ใน-route-handler)
5. [ตั้งชื่อ Cache Key](#5-ตั้งชื่อ-cache-key)
6. [ป้องกัน Cache Stampede ด้วย Lock](#6-ป้องกัน-cache-stampede-ด้วย-lock)
7. [ข้อผิดพลาดที่พบบ่อย](#7-ข้อผิดพลาดที่พบบ่อย)
8. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#8-ตัวเลือกพารามิเตอร์เพิ่มเติม)
9. [ตัวอย่างโค้ดเพิ่มเติม](#9-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้งและสร้าง Client

```bash
npm install redis
```

```javascript
// cache.js
require("dotenv").config();
const { createClient } = require("redis");

const redisClient = createClient({
  url: process.env.REDIS_URL || "redis://localhost:6379",
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

async function connectRedis() {
  await redisClient.connect();
}

module.exports = { redisClient, connectRedis };
```

---

## 2. เชื่อมต่อก่อนเปิดเซิร์ฟเวอร์

```javascript
// index.js
const { connectRedis } = require("./cache");

connectRedis().then(() => {
  app.listen(PORT, () => console.log(`Server กำลังทำงานที่พอร์ต ${PORT}`));
});
```

ต้องรอ `connectRedis()` เสร็จก่อนเปิดรับ request มิฉะนั้น request ที่มาถึงก่อนเชื่อมต่อเสร็จจะโยน error

---

## 3. set/get/del พื้นฐาน

Redis เก็บข้อมูลเป็น **string เท่านั้น** ต้อง `JSON.stringify`/`JSON.parse` เองเสมอ และทุกคำสั่งต้อง `await`

```javascript
await redisClient.set("students:all", JSON.stringify(data), { EX: 60 }); // TTL 60 วินาที
const cached = await redisClient.get("students:all"); // คืน string หรือ null
const data = cached ? JSON.parse(cached) : null;

await redisClient.del("students:all"); // ลบ key เดียว
await redisClient.del(["students:all", "students:page:1"]); // ลบหลาย key
```

| ตัวเลือก TTL | ความหมาย |
| --- | --- |
| `{ EX: seconds }` | หมดอายุใน N วินาที |
| `{ PX: milliseconds }` | หมดอายุใน N มิลลิวินาที |
| `{ NX: true }` | set เฉพาะเมื่อ key ยังไม่มีอยู่ (ใช้ทำ lock — ดูหัวข้อ 6) |

---

## 4. รูปแบบ Cache-aside ใน Route Handler

```javascript
app.get("/api/v1/students", async (req, res, next) => {
  try {
    const cacheKey = "students:all";
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return res.status(200).json({ message: "สำเร็จ (จากแคช)", data: JSON.parse(cached) });
    }

    const [rows] = await pool.query("SELECT * FROM students");
    await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 60 });
    res.status(200).json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});

app.post("/api/v1/students", async (req, res, next) => {
  try {
    // ... เพิ่มข้อมูลลงฐานข้อมูล ...
    await redisClient.del("students:all"); // ล้างแคชเมื่อข้อมูลเปลี่ยน (explicit invalidation)
    res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ" });
  } catch (err) {
    next(err);
  }
});
```

---

## 5. ตั้งชื่อ Cache Key

ใช้ `:` คั่นเป็นลำดับชั้นเพื่ออ่านง่ายและกัน key ชนกัน

| cache key | ข้อมูลที่อ้างถึง |
| --- | --- |
| `students:all` | รายชื่อนิสิตทั้งหมด |
| `students:page:2` | รายชื่อนิสิตหน้าที่ 2 |
| `students:major:CS` | รายชื่อนิสิตเฉพาะสาขา CS |
| `student:42` | ข้อมูลนิสิตคนเดียว id 42 |

---

## 6. ป้องกัน Cache Stampede ด้วย Lock

เมื่อ key ยอดนิยมหมดอายุพร้อมมีคำขอจำนวนมาก ทุกคำขอจะเห็น cache miss พร้อมกันแล้วแย่ง query ฐานข้อมูล วิธีแก้พื้นฐานคือให้คำขอแรกเป็น "ผู้ชนะ" คนเดียวที่ไป query

```javascript
const lockKey = `lock:students:all`;
const acquired = await redisClient.set(lockKey, "1", { NX: true, EX: 10 }); // ได้ lock เฉพาะเมื่อยังไม่มีคนถือ

if (acquired) {
  // ผู้ชนะ: query ฐานข้อมูล เขียนผล แล้วลบ lock
  const [rows] = await pool.query("SELECT * FROM students");
  await redisClient.set("students:all", JSON.stringify(rows), { EX: 60 });
  await redisClient.del(lockKey);
} else {
  // ผู้แพ้: รอสั้น ๆ แล้ววนอ่านแคชใหม่ (ผู้ชนะน่าจะเขียนผลไว้แล้ว)
}
```

ไม่ใช่ขอบเขตบังคับของแล็บ — อ่านเพื่อรู้ไว้ว่ามีแนวทางนี้อยู่ (ดู [wk07.md](wk07.md) หัวข้อ 3.4)

---

## 7. ข้อผิดพลาดที่พบบ่อย

- **ลืมเรียก `connect()` ก่อนใช้งาน** — node-redis v4+ ไม่ต่ออัตโนมัติเหมือน v3 เรียก `get`/`set` ก่อนเชื่อมต่อสำเร็จจะโยน `ClientClosedError` ทันที
- **ใส่ object ตรงให้ `set()` โดยไม่ `JSON.stringify`** — Redis เก็บ string เท่านั้น ต้องแปลงเองทั้งตอนเก็บและตอนอ่าน (`JSON.parse`)
- **ใช้ syntax แบบ v3** เช่น callback หรือ `"EX", 60` แทน object `{ EX: 60 }` — ใช้กับ v4+ ไม่ได้
- **ไม่ล้างแคชหลังข้อมูลเปลี่ยน** — ผู้ใช้เห็นข้อมูลเก่าจนกว่า TTL จะหมดอายุเอง ต้องเรียก `del()` ที่เกี่ยวข้องทุกครั้งที่มีการเขียนข้อมูลใหม่
- **ทำแคชข้อมูลที่ต้อง real-time** เช่น ยอดเงินคงเหลือ — Caching เหมาะกับข้อมูลที่ยอมรับความล้าสมัยชั่วคราวได้เท่านั้น
- **TTL เดียวกันทุก key ที่มีจำนวนมาก** — เสี่ยง Cache Stampede เมื่อหมดอายุพร้อมกันทั้งหมด ควรสุ่ม jitter เล็กน้อยในค่า TTL
- **ไม่จัดการ event `error` ของ client แล้วแอปล่มไม่มีสาเหตุชัดเจน** — ถ้าไม่ลงทะเบียน `redisClient.on("error", ...)` เมื่อ Redis server ล่มหรือเชื่อมต่อขาด ไลบรารีจะโยน unhandled error event ซึ่งอาจทำให้ Node.js process ล่มทั้งตัวโดยไม่มี log ที่ชัดเจนว่าสาเหตุคือ Redis
- **ปล่อยให้ cache miss ทำให้ทั้ง endpoint ล่มเมื่อ Redis down** — ถ้าเขียนโค้ดแบบไม่มี `try/catch` รอบการเรียก Redis และ Redis server ล่ม การเรียก `get()`/`set()` จะ throw error ทำให้ endpoint ทั้งตัวตอบ `500` ทั้งที่ควร fallback ไปอ่านฐานข้อมูลตรงได้ (graceful degradation) ควรครอบ logic เกี่ยวกับ cache ด้วย `try/catch` แยกจาก logic หลัก
- **ลืมว่า key ที่ไม่มี TTL จะอยู่ตลอดไป (ไม่มีวันหมดอายุ)** — ถ้า `set()` โดยไม่ระบุ `EX`/`PX` เลย key นั้นจะค้างอยู่ใน Redis memory ตลอดไปจนกว่าจะถูก `del()` เองหรือ Redis เต็มแล้ว evict ตาม policy ทำให้ memory ใช้สูงขึ้นเรื่อย ๆ โดยไม่ตั้งใจถ้ามี key ลักษณะนี้จำนวนมาก
- **ใช้ connection Redis ตัวเดียวกันทำทั้ง cache และ pub/sub** — คำสั่งที่เกี่ยวกับ subscribe (เช่น `SUBSCRIBE`) จะเปลี่ยนโหมดของ connection นั้นทั้งหมด ทำให้เรียกคำสั่งอื่น (`GET`/`SET`) ผ่าน connection เดียวกันไม่ได้อีก ต้องสร้าง client แยกสำหรับ pub/sub (`redisClient.duplicate()`) หากต้องใช้ทั้งสองแบบพร้อมกัน
- **เข้าใจผิดว่า `del()` คืนค่า boolean** — `redisClient.del()` คืนค่าเป็นจำนวน key ที่ถูกลบจริง (number) ไม่ใช่ `true`/`false` ถ้า key ไม่มีอยู่แล้วจะคืน `0` ไม่ใช่ error หรือ `false`

---

## 8. ตัวเลือก/พารามิเตอร์เพิ่มเติม

| ตัวเลือก/คำสั่ง | ความหมาย |
| --- | --- |
| `{ KEEPTTL: true }` ใน `set()` | เขียนค่าใหม่ทับ key เดิมโดยไม่รีเซ็ต TTL ที่เหลืออยู่ (ปกติ `set()` แบบไม่มี `EX` ใหม่จะลบ TTL เดิมทิ้งและทำให้ key ไม่มีวันหมดอายุอีก) |
| `{ XX: true }` ใน `set()` | set ค่าเฉพาะเมื่อ key มีอยู่แล้วเท่านั้น (ตรงข้ามกับ `NX`) ใช้เมื่อต้องการอัปเดตค่าที่มีอยู่โดยไม่สร้าง key ใหม่โดยไม่ตั้งใจ |
| `redisClient.expire(key, seconds)` | กำหนด/แก้ไข TTL ของ key ที่มีอยู่แล้วแยกจากคำสั่ง `set()` มีประโยชน์เมื่อต้องการต่ออายุ cache โดยไม่เขียนค่าใหม่ |
| `redisClient.ttl(key)` | อ่านเวลาที่เหลือก่อน key หมดอายุ (วินาที) คืน `-1` ถ้า key ไม่มี TTL และ `-2` ถ้า key ไม่มีอยู่จริง ใช้ debug ปัญหา cache ได้ |
| `redisClient.exists(key)` | ตรวจสอบว่า key มีอยู่หรือไม่ โดยไม่ต้องดึงค่าออกมาทั้งหมด คืน `1`/`0` |
| `redisClient.incr(key)` / `.decr(key)` | เพิ่ม/ลดค่าตัวเลขของ key แบบ atomic เหมาะกับการนับจำนวนครั้ง เช่น นับ view count หรือใช้ทำ custom rate limiter |
| `redisClient.mGet([keys])` / `.mSet({...})` | อ่าน/เขียนหลาย key พร้อมกันในคำสั่งเดียว ลด round-trip ไปยัง Redis server เมื่อต้องจัดการหลาย key ที่เกี่ยวข้องกัน |
| `redisClient.keys(pattern)` | ค้นหา key ทั้งหมดที่ตรงกับ pattern เช่น `"students:*"` **คำเตือน**: คำสั่งนี้ scan ทั้ง database แบบ blocking ห้ามใช้ใน production ที่มีข้อมูลจำนวนมาก ให้ใช้ `SCAN` แทนถ้าจำเป็น |
| `redisClient.flushAll()` | ลบข้อมูลทุก key ในทุก database ของ Redis instance ใช้เฉพาะตอนทดสอบ/ล้างข้อมูลระหว่างพัฒนาเท่านั้น ห้ามเรียกใน production code |
| `redisClient.duplicate()` | สร้าง client ตัวใหม่ที่ใช้ config เดียวกัน (connection แยกกัน) จำเป็นเมื่อต้องใช้ pub/sub ควบคู่กับคำสั่งอื่น |

---

## 9. ตัวอย่างโค้ดเพิ่มเติม

### 9.1 Graceful degradation เมื่อ Redis ล่ม (fallback ไปอ่านฐานข้อมูลตรง)

```javascript
app.get("/api/v1/students", async (req, res, next) => {
  try {
    const cacheKey = "students:all";
    let cached = null;
    try {
      cached = await redisClient.get(cacheKey);
    } catch (redisErr) {
      console.error("Redis ใช้งานไม่ได้ ข้ามไปอ่านฐานข้อมูลตรง:", redisErr.message);
    }

    if (cached) {
      return res.status(200).json({ message: "สำเร็จ (จากแคช)", data: JSON.parse(cached) });
    }

    const [rows] = await pool.query("SELECT * FROM students");
    try {
      await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 60 });
    } catch (redisErr) {
      console.error("เขียนแคชไม่สำเร็จ แต่ยังตอบข้อมูลจากฐานข้อมูลได้:", redisErr.message);
    }
    res.status(200).json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});
```

endpoint ยังทำงานได้ปกติแม้ Redis ล่ม เพียงแต่ไม่มีแคชช่วยลดโหลดฐานข้อมูลในช่วงนั้น

### 9.2 ลบแคชแบบ pattern เมื่อข้อมูลหลายหน้าเปลี่ยนพร้อมกัน

```javascript
// เมื่อเพิ่มนิสิตใหม่ ต้องล้างแคชทั้ง students:all และ students:page:* ที่เกี่ยวข้อง
async function invalidateStudentListCache() {
  await redisClient.del("students:all");

  // ใช้ scanIterator แทน keys() เพื่อไม่ block Redis server (ปลอดภัยกว่าสำหรับ production)
  const keysToDelete = [];
  for await (const key of redisClient.scanIterator({ MATCH: "students:page:*" })) {
    keysToDelete.push(key);
  }
  if (keysToDelete.length > 0) {
    await redisClient.del(keysToDelete);
  }
}
```

### 9.3 ต่ออายุ Cache โดยไม่ query ฐานข้อมูลใหม่ (sliding expiration)

```javascript
app.get("/api/v1/students/:id", async (req, res, next) => {
  try {
    const cacheKey = `student:${req.params.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      await redisClient.expire(cacheKey, 60); // ต่ออายุ TTL ทุกครั้งที่มีคนเข้าถึง (ข้อมูลที่ถูกเข้าถึงบ่อยจะไม่หมดอายุง่าย)
      return res.status(200).json({ message: "สำเร็จ (จากแคช)", data: JSON.parse(cached) });
    }

    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [req.params.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: { code: "STUDENT_NOT_FOUND" } });
    }
    await redisClient.set(cacheKey, JSON.stringify(rows[0]), { EX: 60 });
    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});
```

### 9.4 ใช้ `incr()` ทำ counter แบบ atomic (เช่น นับจำนวนครั้งที่ดู endpoint)

```javascript
app.get("/api/v1/courses/:id", async (req, res, next) => {
  try {
    const viewCountKey = `course:${req.params.id}:views`;
    // incr() เป็น atomic operation ปลอดภัยแม้มีหลาย request เข้ามาพร้อมกัน ไม่ต้องใช้ lock แบบหัวข้อ 6
    await redisClient.incr(viewCountKey);

    const [rows] = await pool.query("SELECT * FROM courses WHERE id = ?", [req.params.id]);
    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});
```

## เอกสารอ้างอิงประกอบ

- node-redis (client library): https://github.com/redis/node-redis
- Redis SET command (EX/PX/NX): https://redis.io/docs/latest/commands/set/
- Redis keyspace (key expiration, eviction policy): https://redis.io/docs/latest/develop/using-commands/keyspace/
- เนื้อหาสอนเต็ม (Caching, TTL, Cache Stampede): [wk07.md](wk07.md)
- ปฏิบัติการ: [wk07-lab.md](wk07-lab.md)
