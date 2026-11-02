# สัปดาห์ที่ 5: Demo ประกอบการบรรยาย (Step-by-Step)

## วัตถุประสงค์ของเอกสารนี้

เอกสารนี้สำหรับใช้ demo ประกอบเนื้อหาบรรยายใน `wk05.md` แต่ละ step อ้างอิงหัวข้อใน `wk05.md` โดยตรง พิมพ์โค้ดทีละบล็อกแล้วรัน เห็นผลจริงทันที ไม่ใช่เอกสารให้นิสิตทำเอง

โปรเจกต์ demo ในเอกสารนี้เป็นโปรเจกต์แยกต่างหาก ชื่อ `demo-api` ไม่ใช่ `student-api` ที่นิสิตใช้ต่อเนื่องมาจากสัปดาห์ 1-4 (เพื่อไม่ให้กระทบข้อมูลที่นิสิตทำใน lab) ฐานข้อมูล MySQL ที่ใช้ demo ชื่อ `demo_api` แยกจาก `student_api` ที่นิสิตใช้เช่นกัน ทุกคำสั่งทดสอบด้วย `curl` เพราะเปิดแสดงในเทอร์มินัลได้ทันทีโดยไม่ต้องสลับหน้าจอไป Postman แต่สามารถสลับไปสาธิตด้วย MySQL Workbench หรือ Postman แทนได้ในจุดที่ต้องการเน้นการดูผลลัพธ์แบบ GUI

**คำเตือน**: เอกสารนี้เขียนเป็นสคริปต์ demo แต่ละ step อ้างอิงเนื้อหาจาก `wk05.md` โดยไม่สรุปซ้ำ นิสิตควร**อ่านคู่กับ `wk05.md`เสมอ** เปิดสองไฟล์พร้อมกัน เพื่อเข้าใจเหตุผลเบื้องหลังแต่ละ step ไม่ใช่แค่ทำตามคำสั่ง ส่วนขั้นตอนลงมือทำจริงกับโปรเจกต์ `student-api` ของตนเองให้ทำตาม `wk05-lab.md` แยกต่างหาก

## เตรียมการ

```bash
mkdir demo-api && cd demo-api
npm init -y
npm install express dotenv mysql2
npm install --save-dev nodemon
```

เปิดไฟล์ `package.json` เพิ่ม script `dev`

```json
"scripts": {
  "dev": "nodemon index.js"
}
```

ตรวจสอบว่า MySQL Server ทำงานอยู่แล้วในเครื่องที่ใช้ demo (ทดสอบด้วย `mysql -u root -p`) สร้างไฟล์ `index.js` เปล่าไว้ก่อน จะเติมโค้ดทีละ step ตามด้านล่าง ตลอดทั้งเอกสารนี้ใช้คำสั่งเดียว

```bash
npm run dev
```

รันค้างไว้ในหน้าต่าง terminal เดียวตลอด demo เมื่อแก้ไขและ save ไฟล์ `index.js` ในแต่ละ step nodemon จะ reload เซิร์ฟเวอร์ให้อัตโนมัติ **ไม่ต้อง** กด `Ctrl+C` แล้วรันคำสั่งใหม่เอง (ยกเว้นเมื่อแก้ `.env` ตามที่เตือนไว้ใน Step 2)

---

## Step 1: ปัญหาของ In-Memory และการสร้างฐานข้อมูล (อ้างอิง wk05.md หัวข้อ 1)

### 1.1 ทบทวนข้อจำกัดของ in-memory ด้วยของจริง

เขียน `index.js` แบบ in-memory เหมือนที่นิสิตทำมาตั้งแต่สัปดาห์ที่ 1 ก่อน เพื่อ demo ปัญหาให้เห็นภาพ

```javascript
const express = require("express");
const app = express();
app.use(express.json());
const PORT = 3000;

let students = [{ id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์" }];

app.get("/api/v1/students", (req, res) => {
  res.json({ message: "สำเร็จ", data: students });
});

app.listen(PORT, () => console.log(`Server กำลังทำงานที่พอร์ต ${PORT}`));
```

