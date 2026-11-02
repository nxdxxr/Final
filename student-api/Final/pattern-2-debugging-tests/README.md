# แนวข้อสอบปฏิบัติปลายภาค รูปแบบที่ 2 (Debugging & Testing Focus)
**สถานการณ์:** แก้ไขบั๊กในระบบที่มีอยู่เดิม และเขียน Jest Integration Test ดักจับ Edge Cases  
**คะแนนเต็ม:** 15 คะแนน (แบ่ง 3 ข้อย่อย: 6, 4, 5 คะแนน)

---

## 🎯 รายละเอียดโจทย์และจุดบั๊กที่ต้องระวัง

### โจทย์ที่ 1 (6 คะแนน): ดีบัก Pagination และเขียนเทสต์ดักจับ Edge Case
* **บั๊กที่พบบ่อยในการสอบ:**
  1. การคำนวณ `totalPages` เผลอใช้ `Math.floor` ทำให้หน้าสุดท้ายข้อมูลตกหล่น -> **ต้องแก้เป็น `Math.ceil(total / limit)`**
  2. เมื่อผู้ใช้ใส่ `page` เป็นค่าติดลบหรือตัวอักษร -> **ต้องใช้ `parseInt` และ fallback เป็นค่าเริ่มต้น `page = 1`**
  3. เมื่อขอหน้าที่เกินกว่าข้อมูลจริง (เช่น `page=999`) -> **ต้องคืน `data: []` และ status 200 ห้าม throw error 500**

### โจทย์ที่ 2 (4 คะแนน): ดีบัก Auth Middleware ป้องกันเซิร์ฟเวอร์ Crash
* **บั๊กที่พบบ่อยในการสอบ:**
  1. โค้ดเดิมใช้ `req.headers.authorization.split(" ")[1]` ทันที ถ้า client ไม่ส่ง Header หรือส่งสตริงว่าง ระบบจะ throw `TypeError: Cannot read properties of undefined` แล้วเซิร์ฟเวอร์ล่ม
  2. ตรวจสอบว่าขึ้นต้นด้วย `"Bearer "` หรือไม่
  3. จัดการ Error กรณี Token หมดอายุ (`TokenExpiredError`) ให้ตอบกลับ 403 พร้อมข้อความชัดเจน

### โจทย์ที่ 3 (5 คะแนน): ดีบัก Transaction Connection Leak & Data Integrity
* **บั๊กที่พบบ่อยในการสอบ:**
  1. **Connection Pool Leak:** ในบล็อก `catch` ลืมใส่ `conn.release()` ทำให้พอยิง request ผิดพลาดไป 10 ครั้ง Pool Connection เต็ม เซิร์ฟเวอร์จะค้างและไม่รับ request อีกเลย
  2. **Dirty Insert:** มีการ `INSERT INTO orders` ไปแล้ว แต่พอพบว่าเมนูอาหารไม่มีขาย ดันส่ง `res.status(400)` โดยลืมเรียก `await conn.rollback()` ทำให้มีออเดอร์ผีค้างในฐานข้อมูล

---

## 🚀 วิธีการทดสอบคำตอบ
เปิด Terminal ในโฟลเดอร์นี้แล้วรัน:
```bash
npx jest tests/pattern2.test.js
```

