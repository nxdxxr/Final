# Transaction: ตัวอย่างการใช้งานเพิ่มเติม

ตัวอย่างการใช้ Transaction ที่นอกเหนือจากการลงทะเบียนเรียนในเนื้อหา wk05.md

> อ้างอิง: เอกสารนี้เป็นส่วนเสริมของ [wk05.md](wk05.md) หัวข้อ 4 Transaction

---

## 1. โอนเงินระหว่างบัญชี (Inter-Account Transfer)

สถานการณ์ที่พบบ่อยในระบบการเงิน: ลูกค้า A ต้องการโอนเงินจำนวนหนึ่งไปยังบัญชีของลูกค้า B ต้องดำเนินการ 2 ขั้นตอน ได้แก่ (1) หักเงินออกจากบัญชี A (2) เพิ่มเงินเข้าบัญชี B หากขั้นตอนแรกสำเร็จแต่ขั้นตอนที่สองล้มเหลว เงินจะหายไปจากระบบ Transaction รับประกันว่าทั้งสองขั้นตอนจะสำเร็จพร้อมกัน หรือล้มเหลวและยกเลิกทั้งคู่

### ตัวอย่างโค้ด

```javascript
app.post("/api/v1/transfer", async (req, res, next) => {
  const { fromAccountId, toAccountId, amount } = req.body;

  // ตรวจสอบอินพุต
  if (!fromAccountId || !toAccountId || !amount || amount <= 0) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ข้อมูลไม่ครบถ้วนหรือจำนวนเงินไม่ถูกต้อง" },
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ขั้นตอนที่ 1: ตรวจสอบว่าบัญชีต้นทางมีเงินเพียงพอ
    const [fromRows] = await connection.query(
      "SELECT balance FROM accounts WHERE id = ? FOR UPDATE",
      [fromAccountId],
    );

    if (fromRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "ACCOUNT_NOT_FOUND", message: "ไม่พบบัญชีต้นทาง" },
      });
    }

    if (fromRows[0].balance < amount) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "INSUFFICIENT_BALANCE", message: "ยอดเงินในบัญชีไม่เพียงพอ" },
      });
    }

    // ขั้นตอนที่ 2: ตรวจสอบว่าบัญชีปลายทางมีอยู่จริง
    const [toRows] = await connection.query(
      "SELECT id FROM accounts WHERE id = ? FOR UPDATE",
      [toAccountId],
    );

    if (toRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "ACCOUNT_NOT_FOUND", message: "ไม่พบบัญชีปลายทาง" },
      });
    }

    // ขั้นตอนที่ 3: หักเงินจากบัญชีต้นทาง
    await connection.query(
      "UPDATE accounts SET balance = balance - ? WHERE id = ?",
      [amount, fromAccountId],
    );

    // ขั้นตอนที่ 4: เพิ่มเงินเข้าบัญชีปลายทาง
    await connection.query(
      "UPDATE accounts SET balance = balance + ? WHERE id = ?",
      [amount, toAccountId],
    );

    // ขั้นตอนที่ 5: บันทึกประวัติการโอนเงิน
    await connection.query(
      "INSERT INTO transfer_history (from_account_id, to_account_id, amount, status) VALUES (?, ?, ?, ?)",
      [fromAccountId, toAccountId, amount, "completed"],
    );

    await connection.commit();
    res.status(200).json({
      message: "โอนเงินสำเร็จ",
      data: { fromAccountId, toAccountId, amount },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});
```

### ประเด็นสำคัญ

- **ล็อกทั้งสองบัญชี**: ใช้ `FOR UPDATE` กับแถวทั้งบัญชีต้นทางและปลายทาง เพื่อป้องกัน race condition ในกรณีที่มีการโอนเงินหลายครั้งพร้อมกัน
- **ตรวจสอบก่อนเปลี่ยน**: ตรวจสอบยอดเงินเพียงพอก่อนการ UPDATE ถ้าตรวจสอบหลังการ UPDATE อาจเขียนเงินติดลบลงฐานข้อมูล

---

## 2. การสร้างใบสั่งสินค้า (Order Placement)

สถานการณ์: ลูกค้าสั่งสินค้า N รายการ ต้องดำเนินการ 3 ขั้นตอน ได้แก่ (1) สร้างระเบียนใบสั่ง (2) ลดจำนวนสินค้า (stock) สำหรับแต่ละรายการที่สั่ง (3) ค้นหาและกำหนดโปรโมชันหากมี หากขั้นตอนใดขั้นตอนหนึ่งล้มเหลว (เช่น สินค้ารายการใดรายการหนึ่งหมด) ต้องยกเลิกการสั่งทั้งใบ

