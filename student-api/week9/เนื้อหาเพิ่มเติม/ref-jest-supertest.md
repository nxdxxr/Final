# คู่มืออ้างอิง Jest & Supertest (Quick Reference)

เอกสารนี้สรุปคำสั่ง Jest และ Supertest ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (Testing Pyramid, เหตุผลที่ต้อง mock, การอ่าน Coverage) อยู่ใน [wk09.md](wk09.md) ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้งและตั้งค่า](#1-ติดตั้งและตั้งค่า)
2. [โครงสร้าง Arrange-Act-Assert](#2-โครงสร้าง-arrange-act-assert)
3. [Matcher ที่ใช้บ่อย](#3-matcher-ที่ใช้บ่อย)
4. [Hook: beforeEach/afterEach/beforeAll/afterAll](#4-hook-beforeeachaftereachbeforeallafterall)
5. [แยก app.js จาก server.js เพื่อใช้ Supertest](#5-แยก-appjs-จาก-serverjs-เพื่อใช้-supertest)
6. [ทดสอบ Endpoint ด้วย Supertest](#6-ทดสอบ-endpoint-ด้วย-supertest)
7. [Mocking ด้วย jest.fn() และ jest.mock()](#7-mocking-ด้วย-jestfn-และ-jestmock)
8. [Test Coverage](#8-test-coverage)
9. [ข้อผิดพลาดที่พบบ่อย](#9-ข้อผิดพลาดที่พบบ่อย)
10. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#10-ตัวเลือกพารามิเตอร์เพิ่มเติม)
11. [ตัวอย่างโค้ดเพิ่มเติม](#11-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้งและตั้งค่า

```bash
npm install --save-dev jest supertest
```

```json
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

Jest ค้นหาไฟล์ที่ลงท้าย `.test.js` หรืออยู่ในโฟลเดอร์ `__tests__` โดยอัตโนมัติ ไม่ต้องตั้งค่าเพิ่ม

---

## 2. โครงสร้าง Arrange-Act-Assert

```javascript
describe("auth-helpers", () => {
  test("hashPassword ควรคืนค่าที่ไม่ตรงกับรหัสผ่านต้นฉบับ", async () => {
    // Arrange
    const plainPassword = "Passw0rd!";
    // Act
    const hashed = await hashPassword(plainPassword);
    // Assert
    expect(hashed).not.toBe(plainPassword);
  });
});
```

รันด้วย `npm test`

---

## 3. Matcher ที่ใช้บ่อย

| Matcher | ความหมาย | ตัวอย่าง |
| --- | --- | --- |
| `toBe(value)` | ค่าตรงกันแบบ `===` (primitive) | `expect(status).toBe(200)` |
| `toEqual(value)` | deep equality ของ object/array | `expect(body).toEqual({ id: 1 })` |
| `toBeNull()` | ค่าเป็น `null` | `expect(err).toBeNull()` |
| `toBeGreaterThan(n)` | ค่ามากกว่าที่กำหนด | `expect(list.length).toBeGreaterThan(0)` |
| `toContain(item)` | array/string มีค่านี้อยู่ | `expect(roles).toContain("admin")` |
| `toHaveProperty(path)` | object มี property นี้ | `expect(body).toHaveProperty("data.id")` |
| `toThrow()` | ฟังก์ชัน sync โยน error | `expect(() => fn()).toThrow()` |
| `rejects.toThrow()` | Promise ถูก reject พร้อม error | `await expect(login()).rejects.toThrow()` |
| `toHaveBeenCalledWith(...)` | mock function ถูกเรียกด้วยค่านี้ | `expect(fn).toHaveBeenCalledWith("x")` |
| `toHaveBeenCalledTimes(n)` | mock function ถูกเรียกกี่ครั้ง | `expect(fn).toHaveBeenCalledTimes(1)` |

---

## 4. Hook: beforeEach/afterEach/beforeAll/afterAll

| Hook | ทำงานเมื่อใด | เหมาะกับ |
| --- | --- | --- |
| `beforeEach`/`afterEach` | ก่อน/หลัง **ทุก** test | รีเซ็ตสถานะให้ test isolation |
| `beforeAll`/`afterAll` | ก่อน test แรก/หลัง test สุดท้าย **ครั้งเดียว** | งานต้นทุนสูง เช่น เปิด/ปิดฐานข้อมูลทดสอบ |

```javascript
beforeAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
});

afterAll(async () => {
  await pool.query("DELETE FROM users WHERE email LIKE '%@example.com'");
  await pool.end();
});
```

---

## 5. แยก app.js จาก server.js เพื่อใช้ Supertest

Supertest ต้อง import `app` โดยไม่ให้ `app.listen()` ถูกเรียกไปด้วย จึงต้องแยกไฟล์

```javascript
// app.js — ประกาศ route/middleware ทั้งหมด ไม่เรียก listen()
const express = require("express");
const app = express();
app.use(express.json());
// ... route ทั้งหมด ...
module.exports = app;
```

```javascript
// server.js — จุดเริ่มต้นจริง เรียก listen() ที่นี่เท่านั้น
const app = require("./app");
app.listen(process.env.PORT || 3000);
```

---

## 6. ทดสอบ Endpoint ด้วย Supertest

```javascript
const request = require("supertest");
const app = require("./app");

describe("POST /api/v1/auth/register", () => {
  test("ควรคืน 201 เมื่อข้อมูลถูกต้อง", async () => {
    const response = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "newuser@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(201);
    expect(response.body.data).toHaveProperty("id");
  });
});
```

```javascript
// แนบ header เช่น Authorization
await request(app)
  .get("/api/v1/auth/me")
  .set("Authorization", `Bearer ${token}`);
```

ไม่ต้องเปิดพอร์ตจริงด้วย `app.listen()` — Supertest ส่ง request เข้าไปใน memory ตรง ๆ

---

## 7. Mocking ด้วย jest.fn() และ jest.mock()

```javascript
// mock ฟังก์ชันเดี่ยว
const mockCallback = jest.fn();
mockCallback("hello");
expect(mockCallback).toHaveBeenCalledWith("hello");

// กำหนดค่าที่ต้องการคืน
const mockFn = jest.fn().mockReturnValue(42); // sync
const mockAsyncFn = jest.fn().mockResolvedValue({ id: 1 }); // async (คืน Promise)
```

```javascript
// mock module ทั้งไฟล์ — ต้องเรียกที่ระดับบนสุดของไฟล์เสมอ (Jest hoist ขึ้นไปก่อน require อื่น)
jest.mock("./db");
const pool = require("./db");

test("ควรคืน token เมื่อ email ถูกต้อง", async () => {
  pool.query.mockResolvedValueOnce([[{ id: 1, email: "test@example.com", password_hash: hashed }]]);
  const response = await request(app).post("/api/v1/auth/login").send({ email: "test@example.com", password: "Passw0rd!" });
  expect(response.status).toBe(200);
});
```

| เมื่อใดควร mock | เมื่อใดไม่ควร mock |
| --- | --- |
| ทดสอบ route ที่เรียกฐานข้อมูล แต่ต้องการความเร็ว/ไม่พึ่งฐานข้อมูล | ทดสอบว่าเชื่อมต่อฐานข้อมูลจริงได้ตาม schema (ต้องเป็น Integration Test จริง) |
| ทดสอบการเรียก External API ระหว่างพัฒนา | ทดสอบ logic ล้วน ๆ ที่ไม่มี I/O (ไม่จำเป็นต้อง mock) |

---

## 8. Test Coverage

```bash
npm run test:coverage
```

```
File                | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
auth-helpers.js     |  100.0  |  100.0   |  100.0  |  100.0  |
middlewares/auth.js |   65.0  |   50.0   |   66.7  |   65.0  | 25-31,45
```

Coverage สูงไม่ได้แปลว่า test ดี — ต้องมี `expect()` ตรวจสอบผลลัพธ์จริง ไม่ใช่แค่เรียกฟังก์ชันให้ทำงาน (ดู [wk09.md](wk09.md) หัวข้อ 5.3)

---

## 9. ข้อผิดพลาดที่พบบ่อย

- **ไม่แยก `app.js` จาก `server.js`** — import `app` มาทดสอบไม่ได้ เพราะ `app.listen()` จะถูกเรียกทันทีทุกครั้งที่ import ไฟล์เดิม
- **เขียน `jest.mock()` ไว้ใน `test()`/`describe()`** — ต้องอยู่ที่ระดับบนสุดของไฟล์เท่านั้น เพราะ Jest hoist คำสั่งนี้ขึ้นไปก่อน `require` อื่นเสมอ
- **ทดสอบ route ที่ชนฐานข้อมูลจริงโดยไม่ล้างข้อมูล** — รันซ้ำแล้วชน `UNIQUE` constraint เดิม ต้องใช้ `beforeAll`/`afterAll` ล้างข้อมูลทดสอบ หรือ mock database layer ไปเลย
- **ใช้ `beforeEach` กับงานต้นทุนสูง (เช่น เปิด connection ใหม่ทุก test)** — ทำให้ชุดทดสอบช้าลงมากโดยไม่จำเป็น ควรใช้ `beforeAll` แทน
- **เขียน test ที่ไม่มี `expect()` เลย** — เพิ่ม coverage แต่ไม่ตรวจอะไรจริง ตรวจจับบั๊กไม่ได้
- **ไล่ให้ Coverage 100% ทุกไฟล์** — มักนำไปสู่ test ที่ไม่มีความหมายเพียงเพื่อให้ตัวเลขสูง ควรใช้ coverage เป็นตัวช่วยหาจุดที่ขาดการทดสอบแทน
- **ลืม `await` หน้า `request(app)...`** — Supertest คืน Promise เสมอ ถ้าไม่ `await`/`return` test จะจบ (pass) ก่อนที่ request จะเสร็จจริง ทำให้ `expect()` ที่เขียนไว้หลังจากนั้นไม่ถูกรันเลยแต่ Jest ไม่รู้ตัว (test ดูเหมือนผ่านทั้งที่ไม่ได้ตรวจอะไร)
- **เขียน test ที่พึ่งพาลำดับการรันของ test อื่น** เช่น test ที่สองสมมติว่า test แรกสร้าง user ไว้แล้วใน DB — ค่าเริ่มต้นของ Jest รัน test ในไฟล์เดียวกันตามลำดับที่เขียนก็จริง แต่ไม่ควรออกแบบให้ test ต้องพึ่งพาผลข้างเคียงของ test ก่อนหน้า เพราะเปลี่ยนลำดับ/รันแยกไฟล์ด้วย `--testPathPattern` จะพังทันที ควรให้ทุก test สร้างข้อมูลที่ต้องการเองใน `beforeEach`/ต้นของ test นั้น
- **ใช้ `toBe()` เทียบ object/array** — `toBe()` เทียบด้วย `===` ซึ่งเทียบ reference ไม่ใช่ค่าภายใน สอง object ที่หน้าตาเหมือนกันทุกอย่างแต่เป็นคนละ instance จะ fail เสมอ ต้องใช้ `toEqual()` สำหรับ object/array
- **รัน test ที่แก้ไขฐานข้อมูลจริงพร้อมกันหลาย worker (Jest ค่าเริ่มต้นรันแบบ parallel)** — Jest รันแต่ละไฟล์ test แบบ parallel ใน worker process แยกกันโดยปริยาย ถ้าหลายไฟล์ทดสอบ route เดียวกันที่แก้ข้อมูลแถวเดียวกันในฐานข้อมูลจริง อาจชนกัน (race condition ระหว่าง test ไม่ใช่ระหว่าง user) ควรแยกข้อมูลทดสอบของแต่ละไฟล์ให้ไม่ชนกัน หรือรันด้วย `--runInBand` เมื่อจำเป็น
- **Mock function แล้วไม่ clear ระหว่าง test (`mockClear`/`resetAllMocks`)** — `jest.fn()` ที่ถูกเรียกใน test แรกจะยังจำ call history สะสมไว้ ถ้า test ถัดไปเช็ค `toHaveBeenCalledTimes(1)` อาจได้ค่าที่รวมการเรียกจาก test ก่อนหน้าด้วย ทำให้ assertion ผิดพลาดแบบสุ่มดูเหมือนไม่เสถียร ควรเรียก `jest.clearAllMocks()` ใน `beforeEach` เมื่อใช้ mock ร่วมกันหลาย test
- **ทดสอบ error response โดยเช็คแค่ `status` ไม่เช็ครูปแบบ `error.code`** — endpoint ที่ตอบ `400` ได้จากหลายสาเหตุ (validation ผิด, business rule ผิด) การเช็คแค่ status code ไม่พอจะยืนยันว่า error ที่เกิดขึ้นจริงคือสาเหตุที่ตั้งใจทดสอบ ควรเช็ค `response.body.error.code` ควบคู่เสมอ ตามรูปแบบ `{ error: { code, message } }` ที่ใช้ทั้งโปรเจกต์

---

## 10. ตัวเลือก/พารามิเตอร์เพิ่มเติม

### Matcher เพิ่มเติม

| Matcher | ความหมาย | ตัวอย่าง |
| --- | --- | --- |
| `toMatchObject(obj)` | ตรวจว่า object มี field ย่อยตรงตามที่กำหนด โดยไม่สนใจ field อื่นที่เกินมา | `expect(body.data).toMatchObject({ email: "x@test.com" })` |
| `toBeUndefined()` / `toBeDefined()` | ค่าเป็น/ไม่เป็น `undefined` | `expect(response.body.error).toBeUndefined()` |
| `toBeInstanceOf(Class)` | ตรวจว่าเป็น instance ของ class ที่กำหนด | `expect(err).toBeInstanceOf(jwt.TokenExpiredError)` |
| `toHaveLength(n)` | array/string มีความยาวตามที่กำหนด | `expect(response.body.data).toHaveLength(3)` |
| `toThrowError(message)` | ฟังก์ชัน sync throw error ที่มีข้อความตรงหรือตรงกับ regex | `expect(() => fn()).toThrowError("ต้องระบุ email")` |
| `not.toBe(value)` / `not.toEqual(value)` | กลับผลลัพธ์ของ matcher (negation) | `expect(hashed).not.toBe(plainPassword)` |
| `resolves.toBe(value)` | Promise ที่ resolve คืนค่าตรงตามที่กำหนด | `await expect(hashPassword("x")).resolves.not.toBe("x")` |

### Jest config/CLI เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `testTimeout` (ms) หรือ flag `--testTimeout` | เวลาสูงสุดที่ test หนึ่งตัวรันได้ก่อนถูกตัดว่า timeout ค่าเริ่มต้นคือ 5000ms มีประโยชน์เมื่อ test เรียกฐานข้อมูลจริงที่อาจช้ากว่าปกติ |
| `--runInBand` | รัน test ทุกไฟล์แบบ sequential ใน process เดียว แทนการ parallel หลาย worker ช่วยหลีกเลี่ยง race condition เมื่อหลายไฟล์ test แก้ฐานข้อมูลจริงร่วมกัน |
| `--detectOpenHandles` | ช่วยหา resource ที่ไม่ได้ปิด (เช่น DB connection ที่ไม่ได้ `pool.end()`) ซึ่งทำให้ Jest process ค้างไม่ยอมจบหลังรันเสร็จ |
| `collectCoverageFrom` (ใน `package.json`/`jest.config.js`) | กำหนด pattern ของไฟล์ที่ต้องการนับ coverage เช่น `["routes/**/*.js", "!routes/**/*.test.js"]` เพื่อไม่ให้ไฟล์ test ถูกนับรวมเข้า coverage ของตัวเอง |
| `coverageThreshold` | กำหนดเกณฑ์ขั้นต่ำของ coverage (percent) ที่ต้องผ่าน ถ้าต่ำกว่าเกณฑ์ `jest --coverage` จะ exit ด้วย error ใช้บังคับมาตรฐานใน CI ได้ |
| `jest.fn(implementation)` | สร้าง mock function พร้อมกำหนด implementation ทันทีตอนสร้าง แทนการเรียก `.mockImplementation()` แยกทีหลัง |
| `.mockImplementationOnce(fn)` | กำหนด behavior ของ mock เฉพาะการเรียกครั้งถัดไปครั้งเดียว ครั้งต่อไปจะกลับไปใช้ implementation เดิม (หรือ `undefined` ถ้าไม่มี) |
| `.mockRejectedValue(error)` / `.mockRejectedValueOnce(error)` | กำหนดให้ mock function คืน Promise ที่ reject พร้อม error ที่กำหนด ใช้จำลองกรณี database/external API ล้มเหลว |

---

## 11. ตัวอย่างโค้ดเพิ่มเติม

### 11.1 ทดสอบว่า endpoint ตอบ error ตามรูปแบบ `{ error: { code, message } }` ที่ถูกต้อง

```javascript
describe("POST /api/v1/students", () => {
  test("ควรคืน 400 พร้อม error.code = VALIDATION_ERROR เมื่อ email ไม่ถูกต้อง", async () => {
    const response = await request(app)
      .post("/api/v1/students")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "ทดสอบ", email: "not-an-email", age: 20 });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ field: "email" })]),
    );
  });
});
```

### 11.2 Mock การล้มเหลวของฐานข้อมูลเพื่อทดสอบ error-handling middleware

```javascript
jest.mock("./db");
const pool = require("./db");

describe("GET /api/v1/students เมื่อฐานข้อมูลล้มเหลว", () => {
  test("ควรคืน 500 พร้อม error.code = INTERNAL_ERROR", async () => {
    pool.query.mockRejectedValueOnce(new Error("Connection lost"));

    const response = await request(app).get("/api/v1/students");

    expect(response.status).toBe(500);
    expect(response.body.error.code).toBe("INTERNAL_ERROR");
  });
});
```

### 11.3 ทดสอบ middleware `authenticateToken`/`authorizeRole` แยกจาก route handler (unit test ไม่ผ่าน HTTP)

```javascript
const { authenticateToken, authorizeRole } = require("./middlewares/auth");

describe("authorizeRole middleware", () => {
  test("ควรคืน 403 เมื่อ role ไม่ตรงกับที่อนุญาต", () => {
    const req = { user: { id: 1, role: "student" } };
    const res = {
      status: jest.fn().mockReturnThis(), // mockReturnThis ทำให้ chain .status().json() ได้เหมือน Express จริง
      json: jest.fn(),
    };
    const next = jest.fn();

    authorizeRole("admin")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
```

การทดสอบแบบนี้คือ unit test ล้วน ๆ (ไม่ผ่าน Supertest/HTTP) เหมาะกับการตรวจสอบ logic ของ middleware โดยตรงและเร็วกว่าการยิง request จริงทุกกรณี

### 11.4 ใช้ `beforeEach` เคลียร์ mock history เพื่อไม่ให้ test ก่อนหน้ากระทบกัน

```javascript
jest.mock("./cache");
const { redisClient } = require("./cache");

beforeEach(() => {
  jest.clearAllMocks(); // เคลียร์ call history ของทุก mock ก่อนแต่ละ test เริ่มทำงาน
});

test("ควร set แคชเมื่อ cache miss", async () => {
  redisClient.get.mockResolvedValueOnce(null);
  await request(app).get("/api/v1/students");
  expect(redisClient.set).toHaveBeenCalledTimes(1);
});

test("ควรไม่ query ฐานข้อมูลเมื่อ cache hit", async () => {
  redisClient.get.mockResolvedValueOnce(JSON.stringify([{ id: 1 }]));
  await request(app).get("/api/v1/students");
  expect(redisClient.set).not.toHaveBeenCalled(); // ถ้าไม่เคลียร์ mock จาก test ก่อนหน้า assertion นี้อาจผิดพลาด
});
```

## เอกสารอ้างอิงประกอบ

- Jest Documentation: https://jestjs.io/docs/getting-started
- Jest Mock Functions: https://jestjs.io/docs/mock-functions
- Supertest: https://github.com/ladjs/supertest
- เนื้อหาสอนเต็ม (Testing Pyramid, Mocking, Coverage): [wk09.md](wk09.md)
- ปฏิบัติการ: [wk09-lab.md](wk09-lab.md)
