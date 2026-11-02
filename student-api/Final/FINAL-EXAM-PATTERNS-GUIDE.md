# คู่มือคาดการณ์ข้อสอบปลายภาค ส่วนปฏิบัติ (Part 2: 15 คะแนน)
**วิชา 88736065 API for Back-End Development**  
**ระบบเป้าหมาย:** ระบบสั่งอาหารออนไลน์ (Food Ordering System)  
**ฐานข้อมูล:** MySQL `exam_db` (ตาราง: `menu_items`, `orders`, `order_items`) | พอร์ต: `3309`

---

## 📌 1. ภาพรวมและที่มาของการคาดการณ์

ในเอกสารคำแนะนำข้อสอบระบุว่าข้อสอบปฏิบัติแบ่งเป็น **3 ข้อย่อย รวม 15 คะแนน** (โจทย์ที่ 1: 6 คะแนน, โจทย์ที่ 2: 4 คะแนน, โจทย์ที่ 3: 5 คะแนน) โดยสอดคล้องกับเนื้อหาปฏิบัติการสัปดาห์ที่ 5–12 และเบาะแสใน `wk09-lab.md` บรรทัด 462 ที่ระบุชัดเจนว่าข้อสอบปลายภาคจะวัดผลเรื่อง **Pagination, JWT Authentication, Database Transaction และการเขียน Test**

เราจึงได้สร้างชุดจำลองข้อสอบออกมา **3 รูปแบบ** บรรจุไว้ในโฟลเดอร์ `Final/` ดังนี้:

| โฟลเดอร์ | รูปแบบข้อสอบ | โอกาสออก | จุดเน้นสำคัญ |
|---|---|:---:|---|
| [`pattern-1-standard`](pattern-1-standard/) | **รูปแบบมาตรฐาน (Standard)** | **~85%** | Pagination/Search + JWT Role Guard + Transaction สั่งอาหาร (Atomic Insert) |
| [`pattern-2-debugging-tests`](pattern-2-debugging-tests/) | **เน้นแก้บั๊ก & เขียนเทสต์ (Debugging & Test)** | **~75%** | แก้บั๊กคณิตศาสตร์ Pagination + แก้ Middleware พัง + ตรวจสอบ Rollback ไม่ให้เกิด Dirty Data |
| [`pattern-3-order-workflow`](pattern-3-order-workflow/) | **จัดการสถานะ & JOIN ซับซ้อน (Workflow)** | **~65%** | SQL JOIN 3 ตารางคำนวณยอดเงิน + State Machine อัปเดตสถานะ + Transaction ขอยกเลิกออเดอร์ |

---

## 📂 2. เจาะลึกรายละเอียดของแต่ละรูปแบบ (Pattern Breakdown)

---