### ตัวอย่างโค้ด

```javascript
app.post("/api/v1/orders", async (req, res, next) => {
  const { customerId, items } = req.body;

  // items = [{ productId: 1, quantity: 2 }, { productId: 3, quantity: 1 }]

  if (!customerId || !items || items.length === 0) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "ข้อมูลใบสั่งไม่ครบถ้วน" },
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ขั้นตอนที่ 1: สร้างระเบียนใบสั่ง
    const [orderResult] = await connection.query(
      "INSERT INTO orders (customer_id, total_price, status) VALUES (?, ?, ?)",
      [customerId, 0, "pending"],
    );
    const orderId = orderResult.insertId;

    let totalPrice = 0;

    // ขั้นตอนที่ 2: ตรวจสอบและลดจำนวนสินค้าสำหรับแต่ละรายการ
    for (const item of items) {
      const { productId, quantity } = item;

      // ตรวจสอบว่าสินค้ามีจำนวนเพียงพอ (ใช้ FOR UPDATE เพื่อล็อก)
      const [productRows] = await connection.query(
        "SELECT price, stock FROM products WHERE id = ? FOR UPDATE",
        [productId],
      );

      if (productRows.length === 0) {
        await connection.rollback();
        return res.status(404).json({
          error: { code: "PRODUCT_NOT_FOUND", message: `ไม่พบสินค้า ID ${productId}` },
        });
      }

      const { price, stock } = productRows[0];

      if (stock < quantity) {
        await connection.rollback();
        return res.status(409).json({
          error: { code: "INSUFFICIENT_STOCK", message: `สินค้า ID ${productId} มีสต็อกไม่เพียงพอ` },
        });
      }

      // ลดจำนวนสินค้า
      await connection.query(
        "UPDATE products SET stock = stock - ? WHERE id = ?",
        [quantity, productId],
      );

      // เพิ่มรายการสินค้าเข้าใบสั่ง
      await connection.query(
        "INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)",
        [orderId, productId, quantity, price],
      );

      totalPrice += price * quantity;
    }

    // ขั้นตอนที่ 3: ตรวจสอบและใช้โปรโมชัน (หากมี)
    const [promoRows] = await connection.query(
      "SELECT discount_percent FROM promotions WHERE id = 1 AND active = 1",
    );

    let discountAmount = 0;
    if (promoRows.length > 0) {
      discountAmount = Math.floor((totalPrice * promoRows[0].discount_percent) / 100);
    }

    const finalPrice = totalPrice - discountAmount;

    // อัปเดตใบสั่งด้วยราคาสุดท้าย
    await connection.query(
      "UPDATE orders SET total_price = ?, discount_amount = ?, status = ? WHERE id = ?",
      [finalPrice, discountAmount, "confirmed", orderId],
    );

    await connection.commit();
    res.status(201).json({
      message: "สร้างใบสั่งสำเร็จ",
      data: {
        orderId,
        totalPrice,
        discountAmount,
        finalPrice,
        itemCount: items.length,
      },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});
```

### ประเด็นสำคัญ

- **วนลูปใน transaction**: ขั้นตอนที่ 2 วนลูปตรวจสอบสินค้าแต่ละรายการภายใน transaction เดียวกัน หากรายการใดหมด ทั้งใบสั่งจะถูก rollback
- **ล็อกสินค้า**: ใช้ `FOR UPDATE` เพื่อล็อกแต่ละสินค้าที่ใช้ ป้องกัน race condition ในกรณีที่มีลูกค้าหลายคนสั่งสินค้าชิ้นเดียวกันพร้อมกัน
- **ทำให้ transaction สั้น**: transaction นี้ประมวลผลหลายขั้นตอนและใช้เวลานาน อาจทำให้เกิดการล็อกเป็นเวลานาน ในระบบที่ต้องการประสิทธิภาพสูงควรพิจารณาแบ่ง transaction หรือใช้แนวทางอื่น เช่น Event Queue

---

## 3. การเปลี่ยนสถานะพร้อมการตรวจสอบ (Status Transition with Validation)

สถานการณ์: ระบบการจัดการโครงการ เมื่อมีการเปลี่ยนสถานะโครงการจากสถานะหนึ่งเป็นอีกสถานะหนึ่ง ต้องดำเนินการตรวจสอบเงื่อนไขและบันทึกประวัติการเปลี่ยนแปลงควบคู่กันไปด้วย

### ตัวอย่างโค้ด