```bash
curl http://localhost:3000/api/v1/students
```

**ให้สังเกต**: ได้ข้อมูล 1 รายการ จากนั้นกด `Ctrl+C` หยุดเซิร์ฟเวอร์ แล้ว `npm run dev` ใหม่ เรียก curl ซ้ำ — ข้อมูลกลับไปเป็นค่าตั้งต้นเดิม ไม่มีการเปลี่ยนแปลงใดหลงเหลือ พิสูจน์ข้อจำกัดข้อ 1 ในหัวข้อ 1.1 ของ wk05.md ("ข้อมูลหายเมื่อรีสตาร์ตเซิร์ฟเวอร์") ให้เห็นจริงก่อนเริ่มแก้ปัญหาด้วย MySQL

### 1.2 สร้างฐานข้อมูลและตาราง

เปิด terminal อีกหน้าต่าง เข้า MySQL command line

```bash
mysql -u root -p
```

กรณีรัน mysql ใน docker

```bash
docker exec -it mysql_db mysql -u root -p
```

รันคำสั่งสร้างฐานข้อมูลและตาราง (อ้างอิง wk05.md หัวข้อ 3.1)

```sql
CREATE DATABASE IF NOT EXISTS demo_api;
USE demo_api;

CREATE TABLE students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  major VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE courses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  course_name VARCHAR(150) NOT NULL,
  credit INT NOT NULL
);

CREATE TABLE enrollments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_id INT NOT NULL,
  course_id INT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE KEY unique_enrollment (student_id, course_id)
);

INSERT INTO students (name, major, email) VALUES
  ('สมชาย ใจดี', 'วิทยาการคอมพิวเตอร์', 'somchai@example.com');
INSERT INTO courses (course_name, credit) VALUES
  ('โครงสร้างข้อมูล', 3),
  ('ระบบฐานข้อมูล', 3);

exit
```

**ให้สังเกต**: คอลัมน์ `email` กำหนด `UNIQUE` และตาราง `enrollments` มี `FOREIGN KEY` พร้อม `ON DELETE CASCADE` — จะกลับมาพิสูจน์ผลจริงของทั้งสองอย่างนี้ใน Step 4

---

## Step 2: Connection Pool (อ้างอิง wk05.md หัวข้อ 2)

### 2.1 สร้างไฟล์ `.env` และ `db.js`

```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=changeme_root_password
DB_NAME=demo_api
```

สร้างไฟล์ `db.js`

```javascript
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = pool;
```

แก้บรรทัดแรกสุดของ `index.js`

```javascript
require("dotenv").config();
const pool = require("./db");
```

**ข้อควรระวัง**: nodemon ไม่เฝ้าดูไฟล์ `.env` ตามค่าเริ่มต้น (ย้ำหลักการเดียวกับที่สาธิตใน wk04-demo-step-by-step.md Step 4) ต้อง `Ctrl+C` แล้ว `npm run dev` ใหม่ทุกครั้งหลังแก้ `.env` ให้ดำเนินการขั้นตอนนี้ก่อนไปต่อ

### 2.2 แทนที่ route ด้วยการ query จริงผ่าน pool

แก้ route `GET /api/v1/students` เดิมเป็น

```javascript
app.get("/api/v1/students", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students");
    res.json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});
```

บันทึกไฟล์ให้ nodemon reload แล้วทดสอบ

```bash
curl http://localhost:3000/api/v1/students
```

**ให้สังเกต**: ได้ข้อมูล "สมชาย ใจดี" ที่ seed ไว้ใน MySQL ตอนนี้ **กด `Ctrl+C` หยุดเซิร์ฟเวอร์แล้ว `npm run dev` ใหม่ เรียก curl ซ้ำอีกครั้ง** — ข้อมูลยังอยู่เหมือนเดิม ต่างจาก Step 1.1 ที่ข้อมูลหายไปทุกครั้งที่รีสตาร์ต นี่คือ persistent storage ตามที่ wk05.md หัวข้อ 1.1 อธิบายไว้

---

