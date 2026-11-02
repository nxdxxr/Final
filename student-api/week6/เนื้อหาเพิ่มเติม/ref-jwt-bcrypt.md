# คู่มืออ้างอิง JWT & bcrypt (Quick Reference)

เอกสารนี้สรุปคำสั่ง `jsonwebtoken` และ `bcrypt` ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (วงจรชีวิตของ JWT, ความแตกต่าง Authentication/Authorization, RBAC, เหตุผลที่ logout ทันทีไม่ได้) อยู่ใน [wk06.md](wk06.md) ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้ง](#1-ติดตั้ง)
2. [bcrypt: hash และ verify รหัสผ่าน](#2-bcrypt-hash-และ-verify-รหัสผ่าน)
3. [jsonwebtoken: ออก Token (sign)](#3-jsonwebtoken-ออก-token-sign)
4. [jsonwebtoken: ตรวจสอบ Token (verify)](#4-jsonwebtoken-ตรวจสอบ-token-verify)
5. [Middleware ตรวจสอบสิทธิ์](#5-middleware-ตรวจสอบสิทธิ์)
6. [ตั้งค่า .env ที่ต้องมี](#6-ตั้งค่า-env-ที่ต้องมี)
7. [ข้อผิดพลาดที่พบบ่อย](#7-ข้อผิดพลาดที่พบบ่อย)
8. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#8-ตัวเลือกพารามิเตอร์เพิ่มเติม)
9. [ตัวอย่างโค้ดเพิ่มเติม](#9-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้ง

```bash
npm install jsonwebtoken bcrypt
```

```javascript
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
```

---

## 2. bcrypt: hash และ verify รหัสผ่าน

```javascript
const SALT_ROUNDS = 10; // ค่าสมดุลระหว่างความปลอดภัยและความเร็ว ยิ่งสูงยิ่งปลอดภัยแต่ช้าลง

async function hashPassword(plainPassword) {
  return await bcrypt.hash(plainPassword, SALT_ROUNDS);
}

async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword); // คืน true/false
}
```

ทั้งสองฟังก์ชันเป็น async เสมอ ต้อง `await` — ห้ามเทียบ `plainPassword === hashedPassword` ตรง ๆ เพราะ hash มี salt แทรกอยู่ ค่าจะไม่ตรงกันแม้รหัสผ่านถูกต้อง ต้องใช้ `bcrypt.compare()` เท่านั้น

---

## 3. jsonwebtoken: ออก Token (sign)

```javascript
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role }, // payload: อ่านได้เสมอ ห้ามใส่ข้อมูลอ่อนไหว
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }, // เช่น "1h", "15m", "7d" — ต้องกำหนดเสมอ
  );
}
```

| ตัวเลือก | ความหมาย |
| --- | --- |
| `expiresIn` | อายุ token เช่น `"1h"`, `"15m"`, `"7d"` หรือจำนวนวินาที (ตัวเลข) |
| `algorithm` | ค่า default คือ `HS256` (symmetric) ระบุ `RS256`/`ES256` เมื่อใช้ private/public key คู่กัน |

---

## 4. jsonwebtoken: ตรวจสอบ Token (verify)

```javascript
try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET); // synchronous, คืน payload หรือ throw
  console.log(decoded); // { id, email, role, iat, exp }
} catch (err) {
  // err instanceof jwt.TokenExpiredError → token หมดอายุ
  // err instanceof jwt.JsonWebTokenError → signature ผิด/format ผิด
  console.error(err.message);
}
```

`jwt.verify()` ไม่ throw แค่เมื่อ token หมดอายุ แต่ throw ทุกครั้งที่ signature ไม่ตรงหรือ token ผิดรูปแบบด้วย ต้องครอบด้วย `try/catch` เสมอ

---

## 5. Middleware ตรวจสอบสิทธิ์

```javascript
// middlewares/auth.js
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // รูปแบบ "Bearer <token>"

  if (!token) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" } });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token ไม่ถูกต้องหรือหมดอายุ" } });
  }
}

function authorizeRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" } });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "คุณไม่มีสิทธิ์เข้าถึงทรัพยากรนี้" } });
    }
    next();
  };
}

module.exports = { authenticateToken, authorizeRole };
```

```javascript
// ใช้งาน: authenticateToken ต้องมาก่อน authorizeRole เสมอ
app.delete("/api/v1/students/:id", authenticateToken, authorizeRole("admin"), deleteStudent);
```

| ลำดับผิด | ผลลัพธ์ |
| --- | --- |
| `authorizeRole` มาก่อน `authenticateToken` | `req.user` ยังเป็น `undefined` → `TypeError` → `500` แทนที่จะเป็น `401` ที่ถูกต้อง |

---

## 6. ตั้งค่า .env ที่ต้องมี

```
JWT_SECRET=<ค่าสุ่มความยาว 64 ไบต์>
JWT_EXPIRES_IN=1h
```

```bash
# สร้างค่าสุ่มสำหรับ JWT_SECRET (รันครั้งเดียวตอนตั้งโปรเจกต์)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 7. ข้อผิดพลาดที่พบบ่อย

- **ลืม `require("dotenv").config()` ก่อนใช้ `process.env`** — `JWT_SECRET` จะเป็น `undefined`, `jwt.sign()` throw `Error: secretOrPrivateKey must have a value` ทันที
- **ใส่ fallback secret แบบ hardcode** เช่น `process.env.JWT_SECRET || "some-default"` — ทุกคนที่อ่านซอร์สโค้ดจะรู้ secret จริงทันที ห้ามทำเด็ดขาด
- **ลืมกำหนด `expiresIn`** — token ไม่มีวันหมดอายุ ใช้งานได้ตลอดไปแม้รั่วไหล
- **ใส่ข้อมูลอ่อนไหวใน payload** (เช่น รหัสผ่าน, เลขบัตรประชาชน) — payload เป็นแค่ Base64URL อ่านได้เสมอ ไม่ใช่การเข้ารหัสลับ
- **คาดหวังว่า logout จะทำให้ token ใช้ไม่ได้ทันที** — JWT เป็น stateless เซิร์ฟเวอร์ไม่เก็บรายชื่อ token ที่ออกไป token เดิมยังใช้ได้จนกว่าจะหมดอายุตาม `expiresIn` (ดูแนวทางบรรเทาใน [wk06.md](wk06.md) หัวข้อ 2.7)
- **รับ `role` จาก `req.body` ตรงตอน register** — เปิดช่องให้ผู้ใช้ส่ง `{"role": "admin"}` มาเลื่อนสิทธิ์ตัวเอง (Mass Assignment, A01 OWASP Top 10:2025) ต้อง hardcode เป็น `'student'` เสมอตอนสมัครสมาชิก
- **เทียบรหัสผ่านด้วย `===` แทน `bcrypt.compare()`** — ไม่มีทางตรงกัน เพราะ hash มี salt สุ่มแทรกอยู่เสมอ
- **ใช้ `bcrypt.hashSync()`/`bcrypt.compareSync()` ใน route handler ของ Express** — ฟังก์ชัน sync บล็อก event loop ทั้ง process ระหว่างคำนวณ หากมีหลาย request เข้ามาพร้อมกัน request อื่นทั้งหมดจะค้างรอจนกว่า hash/compare ของ request แรกจะเสร็จ ควรใช้ฟังก์ชัน async (`bcrypt.hash`/`bcrypt.compare`) เสมอใน API ที่ต้องรองรับหลาย request พร้อมกัน
- **ใช้ `jwt.decode()` แทน `jwt.verify()` เพื่ออ่าน payload** — `jwt.decode()` ไม่ตรวจสอบ signature เลย ใครก็แก้ payload เองแล้วส่งมาได้โดยไม่ error เหมาะใช้เฉพาะตอน debug/อ่านค่าที่เชื่อถือได้อยู่แล้ว ห้ามใช้แทน `verify()` ในการตรวจสอบสิทธิ์
- **ไม่ตรวจสอบ `algorithms` ตอน verify** — ถ้าไม่ระบุ `algorithms` ใน `jwt.verify()` ไลบรารีจะยอมรับ algorithm ที่ระบุมาใน header ของ token เอง เปิดช่องให้ผู้โจมตีปลอม token ด้วย `alg: "none"` หรือสลับ asymmetric เป็น symmetric ได้ในบางกรณี ควร pin `algorithms: ["HS256"]` ไว้เสมอเมื่อรู้ว่าระบบใช้ algorithm ใด
- **ตั้ง `SALT_ROUNDS` สูงเกินไปจนกระทบ UX หรือต่ำเกินไปจนไม่ปลอดภัย** — ค่าที่สูงขึ้นแต่ละหน่วยทำให้เวลาคำนวณเพิ่มเป็นสองเท่า (exponential) `SALT_ROUNDS` เกิน 12-14 บน server ทั่วไปอาจทำให้ endpoint register/login ช้าเกินไปสำหรับ production จริง ขณะที่ค่าต่ำกว่า 10 ถือว่าอ่อนเกินไปสำหรับมาตรฐานปัจจุบัน
- **ลืมว่า bcrypt จำกัดความยาว input ที่ 72 ไบต์** — รหัสผ่านที่ยาวเกิน 72 ไบต์ ตัวอักษรส่วนที่เกินจะถูก bcrypt ตัดทิ้งเงียบ ๆ โดยไม่ error ทำให้รหัสผ่านสองค่าที่ต่างกันเฉพาะส่วนหลัง 72 ไบต์ อาจ hash ออกมาเหมือนกัน ควรจำกัดความยาวรหัสผ่านสูงสุดไว้ที่ชั้น validation (เช่น Zod `.max(72)`) ตั้งแต่ต้น
- **สร้าง token ใหม่ให้ user ทุกครั้งที่เรียก endpoint ใด ๆ (refresh ทุก request)** — ทำให้ token อายุยาวไม่มีประโยชน์ และเพิ่ม overhead การ sign โดยไม่จำเป็น ควร sign token เฉพาะตอน login/refresh endpoint เท่านั้น

---

## 8. ตัวเลือก/พารามิเตอร์เพิ่มเติม

### `jwt.sign()` options เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `notBefore` | กำหนดว่า token จะยังใช้ไม่ได้จนกว่าจะถึงเวลาที่ระบุ (เช่น `"10s"`) เหมาะกับ token ที่ต้องการให้มีผลในอนาคต |
| `audience` (`aud`) | ระบุว่า token นี้มีไว้ให้ระบบ/service ใดใช้ ตรวจสอบคู่กับ `audience` ใน `jwt.verify()` ป้องกันการนำ token ไปใช้ข้าม service ที่ไม่เกี่ยวข้อง |
| `issuer` (`iss`) | ระบุผู้ออก token เช่นชื่อระบบ ตรวจสอบคู่กับ `issuer` ใน `verify()` |
| `subject` (`sub`) | ระบุตัวตนของ "เจ้าของ" token โดยตรง นิยมใช้เป็น user id แยกจาก field อื่นใน payload |
| `jwtid` (`jti`) | กำหนด unique id ให้ token แต่ละใบ ใช้ประกอบกับ blacklist/revocation list เพื่อตรวจสอบว่า token ใบนี้ถูกเพิกถอนแล้วหรือยัง |
| `noTimestamp` | ถ้าตั้งเป็น `true` จะไม่แทรก `iat` (issued at) ลงใน payload อัตโนมัติ ปกติไม่ควรตั้งเพราะ `iat` มีประโยชน์ตอน debug |

### `jwt.verify()` options เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `algorithms` | array ของ algorithm ที่อนุญาตให้ตรวจสอบ เช่น `["HS256"]` ควรระบุเสมอเพื่อป้องกัน algorithm confusion attack |
| `audience` | ตรวจสอบว่า `aud` ใน token ตรงกับค่าที่กำหนดหรือไม่ ถ้าไม่ตรง throw `JsonWebTokenError` |
| `issuer` | ตรวจสอบว่า `iss` ใน token ตรงกับค่าที่กำหนดหรือไม่ |
| `clockTolerance` | จำนวนวินาทีที่ยอมรับความคลาดเคลื่อนของเวลาระหว่าง server ที่ sign และ server ที่ verify (มีประโยชน์เมื่อ server นาฬิกาไม่ตรงกันเล็กน้อย) |
| `ignoreExpiration` | ถ้าตั้งเป็น `true` จะไม่ตรวจสอบว่า token หมดอายุหรือยัง **ห้ามใช้ใน production** มีไว้สำหรับ debug เท่านั้น |

### `bcrypt` เพิ่มเติม

| ฟังก์ชัน/พารามิเตอร์ | ความหมาย |
| --- | --- |
| `bcrypt.genSalt(saltRounds)` | สร้าง salt แยกจากขั้นตอน hash เผื่อต้องการ reuse salt เดียวกันหลายครั้ง (ปกติไม่จำเป็น เพราะ `bcrypt.hash(plain, saltRounds)` สร้าง salt ใหม่ให้อัตโนมัติอยู่แล้ว) |
| `bcrypt.getRounds(hash)` | อ่านค่า `saltRounds` ที่ถูกใช้ตอน hash ค่านี้มาจาก hash string เดิม มีประโยชน์เมื่อต้องการเช็คว่า hash เก่าที่เก็บไว้ใน DB ใช้ rounds ต่ำกว่ามาตรฐานปัจจุบันหรือไม่ (เพื่อวางแผน re-hash) |

---

## 9. ตัวอย่างโค้ดเพิ่มเติม

### 9.1 ออก Token พร้อม `issuer`/`audience` และตรวจสอบตอน verify

```javascript
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
      issuer: "student-api",
      audience: "student-api-client",
    },
  );
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" } });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ["HS256"], // pin algorithm ป้องกัน algorithm confusion attack
      issuer: "student-api",
      audience: "student-api-client",
    });
    next();
  } catch (err) {
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token ไม่ถูกต้องหรือหมดอายุ" } });
  }
}
```

### 9.2 แยก error ตามประเภท (TokenExpiredError vs JsonWebTokenError)

```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: { code: "NO_TOKEN", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" } });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Token หมดอายุ กรุณาเข้าสู่ระบบใหม่" } });
    }
    // ครอบคลุม JsonWebTokenError (signature ผิด/format ผิด) และกรณีอื่น
    return res.status(401).json({ error: { code: "INVALID_TOKEN", message: "Token ไม่ถูกต้อง" } });
  }
}
```

การแยก error ชนิดนี้มีประโยชน์ตอนฝั่ง client ต้องตัดสินใจว่าจะ redirect ไปหน้า login (signature ผิด) หรือเรียก refresh token endpoint (token หมดอายุ) ต่างกัน

### 9.3 จำกัดความยาวรหัสผ่านก่อน hash เพื่อเลี่ยงข้อจำกัด 72 ไบต์ของ bcrypt

```javascript
const registerSchema = z.object({
  email: z.email(),
  password: z.string().min(8).max(72), // กันไม่ให้รหัสผ่านยาวเกินขีดจำกัดของ bcrypt
});