```javascript
app.put("/api/v1/projects/:id/status", async (req, res, next) => {
  const { projectId } = req.params;
  const { newStatus } = req.body;

  // กำหนดการเปลี่ยนสถานะที่ถูกต้อง
  const validTransitions = {
    draft: ["active"],
    active: ["on_hold", "completed"],
    on_hold: ["active", "completed"],
    completed: [], // สถานะสุดท้าย ไม่มีการเปลี่ยนแปลงต่อ
  };

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ขั้นตอนที่ 1: ดึงสถานะปัจจุบันและตรวจสอบการเปลี่ยนแปลง
    const [projectRows] = await connection.query(
      "SELECT status, name FROM projects WHERE id = ? FOR UPDATE",
      [projectId],
    );

    if (projectRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "PROJECT_NOT_FOUND", message: "ไม่พบโครงการ" },
      });
    }

    const { status: currentStatus, name: projectName } = projectRows[0];

    // ตรวจสอบว่าการเปลี่ยนสถานะนี้ถูกต้อง
    if (!validTransitions[currentStatus] || !validTransitions[currentStatus].includes(newStatus)) {
      await connection.rollback();
      return res.status(409).json({
        error: {
          code: "INVALID_TRANSITION",
          message: `ไม่สามารถเปลี่ยนจาก ${currentStatus} เป็น ${newStatus} ได้`,
        },
      });
    }

    // ขั้นตอนที่ 2: ตรวจสอบความพร้อมของโครงการตามสถานะใหม่
    if (newStatus === "completed") {
      const [taskRows] = await connection.query(
        "SELECT COUNT(*) as total, SUM(CASE WHEN status = ? THEN 1 ELSE 0 END) as completed FROM tasks WHERE project_id = ?",
        ["completed", projectId],
      );

      if (taskRows[0].total !== taskRows[0].completed) {
        await connection.rollback();
        return res.status(409).json({
          error: {
            code: "INCOMPLETE_TASKS",
            message: "ไม่สามารถปิดโครงการได้ เนื่องจากยังมีงานที่ยังไม่เสร็จ",
          },
        });
      }
    }

    // ขั้นตอนที่ 3: อัปเดตสถานะ
    await connection.query(
      "UPDATE projects SET status = ?, updated_at = NOW() WHERE id = ?",
      [newStatus, projectId],
    );

    // ขั้นตอนที่ 4: บันทึกประวัติการเปลี่ยนสถานะ
    await connection.query(
      "INSERT INTO project_status_history (project_id, from_status, to_status, changed_at) VALUES (?, ?, ?, NOW())",
      [projectId, currentStatus, newStatus],
    );

    // ขั้นตอนที่ 5: ส่งการแจ้งเตือนถ้าจำเป็น
    if (newStatus === "completed") {
      // ค้นหาผู้จัดการโครงการและส่งอีเมล (สมมุติ)
      const [managerRows] = await connection.query(
        "SELECT email FROM users WHERE id = (SELECT manager_id FROM projects WHERE id = ?)",
        [projectId],
      );

      if (managerRows.length > 0) {
        await connection.query(
          "INSERT INTO notifications (user_id, message, type) VALUES ((SELECT manager_id FROM projects WHERE id = ?), ?, ?)",
          [projectId, `โครงการ ${projectName} เสร็จแล้ว`, "project_completed"],
        );
      }
    }

    await connection.commit();
    res.status(200).json({
      message: "เปลี่ยนสถานะสำเร็จ",
      data: {
        projectId,
        fromStatus: currentStatus,
        toStatus: newStatus,
      },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});
```

### ประเด็นสำคัญ

- **ตรวจสอบกฎการเปลี่ยนสถานะ**: ก่อนดำเนินการ ต้องตรวจสอบว่าการเปลี่ยนสถานะนั้นเป็นการเปลี่ยนที่ระบบอนุญาต
- **ตรวจสอบเงื่อนไขความพร้อม**: ตรวจสอบว่าระบบอยู่ในสภาวะที่พร้อมเปลี่ยนสถานะแล้วหรือไม่ (เช่น ต้องให้ภารกิจทั้งหมดเสร็จก่อนจึงจะปิดโครงการได้)
- **บันทึกประวัติ**: การเปลี่ยนสถานะเป็นเหตุการณ์สำคัญ ควรบันทึกประวัติไว้เพื่อการตรวจสอบย้อนหลัง (audit)

---

## 4. การย้อนกลับข้อมูลหลังการดำเนินการที่ commit ไปแล้ว (Compensating Transaction)

สถานการณ์: ในบางกรณีจำเป็นต้องย้อนกลับผลของ transaction ที่ commit ไปแล้ว (เช่น เมื่อ logic ระดับแอปพลิเคชันตรวจพบข้อผิดพลาดในภายหลัง) จึงต้องมี "compensating transaction" เพื่อย้อนสถานะกลับ

