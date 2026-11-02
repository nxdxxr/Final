# แนวข้อสอบปฏิบัติปลายภาค รูปแบบที่ 3 (Order Workflow & Lifecycle)
**สถานการณ์:** การบริหารจัดการคำสั่งซื้อแบบหลายตาราง (JOIN), State Machine Validation และ Transaction สำหรับยกเลิกออเดอร์  
**คะแนนเต็ม:** 15 คะแนน (แบ่ง 3 ข้อย่อย: 6, 4, 5 คะแนน)

---

## 🎯 รายละเอียดโจทย์และข้อกำหนด

### โจทย์ที่ 1 (6 คะแนน): Complex SQL JOIN ดูรายละเอียดออเดอร์
* **`GET /api/v1/orders/:id`**
  - ดึงข้อมูลจากตาราง `orders` พร้อมทำ `JOIN` กับ `order_items` และ `menu_items`
  - คำนวณยอดเงินรวม `total_amount` จาก `SUM(quantity * price)`
  - ส่งข้อมูลคืนในรูปแบบ Nested JSON:
    ```json
    {
      "data": {
        "order_id": 1,
        "customer_name": "สมชาย",
        "status": "delivered",
        "created_at": "2026-01-10T05:00:00.000Z",
        "items": [
          { "menu_item_id": 1, "name": "ข้าวผัดกุ้ง", "price": 60, "quantity": 2, "subtotal": 120 }
        ],
        "total_amount": 120
      }
    }
    ```

### โจทย์ที่ 2 (4 คะแนน): Order Status Workflow & State Machine
* **`PATCH /api/v1/orders/:id/status`** (Admin & Staff Only)
  - ต้องมี JWT Token และมี `role` เป็น `'admin'` หรือ `'staff'` เท่านั้น
  - รับ Body: `{ "status": "preparing" }`
  - ตรวจสอบ State Machine: หากออเดอร์มีสถานะเป็น `delivered` หรือ `cancelled` แล้ว **ห้ามเปลี่ยนสถานะอีก** (ตอบกลับ 400 `INVALID_STATE_TRANSITION`)

### โจทย์ที่ 3 (5 คะแนน): Transaction สำหรับการยกเลิกออเดอร์
* **`DELETE /api/v1/orders/:id`**
  - ตรวจสอบสถานะออเดอร์: **ยกเลิกได้เฉพาะออเดอร์ที่อยู่ในสถานะ `'pending'` เท่านั้น**
  - หากกำลังปรุง (`preparing`) หรือส่งแล้ว (`delivered`) -> ปฏิเสธ 400 `CANNOT_CANCEL_ORDER`
  - ใช้ `START TRANSACTION` ในการลบข้อมูลทั้งใน `order_items` และ `orders` อย่างปลอดภัย

---

## 🚀 วิธีการทดสอบคำตอบ
เปิด Terminal ในโฟลเดอร์นี้แล้วรัน:
```bash
npx jest tests/pattern3.test.js
```