## Step 3: Parameterized Query ป้องกัน SQL Injection (อ้างอิง wk05.md หัวข้อ 3.6)

### 3.1 เพิ่ม route ค้นหาด้วย query string (จงใจใช้วิธีต่อสตริงก่อน)

**คำเตือน**: โค้ดใน 3.1 มีช่องโหว่ SQL Injection โดยตั้งใจ เพื่อสาธิตความอันตรายก่อนแก้ไขใน 3.3 **ห้ามนำไปใช้ในโปรเจกต์ `student-api` หรืองานจริงเด็ดขาด** ต้องใช้ Parameterized Query ตามที่แก้ไขใน 3.3 เท่านั้น

เพิ่มใน `index.js`

```javascript
app.get("/api/v1/students/search-unsafe", async (req, res, next) => {
  try {
    const query = `SELECT * FROM students WHERE email = '${req.query.email}'`;
    console.log("SQL ที่รันจริง:", query);
    const [rows] = await pool.query(query);
    res.json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});
```

ทดสอบแบบปกติก่อน

```bash
curl "http://localhost:3000/api/v1/students/search-unsafe?email=somchai@example.com"
```

**ให้สังเกต**: ได้ข้อมูลนิสิตถูกต้อง 1 รายการ ทำงานตามปกติ

### 3.2 Demo การโจมตี SQL Injection

```bash
curl "http://localhost:3000/api/v1/students/search-unsafe?email=x' OR '1'='1"
```

**ให้สังเกต**: terminal ฝั่งเซิร์ฟเวอร์พิมพ์ SQL ที่รันจริงออกมาให้เห็น เช่น `SELECT * FROM students WHERE email = 'x' OR '1'='1'` และ response ที่ได้กลับมาคือ **ข้อมูลนิสิตทั้งหมดในตาราง** ทั้งที่ไม่ทราบอีเมลจริง นี่คือช่องโหว่ SQL Injection ที่ wk05.md หัวข้อ 3.6 อธิบายไว้ แสดงให้เห็นความร้ายแรงของช่องโหว่นี้อย่างชัดเจน

### 3.3 แก้เป็น Parameterized Query

แก้ route เดิมเป็น

```javascript
app.get("/api/v1/students/search-unsafe", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE email = ?", [
      req.query.email,
    ]);
    res.json({ message: "สำเร็จ", data: rows });
  } catch (err) {
    next(err);
  }
});
```

บันทึกไฟล์ให้ nodemon reload แล้วทดสอบการโจมตีเดิมซ้ำ

```bash
curl "http://localhost:3000/api/v1/students/search-unsafe?email=x' OR '1'='1"
```

**ให้สังเกต**: ครั้งนี้ได้ `data: []` (อาร์เรย์ว่าง) เพราะ `mysql2` ถือว่าค่าทั้งหมดหลัง `?` เป็น**ข้อมูล**ไม่ใช่**คำสั่ง SQL** จึงไม่มีนิสิตคนใดมีอีเมลตรงกับสตริงดังกล่าว ตรงข้ามกับหัวข้อ 3.2 ที่ข้อมูลทั้งตารางรั่วไหล

---

## Step 4: Constraint ระดับฐานข้อมูล — UNIQUE และ Foreign Key (อ้างอิง wk05.md หัวข้อ 3.1 และ 3.3)

### 4.1 ทดสอบ UNIQUE constraint ผ่าน API

เพิ่ม route insert

```javascript
app.post("/api/v1/students", async (req, res, next) => {
  const { name, major, email } = req.body;
  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email],
    );
    res
      .status(201)
      .json({ message: "เพิ่มข้อมูลสำเร็จ", data: { id: result.insertId } });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: { code: "DUPLICATE_EMAIL", message: "อีเมลนี้มีอยู่ในระบบแล้ว" },
      });
    }
    next(err);
  }
});
```

ทดสอบเพิ่มด้วยอีเมลที่ seed ไว้แล้วซ้ำ

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"name":"ทดสอบ","major":"IT","email":"somchai@example.com"}' \
  http://localhost:3000/api/v1/students