async function register(req, res) {
  const { email, password } = req.body; // ผ่าน validate(registerSchema) แล้ว
  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
  // บันทึก email, hashedPassword ลงฐานข้อมูล — ห้ามรับ role จาก req.body (ดูข้อผิดพลาดที่พบบ่อย)
}
```

### 9.4 ตรวจสอบว่า hash เก่าใช้ `saltRounds` ต่ำกว่ามาตรฐานปัจจุบันหรือไม่ (เพื่อ re-hash ตอน login)

```javascript
async function login(req, res) {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: { code: "INVALID_CREDENTIALS", message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" } });
  }

  // ถ้า hash เดิมถูกสร้างด้วย rounds ต่ำกว่ามาตรฐานปัจจุบัน ให้ hash ใหม่แล้วอัปเดตเงียบ ๆ
  if (bcrypt.getRounds(user.password) < SALT_ROUNDS) {
    const newHash = await bcrypt.hash(password, SALT_ROUNDS);
    await updateUserPassword(user.id, newHash);
  }

  const token = generateToken(user);
  res.json({ token });
}
```

## เอกสารอ้างอิงประกอบ

- jsonwebtoken (npm): https://github.com/auth0/node-jsonwebtoken
- bcrypt (npm): https://github.com/kelektiv/node.bcrypt.js
- JWT.io: https://jwt.io/introduction
- เนื้อหาสอนเต็ม (Authentication/Authorization, JWT, RBAC): [wk06.md](wk06.md)
- ปฏิบัติการ: [wk06-lab.md](wk06-lab.md)