### ตัวอย่างโค้ด

```javascript
// ตัวอย่าง endpoint คืนเงิน ซึ่งเป็น compensating transaction ของการชำระเงินที่ commit ไปแล้ว
app.post("/api/v1/refund", async (req, res, next) => {
  const { orderId } = req.body;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // ดึงข้อมูลใบสั่งและรายการสินค้า
    const [orderRows] = await connection.query(
      "SELECT customer_id, total_price FROM orders WHERE id = ? FOR UPDATE",
      [orderId],
    );

    if (orderRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "ORDER_NOT_FOUND", message: "ไม่พบใบสั่ง" },
      });
    }

    // ดึงรายการสินค้าในใบสั่ง
    const [itemRows] = await connection.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = ?",
      [orderId],
    );

    // ส่งคืนจำนวนสินค้า
    for (const item of itemRows) {
      await connection.query(
        "UPDATE products SET stock = stock + ? WHERE id = ?",
        [item.quantity, item.product_id],
      );
    }

    // ส่งเงินคืนไปยังบัญชีลูกค้า
    const refundAmount = orderRows[0].total_price;
    await connection.query(
      "UPDATE accounts SET balance = balance + ? WHERE id = (SELECT customer_id FROM orders WHERE id = ?)",
      [refundAmount, orderId],
    );

    // อัปเดตสถานะใบสั่ง
    await connection.query(
      "UPDATE orders SET status = ?, refunded_at = NOW() WHERE id = ?",
      ["refunded", orderId],
    );

    // บันทึกประวัติการคืนเงิน
    await connection.query(
      "INSERT INTO refund_history (order_id, amount, reason, refunded_at) VALUES (?, ?, ?, NOW())",
      [orderId, refundAmount, "customer_request"],
    );

    await connection.commit();
    res.status(200).json({
      message: "คืนเงินสำเร็จ",
      data: { orderId, refundAmount },
    });
  } catch (err) {
    await connection.rollback();
    next(err);
  } finally {
    connection.release();
  }
});
```

### ประเด็นสำคัญ

- **Compensating Transaction**: การคืนเงินเป็น "compensating transaction" ที่ย้อนกลับผลกระทบของการซื้อ
- **บันทึกเหตุผล**: ควรบันทึกเหตุผลของการคืนเงินเพื่อการตรวจสอบย้อนหลัง (audit) และการจัดการข้อโต้แย้งกับลูกค้าในภายหลัง

---

## 5. เปรียบเทียบ Transaction กับการออกแบบโดยไม่ต้อง Transaction

| สถานการณ์ | ควรใช้ Transaction | ทำไม |
|---------|----------------|-----|
| โอนเงิน | **ใช่** | หากล้มเหลวครึ่งทาง เงินจะหายจากระบบ |
| สั่งสินค้า | **ใช่** | หากสินค้าขาด ต้องยกเลิกใบสั่งทั้งใบ |
| อ่านข้อมูลสถิติ | **ไม่** | ไม่มีการเปลี่ยนแปลงข้อมูล จึงไม่จำเป็น |
| ส่งอีเมล + บันทึก DB | **ไม่** (ส่วนใหญ่) | ควรแยกกัน: บันทึก DB ใน transaction ส่วนการส่งอีเมลทำเป็นงานเบื้องหลัง (async) แยกต่างหาก |
| อัปเดตและคำนวณรายงาน | **อาจไม่จำเป็น** | หากข้อมูลอ้างอิง (reference) เปลี่ยนแปลงไม่บ่อย อาจสร้างรายงานจาก snapshot แทน |

---

## สรุป

Transaction เป็นกลไกพื้นฐานสำหรับรักษาความถูกต้องของข้อมูลในสถานการณ์ที่มีการดำเนินการหลายขั้นตอนเกี่ยวข้องกัน และการตัดสินใจเลือกใช้ transaction ต้องพิจารณาจากความสำคัญของข้อมูล ความเสี่ยงของการล้มเหลว และประสิทธิภาพของระบบ

---

## เอกสารอ้างอิง

1. MySQL Official Documentation. _15.7.2.4 Locking Reads (SELECT ... FOR UPDATE)_. สืบค้นจาก https://dev.mysql.com/doc/refman/8.0/en/innodb-locking-reads.html
2. MySQL Official Documentation. _15.7.2.3 Transaction Isolation Levels_. สืบค้นจาก https://dev.mysql.com/doc/refman/8.0/en/innodb-transaction-isolation-levels.html
3. Martin Fowler. _Microservices Patterns: With examples in Java_. Addison-Wesley, 2018.