```

**ให้สังเกต**: ได้ status `409` พร้อม `DUPLICATE_EMAIL` — ฐานข้อมูลปฏิเสธข้อมูลซ้ำเองผ่าน `err.code === "ER_DUP_ENTRY"` โดยไม่ต้องเขียนโค้ดตรวจสอบข้อมูลซ้ำในแอปพลิเคชันก่อน insert (ตามที่ wk05.md หัวข้อ 3.1 อธิบายไว้)

### 4.2 ทดสอบ Foreign Key และ Cascade Delete ผ่าน MySQL command line

เปิด terminal ฝั่ง MySQL อีกครั้ง

```bash
mysql -u root -p demo_api
```

```sql
-- ควรเกิดข้อผิดพลาด เพราะ course_id 999 ไม่มีอยู่จริง
INSERT INTO enrollments (student_id, course_id) VALUES (1, 999);
```

**ให้สังเกต**: MySQL ตอบ error `Cannot add or update a child row: a foreign key constraint fails` — ป้องกันข้อมูลอ้างอิงเสียตั้งแต่ระดับฐานข้อมูล

```sql
INSERT INTO enrollments (student_id, course_id) VALUES (1, 1);
SELECT * FROM enrollments;

DELETE FROM students WHERE id = 1;
SELECT * FROM enrollments;
```

**ให้สังเกต**: หลังลบนิสิตรหัส 1 ระเบียนใน `enrollments` ที่อ้างอิงถึงนิสิตคนนี้หายไปเองโดยอัตโนมัติ เพราะกำหนด `ON DELETE CASCADE` ไว้ตอนสร้างตาราง

**ข้อควรระวัง**: ต้องเพิ่มข้อมูลนิสิตกลับก่อนไป step ถัดไป แต่ **ห้าม** `INSERT` แบบปกติเพราะคอลัมน์ `id` เป็น `AUTO_INCREMENT` จะได้ `id = 2` ไม่ใช่ `id = 1` เหมือนเดิม (ทำให้ curl ใน Step 5 ที่อ้างอิง `/students/1/enrollments` ผิดพลาด) ให้ระบุ `id` ตรงกลับเข้าไปเองแทน

```sql
INSERT INTO students (id, name, major, email) VALUES
  (1, 'สมชาย ใจดี', 'วิทยาการคอมพิวเตอร์', 'somchai@example.com');
```

---

## Step 5: Transaction และ Rollback (อ้างอิง wk05.md หัวข้อ 4)

### 5.1 เพิ่ม route ลงทะเบียนเรียนด้วย Transaction

```javascript
app.post("/api/v1/students/:id/enrollments", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ต้องตรวจสอบว่ารายวิชามีอยู่จริงก่อน INSERT เสมอ
    // (ถ้า INSERT ก่อน คำสั่งจะชน FOREIGN KEY constraint ทันทีเมื่อ courseId ไม่มีจริง
    // แล้วกระโดดเข้า catch แทนที่จะได้ตรวจสอบและตอบ 404 ตามที่ตั้งใจ)
    const [courseRows] = await connection.query(
      "SELECT * FROM courses WHERE id = ?",
      [courseId],
    );

    if (courseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "COURSE_NOT_FOUND", message: "ไม่พบรายวิชาที่ระบุ" },
      });
    }

    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId],
    );

    await connection.commit();
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});
```

### 5.2 Demo กรณีสำเร็จ

ใช้ `courseId: 2` (รายวิชา "ระบบฐานข้อมูล" ที่ยังไม่เคยลงทะเบียน) ไม่ใช่ `courseId: 1` เพราะนิสิตรหัส 1 ลงทะเบียนรายวิชา 1 ไปแล้วตั้งแต่ Step 4.2 หากใช้ซ้ำจะชนกับ `UNIQUE KEY unique_enrollment` แทน

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"courseId": 2}' \
  http://localhost:3000/api/v1/students/1/enrollments
```

**ให้สังเกต**: ได้ status `201` ตรวจสอบด้วย `SELECT * FROM enrollments;` ใน terminal ฝั่ง MySQL — มีระเบียนใหม่จริง

