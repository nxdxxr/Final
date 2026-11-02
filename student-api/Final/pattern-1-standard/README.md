# แนวข้อสอบปฏิบัติปลายภาค รูปแบบที่ 1 (Standard / High Probability)
**สถานการณ์:** ระบบสั่งอาหารออนไลน์ (Food Ordering System)  
**คะแนนเต็ม:** 15 คะแนน (แบ่ง 3 ข้อย่อย: 6, 4, 5 คะแนน)

---

## 🎯 รายละเอียดโจทย์และข้อกำหนด

### โจทย์ที่ 1 (6 คะแนน): Menu API (Pagination, Filtering, Search)
1. **`GET /api/v1/menus`**
   - รองรับ Query Parameters:
     - `page`: หมายเลขหน้า (ค่าเริ่มต้น: 1)
     - `limit`: จำนวนรายการต่อหน้า (ค่าเริ่มต้น: 5)
     - `available`: กรองสถานะเมนู (`true` หรือ `false`)
     - `search`: ค้นหาชื่อเมนูด้วย SQL `LIKE %search%`
   - ต้องคืนข้อมูลในรูปแบบ:
     ```json
     {
       "data": [ { "id": 1, "name": "...", "price": 60.00, "available": 1 } ],
       "pagination": {
         "page": 1,
         "limit": 5,
         "total": 22,
         "totalPages": 5
       }
     }
     ```
2. **`GET /api/v1/menus/:id`**
   - คืน 200 พร้อมข้อมูลเมนูเมื่อพบ
   - คืน 404 `{ "error": { "code": "MENU_NOT_FOUND", "message": "ไม่พบเมนูอาหาร" } }` เมื่อไม่พบ

### โจทย์ที่ 2 (4 คะแนน): JWT Role-Based Protection & Menu Creation
1. Middleware `authenticateToken`: ตรวจสอบ `Authorization: Bearer <token>`
   - ไม่ส่ง token -> 401 `{ "error": { "code": "UNAUTHORIZED", ... } }`
   - token ผิด / หมดอายุ -> 403 `{ "error": { "code": "FORBIDDEN", ... } }`
2. Middleware `requireRole("admin")`: ตรวจสอบ `req.user.role === 'admin'`
   - สิทธิ์ไม่ถึง -> 403 `{ "error": { "code": "FORBIDDEN", "message": "ไม่มีสิทธิ์เข้าถึงทรัพยากรนี้" } }`
3. **`POST /api/v1/menus`** (Admin Only):
   - ตรวจสอบ `name` ต้องไม่ว่างเปล่า และ `price > 0` (ถ้าไม่ผ่าน คืน 400 `VALIDATION_ERROR`)
   - บันทึกเมนูใหม่ลง `menu_items` แล้วคืน 201 Created

### โจทย์ที่ 3 (5 คะแนน): Database Transaction สั่งอาหาร (Atomic & Safe)
1. **`POST /api/v1/orders`** (Customer with JWT):
   - รับ Body: `{ "items": [ { "menu_item_id": 1, "quantity": 2 } ] }`
   - ตรวจสอบ Input Validation (ต้องมี items >= 1 และ quantity > 0)
   - เริ่มต้น Transaction ด้วย `conn.beginTransaction()`
   - บันทึกคำสั่งซื้อลงตาราง `orders`
   - ตรวจสอบแต่ละเมนูด้วย `SELECT ... FOR UPDATE`:
     - ถ้าไม่พบเมนู -> `conn.rollback()` และคืน 404 `MENU_NOT_FOUND`
     - ถ้าเมนู `available = false` -> `conn.rollback()` และคืน 400 `MENU_UNAVAILABLE`
     - ถ้าผ่าน -> `INSERT INTO order_items`
   - เมื่อครบทุกรายการ -> `conn.commit()`
   - คืน 201 Created `{ "message": "สร้างคำสั่งซื้อสำเร็จ", "data": { "orderId": X, ... } }`

---

## 🚀 วิธีการทดสอบคำตอบ
เปิด Terminal ในโฟลเดอร์นี้แล้วรัน:
```bash
npx jest tests/pattern1.test.js
```

