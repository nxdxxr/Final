# คู่มืออ้างอิง mysql2 & Knex (Quick Reference)

เอกสารนี้สรุปคำสั่ง `mysql2` (CRUD ดิบ + Transaction) และ Knex (migration) ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (Connection Pool, ACID, เหตุผลที่ต้องใช้ migration) อยู่ใน [wk05.md](wk05.md) และ [wk14.md](wk14.md) ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้งและสร้าง Connection Pool (mysql2)](#1-ติดตั้งและสร้าง-connection-pool-mysql2)
2. [CRUD พื้นฐาน](#2-crud-พื้นฐาน)
3. [JOIN ข้ามตาราง](#3-join-ข้ามตาราง)
4. [Transaction](#4-transaction)
5. [ล็อกแถวด้วย FOR UPDATE](#5-ล็อกแถวด้วย-for-update)
6. [Knex: ติดตั้งและตั้งค่า Migration](#6-knex-ติดตั้งและตั้งค่า-migration)
7. [Knex: เขียนและรัน Migration](#7-knex-เขียนและรัน-migration)
8. [ข้อผิดพลาดที่พบบ่อย](#8-ข้อผิดพลาดที่พบบ่อย)
9. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#9-ตัวเลือกพารามิเตอร์เพิ่มเติม)
10. [ตัวอย่างโค้ดเพิ่มเติม](#10-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้งและสร้าง Connection Pool (mysql2)

```bash
npm install mysql2
```

```javascript
// db.js
const mysql = require("mysql2/promise"); // ใช้ /promise เสมอ เพื่อ async/await ได้ตรง

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "student_api",
  waitForConnections: true, // true = คำขอเกิน limit จะรอคิวแทนโยน error ทันที
  connectionLimit: 10,
  queueLimit: 0, // 0 = ไม่จำกัดจำนวนคิว
});

module.exports = pool;
```

---

## 2. CRUD พื้นฐาน

```javascript
// SELECT ทั้งหมด
const [rows] = await pool.query("SELECT * FROM students");

// SELECT ตามเงื่อนไข (ต้องใช้ ? เสมอ ห้ามต่อสตริง — ดูหัวข้อ 8)
const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [id]);

// INSERT
const [result] = await pool.query(
  "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
  [name, major, email],
);
console.log(result.insertId); // id ที่เพิ่งสร้าง

// UPDATE / DELETE — ใช้ affectedRows เช็คว่ามีแถวถูกแก้ไขจริงหรือไม่
const [result] = await pool.query("UPDATE students SET name = ? WHERE id = ?", [name, id]);
if (result.affectedRows === 0) {
  // ไม่พบ id นี้ — MySQL ไม่ throw error เอง ต้องเช็คเอง
}
```

| error code | สาเหตุ |
| --- | --- |
| `ER_DUP_ENTRY` | ข้อมูลซ้ำกับ `UNIQUE` constraint → ตอบ `409` |

---

## 3. JOIN ข้ามตาราง

```javascript
const [rows] = await pool.query(
  `SELECT courses.id, courses.course_name, courses.credit
   FROM courses
   JOIN enrollments ON courses.id = enrollments.course_id
   WHERE enrollments.student_id = ?`,
  [studentId],
);
```

---

## 4. Transaction

```javascript
const connection = await pool.getConnection(); // ต้องใช้ connection ตัวเดียวตลอด transaction เดียวกัน

try {
  await connection.beginTransaction();

  const [rows] = await connection.query("SELECT * FROM courses WHERE id = ?", [courseId]);
  if (rows.length === 0) {
    await connection.rollback();
    return res.status(404).json({ error: { code: "COURSE_NOT_FOUND" } });
  }

  await connection.query("INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)", [studentId, courseId]);

  await connection.commit();
} catch (err) {
  await connection.rollback();
  throw err;
} finally {
  connection.release(); // ต้องเรียกเสมอ ไม่ว่าสำเร็จหรือล้มเหลว — ไม่งั้น connection leak
}
```

ทุก query ภายใน transaction เดียวกันต้องเรียกผ่าน `connection.query()` ไม่ใช่ `pool.query()` — `pool.query()` อาจสุ่มหยิบ connection คนละตัวจาก pool ทำให้ `beginTransaction()`/`commit()`/`rollback()` ไม่มีผลกับ query นั้น

---

## 5. ล็อกแถวด้วย FOR UPDATE

ป้องกัน race condition แบบ "อ่านแล้วเขียน" (เช่น แย่งที่นั่งสุดท้าย) — SELECT ธรรมดาไม่ล็อกแถว ต้องเพิ่ม `FOR UPDATE` อย่างชัดเจน

```javascript
const [rows] = await connection.query(
  "SELECT * FROM courses WHERE id = ? FOR UPDATE", // ล็อกแถวนี้จนกว่า commit/rollback
  [courseId],
);

if (rows[0].seat_available <= 0) {
  await connection.rollback();
  return res.status(409).json({ error: { code: "SEAT_FULL" } });
}

await connection.query("UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?", [courseId]);
await connection.commit();
```

`FOR UPDATE` ต้องอยู่ใน transaction เดียวกันกับ query ที่เปลี่ยนแปลงข้อมูล (ใช้ `connection` ตัวเดียวกัน) มิฉะนั้นจะไม่มีผลป้องกันใด ๆ

---

## 6. Knex: ติดตั้งและตั้งค่า Migration

```bash
npm install knex mysql2
npx knex init
```

```javascript
// knexfile.js
module.exports = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "student_api_db",
      charset: "utf8mb4", // จำเป็นเพื่อรองรับภาษาไทยและ emoji
    },
    migrations: { directory: "./migrations" },
  },
};
```

---

## 7. Knex: เขียนและรัน Migration

```bash
npx knex migrate:make add_phone_number_to_students
```

```javascript
// migrations/<timestamp>_add_phone_number_to_students.js
exports.up = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.string("phone_number", 20).nullable().defaultTo(null); // ต้อง nullable/default เสมอถ้าตารางมีข้อมูลอยู่แล้ว
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable("students", (table) => {
    table.dropColumn("phone_number");
  });
};
```

```bash
npx knex migrate:latest    # รัน migration ที่ยังไม่ได้รัน
npx knex migrate:rollback  # ย้อนกลับ batch ล่าสุด (เรียก down)
```

| Knex schema builder ที่ใช้บ่อย | ความหมาย |
| --- | --- |
| `table.string(name, length)` | VARCHAR |
| `table.integer(name)` | INT |
| `table.boolean(name)` | TINYINT(1) |
| `table.datetime(name)` | DATETIME |
| `table.text(name)` | TEXT |
| `.nullable()` / `.notNullable()` | รับ/ไม่รับ NULL |
| `.defaultTo(value)` | ค่า default |
| `.unique()` | UNIQUE constraint |

---

## 8. ข้อผิดพลาดที่พบบ่อย

- **ต่อสตริง SQL ตรง ๆ แทนใช้ `?`** — เสี่ยง SQL Injection ร้ายแรงทันที (ดูตัวอย่างผลกระทบใน [wk05.md](wk05.md) หัวข้อ 3.6) ต้องใช้ parameterized query (`?` + array) เสมอ
- **ชื่อคอลัมน์/ทิศทาง sort มาจาก client โดยตรง** — ใช้ `?` กับชื่อคอลัมน์ไม่ได้ (เพราะเป็นโครงสร้างคำสั่ง ไม่ใช่ค่าข้อมูล) ต้องตรวจกับ allowlist ก่อนนำไปต่อ query
- **ลืม `connection.release()`** — connection ไม่ถูกคืนกลับ pool ทำให้ pool เต็มและระบบรับคำขอใหม่ไม่ได้ (connection leak) ต้องเรียกใน `finally` เสมอ
- **เรียก query ของ transaction ผ่าน `pool.query()` แทน `connection.query()`** — query นั้นหลุดออกจาก transaction ทำให้ `commit()`/`rollback()` ไม่มีผล
- **SELECT ตรวจสอบเงื่อนไขโดยไม่ `FOR UPDATE`** — เปิดช่องให้ race condition เมื่อมีคำขอพร้อมกันหลายคำขอ (เช่น แย่งที่นั่งสุดท้ายจนที่นั่งติดลบ)
- **เพิ่ม column `NOT NULL` ไม่มี default ลงตารางที่มีข้อมูลอยู่แล้ว** — migration ล้มเหลวทันที เพราะแถวเดิมไม่มีค่าใน column ใหม่
- **ลืมเขียนฟังก์ชัน `down` ให้ตรงกับ `up`** — ไม่มีแผนย้อนกลับที่ปลอดภัยเมื่อ deploy แล้วพบปัญหา
- **ใช้ `pool.query()` กับคำสั่งที่มีหลาย statement คั่นด้วย `;` โดยไม่เปิด `multipleStatements`** — ค่าเริ่มต้นของ `mysql2` ปิดการรันหลายคำสั่งในครั้งเดียวไว้เพื่อความปลอดภัย (ป้องกัน SQL Injection ที่แอบแทรกคำสั่งที่สองต่อท้าย) ถ้าต้องรันหลายคำสั่งจริง ๆ (เช่น script setup ฐานข้อมูล) ต้องตั้ง `multipleStatements: true` ตอนสร้าง connection อย่างรู้ตัว และห้ามใช้ร่วมกับ input จาก client โดยตรง
- **ลืมว่า `result.affectedRows` กับ `result.changedRows` ต่างกัน** — `UPDATE` ที่ WHERE ตรงแถวแต่ค่าที่ set เหมือนค่าเดิมทุกอย่าง `affectedRows` จะยังเป็น 1 (เพราะ MySQL นับแถวที่ query จับคู่ได้) แต่ `changedRows` จะเป็น 0 (เพราะไม่มีค่าใดเปลี่ยนจริง) ถ้าใช้ `affectedRows === 0` เป็นเงื่อนไขเช็คว่า "ไม่พบแถว" ต้องเข้าใจว่ากรณีนี้ไม่ได้แปลว่าไม่พบแถว แค่ไม่มีอะไรเปลี่ยน
- **เปิด connection ใหม่ด้วย `mysql.createConnection()` ในแต่ละ request แทนใช้ pool** — เสีย overhead การเปิด/ปิด connection ทุกครั้ง และถ้าลืมปิดจะรั่วไหลสะสมจนฐานข้อมูลปฏิเสธ connection ใหม่ (`ER_CON_COUNT_ERROR`) ต้องสร้าง pool เดียวตอน start server แล้วใช้ซ้ำตลอดอายุของแอป
- **ใช้ Knex query builder (`knex("students").select()`) ปนกับ raw `mysql2` pool ในโปรเจกต์เดียวกันโดยไม่ตั้งใจ** — โปรเจกต์ในวิชานี้ใช้ Knex เฉพาะสำหรับ migration เท่านั้น ส่วน CRUD ใช้ `mysql2` ดิบ ถ้าเผลอเรียก Knex query builder (ที่เชื่อม connection คนละตัวจาก `knexfile.js`) ปนกับ transaction ที่เปิดด้วย `pool.getConnection()` ของ mysql2 จะทำให้ query ไม่ได้อยู่ใน transaction เดียวกัน
- **รัน `knex migrate:rollback` ใน production โดยไม่ตรวจว่า `down` จะลบข้อมูลจริงหรือไม่** — เช่น `down` ที่ `dropColumn` คอลัมน์ที่มีข้อมูลสำคัญอยู่แล้ว การ rollback จะทำให้ข้อมูลหายถาวร ควร backup ก่อน rollback บน production เสมอ
- **ใช้ `?` วางตำแหน่งไม่ตรงกับจำนวนค่าใน array parameter** — ถ้าจำนวน `?` ในคำสั่ง SQL กับจำนวน element ใน array ไม่เท่ากัน `mysql2` จะ throw error ที่บางครั้งอ่านยาก (เช่น `Bind parameters must not contain undefined`) ควรนับจำนวน `?` ให้ตรงกับ array ทุกครั้งที่แก้ query

---

## 9. ตัวเลือก/พารามิเตอร์เพิ่มเติม

### ตัวเลือกของ `mysql.createPool()`

| ตัวเลือก | ความหมาย |
| --- | --- |
| `connectTimeout` | เวลาสูงสุด (มิลลิวินาที) ที่รอการเชื่อมต่อฐานข้อมูลสำเร็จ ก่อน throw timeout error ค่าเริ่มต้นคือ 10000 (10 วินาที) |
| `enableKeepAlive` | เปิด TCP keep-alive เพื่อป้องกัน connection ถูกตัดโดย firewall/load balancer เมื่อไม่มีการใช้งานนาน ๆ |
| `dateStrings` | ถ้าตั้งเป็น `true` คอลัมน์ชนิด `DATE`/`DATETIME`/`TIMESTAMP` จะคืนค่าเป็น string ดิบจาก MySQL แทนการแปลงเป็น JavaScript `Date` object อัตโนมัติ มีประโยชน์เมื่อต้องการควบคุม timezone/format เอง |
| `timezone` | กำหนด timezone ที่ใช้แปลงค่าวันที่-เวลาระหว่าง JavaScript และ MySQL ค่าเริ่มต้นคือ `"local"` (timezone ของเครื่อง) |
| `namedPlaceholders` | ถ้าตั้งเป็น `true` อนุญาตให้ใช้ placeholder แบบชื่อ เช่น `:id` แทน `?` ในคำสั่ง SQL (ต้องส่ง parameter เป็น object แทน array) |
| `multipleStatements` | อนุญาตให้รันหลายคำสั่ง SQL คั่นด้วย `;` ในการเรียกครั้งเดียว ค่าเริ่มต้นคือ `false` เพื่อความปลอดภัย (ดูข้อผิดพลาดที่พบบ่อย) |

### Method อื่นที่ใช้บ่อยของ `mysql2/promise`

| Method | ความหมาย |
| --- | --- |
| `connection.execute(sql, params)` | ทำงานคล้าย `.query()` แต่ใช้ prepared statement จริง (server-side) เหมาะกับ query ที่เรียกซ้ำบ่อย ๆ ด้วยรูปแบบเดียวกัน ประสิทธิภาพดีกว่าเล็กน้อยเมื่อเรียกซ้ำจำนวนมาก |
| `pool.getConnection()` | ขอ connection เดี่ยวออกจาก pool มาถือไว้เอง (จำเป็นสำหรับ transaction ตามหัวข้อ 4) |
| `connection.ping()` | ตรวจสอบว่า connection ยังเชื่อมต่อฐานข้อมูลอยู่หรือไม่ มีประโยชน์ตอนเขียน health-check endpoint |
| `pool.end()` | ปิด pool ทั้งหมดอย่างสุภาพ (รอ query ที่กำลังทำงานให้เสร็จก่อน) ใช้ตอน graceful shutdown ของแอป |

### Knex schema builder เพิ่มเติม

| คำสั่ง | ความหมาย |
| --- | --- |
| `table.increments(name)` | สร้างคอลัมน์ primary key แบบ auto-increment (เทียบเท่า `INT AUTO_INCREMENT PRIMARY KEY` ใน MySQL) |
| `table.timestamps(true, true)` | เพิ่มคอลัมน์ `created_at`/`updated_at` ให้เป็น `TIMESTAMP` พร้อม default เป็นเวลาปัจจุบัน (argument แรก = ใช้ `timestamp` แทน `datetime`, argument ที่สอง = ตั้ง default ให้อัตโนมัติ) |
| `table.foreign(column).references(table.column)` | สร้าง foreign key constraint ระหว่างตาราง |
| `.onDelete("CASCADE")` | กำหนดพฤติกรรมเมื่อแถวที่ถูกอ้างอิงถูกลบ เช่น ลบแถวลูกตามไปด้วย ต้องใช้ร่วมกับ `.foreign()` |
| `table.index(["column1", "column2"])` | สร้าง index แบบ composite บนหลายคอลัมน์พร้อมกัน ช่วยเร่งความเร็ว query ที่ WHERE/ORDER BY หลายคอลัมน์นี้ร่วมกัน |
| `knex.schema.hasTable(name)` | ตรวจสอบว่าตารางมีอยู่แล้วหรือไม่ก่อนสร้าง มีประโยชน์เมื่อเขียน migration ที่ต้อง idempotent |
| `npx knex migrate:status` | แสดงรายการ migration ที่รันแล้วและยังไม่ได้รัน ใช้ตรวจสอบก่อน deploy |
| `npx knex migrate:rollback --all` | ย้อนกลับ migration ทุก batch ทั้งหมด (ไม่ใช่แค่ batch ล่าสุด) ใช้ด้วยความระมัดระวังสูง |

---

## 10. ตัวอย่างโค้ดเพิ่มเติม

### 10.1 Health-check endpoint ที่ตรวจสอบการเชื่อมต่อฐานข้อมูลจริง

```javascript
router.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    res.json({ status: "ok", database: "connected" });
  } catch (err) {
    res.status(503).json({ status: "error", database: "disconnected" });
  }
});
```

### 10.2 Named placeholders สำหรับ query ที่มีพารามิเตอร์จำนวนมาก (อ่านง่ายขึ้น)

```javascript
const pool = mysql.createPool({
  // ...ค่าตั้งค่าเดิม
  namedPlaceholders: true,
});

const [rows] = await pool.query(
  "SELECT * FROM students WHERE major = :major AND age >= :minAge",
  { major: "Computer Science", minAge: 18 },
);
```

### 10.3 Transaction ที่มีหลายขั้นตอนและต้อง rollback ตามเงื่อนไข (โอนที่นั่งระหว่างวิชา)

```javascript
async function transferEnrollment(studentId, fromCourseId, toCourseId) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [toCourse] = await connection.query(
      "SELECT seat_available FROM courses WHERE id = ? FOR UPDATE",
      [toCourseId],
    );
    if (toCourse.length === 0 || toCourse[0].seat_available <= 0) {
      await connection.rollback();
      throw new Error("ที่นั่งวิชาปลายทางไม่เพียงพอ");
    }

    await connection.query(
      "DELETE FROM enrollments WHERE student_id = ? AND course_id = ?",
      [studentId, fromCourseId],
    );
    await connection.query(
      "UPDATE courses SET seat_available = seat_available + 1 WHERE id = ?",
      [fromCourseId],
    );
    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, toCourseId],
    );
    await connection.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [toCourseId],
    );

    await connection.commit();
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
}
```

### 10.4 Migration ที่เพิ่ม foreign key พร้อม `onDelete("CASCADE")`

```javascript
exports.up = function (knex) {
  return knex.schema.createTable("enrollments", (table) => {
    table.increments("id");
    table.integer("student_id").unsigned().notNullable();
    table.integer("course_id").unsigned().notNullable();
    table.timestamps(true, true);

    table.foreign("student_id").references("students.id").onDelete("CASCADE");
    table.foreign("course_id").references("courses.id").onDelete("CASCADE");
    table.index(["student_id", "course_id"]);
  });
};

exports.down = function (knex) {
  return knex.schema.dropTable("enrollments");
};
```

`onDelete("CASCADE")` ทำให้เมื่อลบนิสิตหรือวิชาออกจากตารางหลัก แถว `enrollments` ที่เกี่ยวข้องจะถูกลบตามไปโดยอัตโนมัติ ป้องกันข้อมูลค้าง (orphan row) ที่อ้างอิง id ที่ไม่มีอยู่จริงแล้ว

## เอกสารอ้างอิงประกอบ

- mysql2: https://github.com/sidorares/node-mysql2
- Knex.js Migrations Guide: https://knexjs.org/guide/migrations.html
- MySQL Locking Reads (FOR UPDATE): https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
- เนื้อหาสอนเต็ม (Connection Pool, CRUD, Transaction, ACID): [wk05.md](wk05.md)
- เนื้อหาสอนเต็ม (Migration, Scalability): [wk14.md](wk14.md)
- ปฏิบัติการ: [wk05-lab.md](wk05-lab.md), [wk14-lab.md](wk14-lab.md)