### 5.3 Demo กรณี Rollback

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{"courseId": 999}' \
  http://localhost:3000/api/v1/students/1/enrollments
```

**ให้สังเกต**: ได้ status `404` เพราะ SELECT ตรวจสอบก่อนพบว่าไม่มีรายวิชานี้จริง โค้ดจึง `rollback()` และไม่มีการ INSERT เกิดขึ้นเลย — ตรวจสอบด้วย `SELECT * FROM enrollments WHERE course_id = 999;` ใน terminal ฝั่ง MySQL ว่า**ไม่มีระเบียนใดถูกบันทึก** ยืนยันว่า transaction ยกเลิกได้สะอาดตามที่ควรจะเป็น

**Demo เพิ่มเติม (ทางเลือก)**: หากต้องการให้นิสิตเห็นว่าทำไมต้องตรวจสอบก่อน INSERT เสมอ ให้สลับลำดับโค้ดใน 5.1 กลับเป็น INSERT ก่อนแล้วจึง SELECT ตรวจสอบภายหลัง (รูปแบบที่ไม่ถูกต้อง) แล้วส่ง request เดิมซ้ำ — จะได้ status `500` แทน `404` เพราะคำสั่ง INSERT ชน `FOREIGN KEY` constraint ทันทีและกระโดดเข้า `catch` ก่อนถึงจุดตรวจสอบ ไม่ใช่ error message ที่ต้องการ สลับโค้ดกลับให้ตรวจสอบก่อน INSERT เหมือนเดิมก่อนไปขั้นตอนถัดไป

### 5.4 ย้ำความสำคัญของ `connection.release()`

ให้ดูบล็อก `finally { connection.release(); }` ในโค้ด อธิบายว่าหากลบบรรทัดนี้ออก connection ที่ยืมจาก pool จะไม่ถูกคืนไม่ว่าจะ `commit()` หรือ `rollback()` เมื่อเรียกซ้ำหลายครั้งจนครบ `connectionLimit: 10` คำขอถัดไปจะต้องรอคิวค้างตลอดไป (connection leak) ตามที่ wk05.md หัวข้อ 4.4 ข้อ 1 เตือนไว้ **ไม่ต้องสาธิตให้เกิดจริง** เพราะใช้เวลานาน อธิบายด้วยโค้ดพอ

---

## สรุปท้าย Demo

โค้ดสุดท้ายที่ได้หลังจบทุก step ครอบคลุมแกนหลักของ `wk05.md`: Connection Pool, Parameterized Query ป้องกัน SQL Injection, constraint ระดับฐานข้อมูล (`UNIQUE`, `FOREIGN KEY`, `ON DELETE CASCADE`) และ Transaction กับ Rollback ให้นำไปประยุกต์กับโปรเจกต์ `student-api` ของตนเองในปฏิบัติการ `wk05-lab.md` ต่อทันที

หัวข้อที่ไม่ได้สาธิตในเอกสารนี้ (เพราะใช้เวลานานหรือเน้นให้นิสิตลงมือทำเองมากกว่าดู) ได้แก่ การดึงข้อมูลด้วย `JOIN` (wk05.md หัวข้อ 3.5), การป้องกันแย่งที่นั่งด้วย `SELECT ... FOR UPDATE` (wk05.md หัวข้อ 4.5, ตรงกับขั้นตอนที่ 3.3 ของ `wk05-lab.md`) และสคริปต์ทดสอบ concurrent request (wk05.md หัวข้อ 4.6) — ทั้งสามหัวข้อนี้นิสิตจะได้ลงมือทำเองในปฏิบัติการ `wk05-lab.md` และแบบฝึกหัดต่อยอด

**ข้อควรระวัง**: โปรเจกต์ `demo-api` และฐานข้อมูล `demo_api` นี้เป็นของสาธิตเท่านั้น

- นิสิตทำงานจริงบน `student-api` และฐานข้อมูล `student_api` ของตนเองตาม `wk05-lab.md`