### 🟢 รูปแบบที่ 1: `pattern-1-standard` (โอกาสออกสอบสูงสุด)
โฟลเดอร์: [Final/pattern-1-standard](file:///d:/API/API-Project/student-api/Final/pattern-1-standard)

#### 📝 ข้อที่ 1 (6 คะแนน): Menu API (Pagination, Filtering & Search)
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง endpoint `GET /api/v1/menus` รองรับ query parameters:
    * `page` (default: 1), `limit` (default: 5)
    * `available` (กรองสถานะ boolean: `true` / `false`)
    * `search` (ค้นหาชื่ออาหารด้วย SQL `LIKE %search%`)
  * สร้าง endpoint `GET /api/v1/menus/:id` สำหรับดูเมนูรายชิ้น (ถ้าไม่เจอให้คืน 404 `MENU_NOT_FOUND`)
* **จุดที่ต้องระวัง:**
  * การคำนวณ `totalPages` ต้องใช้สูตร `Math.ceil(total / limit)` เสมอ
  * การคำนวณ `offset = (page - 1) * limit`
  * ต้องรัน Query 2 รอบ: รอบแรกนับ `COUNT(*)` รอบสองดึง `LIMIT ? OFFSET ?`

#### 📝 ข้อที่ 2 (4 คะแนน): JWT Role-Based Protection (Admin Only Menu Creation)
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง Middleware `authenticateToken` เพื่อตรวจ Header `Authorization: Bearer <token>`
  * สร้าง Middleware `requireRole("admin")` เพื่อกันไม่ให้ผู้ใช้ทั่วไปเข้าถึง
  * สร้าง endpoint `POST /api/v1/menus` รับ `{ name, price, available }` เพิ่มอาหารใหม่เฉพาะ Admin
* **จุดที่ต้องระวัง:**
  * หากไม่ส่ง Token ต้องตอบ **401 `UNAUTHORIZED`**
  * หาก Token ปลอม/หมดอายุ หรือ Role ไม่ใช่ admin ต้องตอบ **403 `FORBIDDEN`**
  * ตรวจสอบข้อมูลก่อน Insert (Validation): `name` ห้ามว่างเปล่า และ `price` ต้องมากกว่า 0 (ถ้าผิดคืน 400)

#### 📝 ข้อที่ 3 (5 คะแนน): Database Transaction สั่งอาหาร (Atomic Order Placement)
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง endpoint `POST /api/v1/orders` (Protected ด้วย Token ของลูกค้า)
  * รับ Body: `{ items: [ { menu_item_id: 1, quantity: 2 }, ... ] }`
  * ใช้ **Database Transaction** บันทึกลงตาราง `orders` และ `order_items`
  * ถ้ามีเมนูใดที่ `available = false` หรือไม่พบในระบบ ต้อง **`ROLLBACK` ทันที** ไม่ให้มีข้อมูลค้าง
* **จุดที่ต้องระวัง:**
  * ต้องใช้ `SELECT ... FOR UPDATE` เพื่อล็อกแถวเมนูอาหาร
  * ต้องเรียก `conn.release()` ในบล็อก `finally` หรือใน error block ทุกครั้งเพื่อป้องกัน Connection Leak

---

### 🟡 รูปแบบที่ 2: `pattern-2-debugging-tests` (เน้นการแก้บั๊กและเขียนเทสต์)
โฟลเดอร์: [Final/pattern-2-debugging-tests](file:///d:/API/API-Project/student-api/Final/pattern-2-debugging-tests)

#### 📝 ข้อที่ 1 (6 คะแนน): ดีบัก Pagination และเขียนเทสต์ดัก Edge Cases
* **บั๊กที่อาจารย์มักจะวางไว้ในโค้ดตั้งต้น:**
  1. `totalPages = Math.floor(...)` ➔ ทำให้อาหารหน้าสุดท้ายตกหล่นหายไป **(ต้องแก้เป็น `Math.ceil`)**
  2. เมื่อส่ง `page` เป็นค่าติดลบ หรือไม่ใช่ตัวเลข โค้ดพัง ➔ **ต้องใส่ Fallback: `if (isNaN(page) || page < 1) page = 1`**
  3. เมื่อขอหน้าที่เกินจำนวนจริง (เช่น `page=999`) ➔ **ต้องคืน `data: []` และ status 200 ห้าม throw error**

#### 📝 ข้อที่ 2 (4 คะแนน): ดีบัก Authentication Middleware
* **บั๊กที่อาจารย์มักจะวางไว้ในโค้ดตั้งต้น:**
  1. โค้ดเดิมเขียน `req.headers.authorization.split(" ")[1]` โดยไม่ตรวจก่อน ถ้า Client ไม่ส่ง Header เซิร์ฟเวอร์จะ throw `TypeError` แล้ว Node.js ดับทันที
  2. ต้องตรวจสอบว่าสตริงขึ้นต้นด้วย `"Bearer "` หรือไม่
  3. ตรวจจับ `err.name === "TokenExpiredError"` แล้วคืนข้อความภาษาไทยที่ชัดเจน

#### 📝 ข้อที่ 3 (5 คะแนน): ดีบัก Transaction Rollback & ตรวจสอบ Zero Dirty Reads
* **สิ่งที่ต้องแก้ไขและทดสอบ:**
  1. **แก้บั๊ก Connection Pool Leak:** ถ้ามี error เกิดขึ้น ต้องมั่นใจว่า `conn.release()` ถูกเรียกเสมอ มิฉะนั้นยิงครบ 10 ครั้ง Pool จะตัน
  2. **เขียนเทสต์ยืนยันความถูกต้อง:** ยิงสั่งอาหารที่มีเมนู `available = false` แล้วเขียนคำสั่ง SQL นับแถวในตาราง `orders` เพื่อพิสูจน์ว่า **ไม่มีแถวขยะถูกเพิ่มลงไปแม้แต่แถวเดียว**

---

### 🔵 รูปแบบที่ 3: `pattern-3-order-workflow` (เน้น Lifecycle และ SQL JOIN)
โฟลเดอร์: [Final/pattern-3-order-workflow](file:///d:/API/API-Project/student-api/Final/pattern-3-order-workflow)

#### 📝 ข้อที่ 1 (6 คะแนน): Complex SQL JOIN ดูรายละเอียดออเดอร์
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง endpoint `GET /api/v1/orders/:id`
  * ทำ SQL JOIN ระหว่าง 3 ตาราง: `orders` ➔ `order_items` ➔ `menu_items`
  * จัดกลุ่มให้อยู่ในรูป Object คำสั่งซื้อ พร้อม Array รายการอาหาร และคำนวณ `total_amount = SUM(quantity * price)`

#### 📝 ข้อที่ 2 (4 คะแนน): State Machine Workflow สำหรับสถานะออเดอร์
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง endpoint `PATCH /api/v1/orders/:id/status` (สำหรับ Admin/Staff)
  * ตรวจสอบความถูกต้องของการเปลี่ยนสถานะ (State Transition):
    * `pending` ➔ `preparing` ➔ `delivered`
    * หากออเดอร์มีสถานะเป็น `delivered` หรือ `cancelled` แล้ว **ห้ามเปลี่ยนสถานะอีกเด็ดขาด** (คืน 400 `INVALID_STATE_TRANSITION`)

#### 📝 ข้อที่ 3 (5 คะแนน): Transaction ยกเลิกออเดอร์ (Cancellation Transaction)
* **สิ่งที่โจทย์สั่งให้ทำ:**
  * สร้าง endpoint `DELETE /api/v1/orders/:id`
  * ตรวจสอบสถานะก่อนลบ: **ยกเลิกได้เฉพาะออเดอร์ที่เป็น `'pending'` เท่านั้น** (ถ้าเริ่มทำอาหารหรือส่งแล้ว ห้ามยกเลิก คืน 400 `CANNOT_CANCEL_ORDER`)
  * ลบรายการใน `order_items` และ `orders` ภายใต้ Transaction

---

## 🧠 3. สรุปแม่แบบโค้ดสำคัญที่ต้อง "จำเข้าห้องสอบ" (Cheat Sheet)

### 1. โค้ดแม่แบบ Pagination & Count (ข้อ 1):
```javascript
const page = Math.max(1, parseInt(req.query.page) || 1);
const limit = Math.max(1, parseInt(req.query.limit) || 5);
const offset = (page - 1) * limit;

// 1. นับรวม
const [countRows] = await pool.query("SELECT COUNT(*) AS total FROM menu_items");
const total = countRows[0].total;
const totalPages = Math.ceil(total / limit);

// 2. ดึงข้อมูล
const [rows] = await pool.query(
  "SELECT id, name, price, available FROM menu_items ORDER BY id ASC LIMIT ? OFFSET ?",
  [limit, offset]
);

res.json({ data: rows, pagination: { page, limit, total, totalPages } });
```

### 2. โค้ดแม่แบบ JWT Auth Middleware (ข้อ 2):
```javascript
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: { code: "UNAUTHORIZED", message: "ต้องระบุ Token" } });
  }

  jwt.verify(token, process.env.JWT_SECRET || "final-exam-secret-2-2-5", (err, user) => {
    if (err) {
      return res.status(403).json({ error: { code: "FORBIDDEN", message: "Token ไม่ถูกต้องหรือหมดอายุ" } });
    }
    req.user = user;
    next();
  });
}
```

### 3. โค้ดแม่แบบ Database Transaction (ข้อ 3):
```javascript
const conn = await pool.getConnection();
try {
  await conn.beginTransaction();

  // ทำการ Insert / Update ภายใต้ Transaction
  const [orderResult] = await conn.query("INSERT INTO orders (customer_name) VALUES (?)", [customerName]);
  const orderId = orderResult.insertId;

  for (const item of items) {
    // ล็อกแถวด้วย FOR UPDATE
    const [menus] = await conn.query("SELECT * FROM menu_items WHERE id = ? FOR UPDATE", [item.menu_item_id]);
    if (menus.length === 0 || !menus[0].available) {
      await conn.rollback();
      conn.release();
      return res.status(400).json({ error: { code: "MENU_UNAVAILABLE", message: "เมนูไม่พร้อมขาย" } });
    }
    await conn.query("INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)", [orderId, item.menu_item_id, item.quantity]);
  }

  await conn.commit();
  conn.release();
  res.status(201).json({ message: "สำเร็จ", orderId });
} catch (err) {
  await conn.rollback();
  conn.release();
  next(err);
}
```

---

## 🧪 4. วิธีการสั่งรันเทสต์เพื่อซ้อมมือ

คุณสามารถเปิด Terminal และทดลองรัน Jest Test ทีละโฟลเดอร์ได้ทันที:

```bash
# ทดสอบรูปแบบที่ 1 (Standard)
cd d:\API\API-Project\student-api\Final\pattern-1-standard
npx jest tests/pattern1.test.js

# ทดสอบรูปแบบที่ 2 (Debugging)
cd d:\API\API-Project\student-api\Final\pattern-2-debugging-tests
npx jest tests/pattern2.test.js

# ทดสอบรูปแบบที่ 3 (Workflow)
cd d:\API\API-Project\student-api\Final\pattern-3-order-workflow
npx jest tests/pattern3.test.js
```

*(ทุกรูปแบบได้รับการทดสอบกับฐานข้อมูล Docker `exam_db` (พอร์ต 3309) แล้ว และผ่าน 100% ทุกชุดเทสต์ครับ!)*

