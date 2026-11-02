// Final Exam Practice - Pattern 3 (Order Workflow & Lifecycle)
// โครงสร้าง: Complex SQL JOIN, State Machine Validation, Order Cancellation Transaction
const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");
const { jwtSecret } = require("./config");

const app = express();
app.use(express.json());

// ==========================================
// Middleware: Authentication & Authorization
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      error: { code: "UNAUTHORIZED", message: "ต้องระบุ Token" },
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "Token ไม่ถูกต้องหรือหมดอายุ" },
      });
    }
    req.user = user;
    next();
  });
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: { code: "FORBIDDEN", message: "ไม่มีสิทธิ์เข้าถึงฟังก์ชันนี้" },
      });
    }
    next();
  };
}

// ==========================================
// โจทย์ที่ 1 (6 คะแนน): Complex SQL JOIN
// GET /api/v1/orders/:id - ดูรายละเอียดออเดอร์พร้อมรายการอาหารและคำนวณยอดรวม
// ==========================================
app.get("/api/v1/orders/:id", async (req, res, next) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    if (isNaN(orderId)) {
      return res.status(400).json({
        error: { code: "VALIDATION_ERROR", message: "รหัสคำสั่งซื้อไม่ถูกต้อง" },
      });
    }

    // 1. ตรวจสอบว่ามี Order หรือไม่
    const [orderRows] = await pool.query(
      "SELECT id, customer_name, status, created_at FROM orders WHERE id = ?",
      [orderId]
    );

    if (orderRows.length === 0) {
      return res.status(404).json({
        error: { code: "ORDER_NOT_FOUND", message: "ไม่พบคำสั่งซื้อที่ระบุ" },
      });
    }

    const order = orderRows[0];

    // 2. JOIN order_items กับ menu_items เพื่อดึงชื่อและราคาอาหาร
    const [itemRows] = await pool.query(
      `SELECT oi.id AS order_item_id, oi.menu_item_id, oi.quantity,
              m.name AS menu_name, m.price
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`,
      [orderId]
    );

    let totalAmount = 0;
    const items = itemRows.map((it) => {
      const price = Number(it.price);
      const subtotal = price * it.quantity;
      totalAmount += subtotal;
      return {
        menu_item_id: it.menu_item_id,
        name: it.menu_name,
        price,
        quantity: it.quantity,
        subtotal,
      };
    });

    res.status(200).json({
      data: {
        order_id: order.id,
        customer_name: order.customer_name,
        status: order.status,
        created_at: order.created_at,
        items,
        total_amount: totalAmount,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// โจทย์ที่ 2 (4 คะแนน): Order Status Workflow & State Machine
// PATCH /api/v1/orders/:id/status - อัปเดตสถานะ (Admin/Staff Only)
// ==========================================
app.patch(
  "/api/v1/orders/:id/status",
  authenticateToken,
  requireRole("admin", "staff"),
  async (req, res, next) => {
    try {
      const orderId = parseInt(req.params.id, 10);
      const { status: nextStatus } = req.body;

      const validStatuses = ["pending", "preparing", "delivered", "cancelled"];
      if (!nextStatus || !validStatuses.includes(nextStatus)) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: `สถานะต้องเป็นหนึ่งใน: ${validStatuses.join(", ")}`,
          },
        });
      }

      const [orderRows] = await pool.query(
        "SELECT id, status FROM orders WHERE id = ?",
        [orderId]
      );

      if (orderRows.length === 0) {
        return res.status(404).json({
          error: { code: "ORDER_NOT_FOUND", message: "ไม่พบคำสั่งซื้อ" },
        });
      }

      const currentStatus = orderRows[0].status;

      // กฎของ State Machine: ถ้าจบไปแล้ว (delivered/cancelled) ห้ามเปลี่ยนสถานะอีก
      if (currentStatus === "delivered" || currentStatus === "cancelled") {
        return res.status(400).json({
          error: {
            code: "INVALID_STATE_TRANSITION",
            message: `ไม่สามารถเปลี่ยนสถานะคำสั่งซื้อที่ ${currentStatus} แล้วได้`,
          },
        });
      }

      await pool.query("UPDATE orders SET status = ? WHERE id = ?", [nextStatus, orderId]);

      res.status(200).json({
        message: "อัปเดตสถานะคำสั่งซื้อสำเร็จ",
        data: {
          order_id: orderId,
          previous_status: currentStatus,
          current_status: nextStatus,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// โจทย์ที่ 3 (5 คะแนน): Order Cancellation Transaction
// DELETE /api/v1/orders/:id - ขอยกเลิกคำสั่งซื้อด้วย Transaction
// ==========================================
app.delete("/api/v1/orders/:id", authenticateToken, async (req, res, next) => {
  const orderId = parseInt(req.params.id, 10);
  if (isNaN(orderId)) {
    return res.status(400).json({
      error: { code: "VALIDATION_ERROR", message: "รหัสคำสั่งซื้อไม่ถูกต้อง" },
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // ล็อกแถวเพื่อตรวจสอบสถานะ
    const [orderRows] = await conn.query(
      "SELECT id, customer_name, status FROM orders WHERE id = ? FOR UPDATE",
      [orderId]
    );

    if (orderRows.length === 0) {
      await conn.rollback();
      conn.release();
      return res.status(404).json({
        error: { code: "ORDER_NOT_FOUND", message: "ไม่พบคำสั่งซื้อที่ต้องการยกเลิก" },
      });
    }

    const order = orderRows[0];

    // เงื่อนไข: ยกเลิกได้เฉพาะคำสั่งซื้อที่ยังเป็น 'pending' เท่านั้น
    if (order.status !== "pending") {
      await conn.rollback();
      conn.release();
      return res.status(400).json({
        error: {
          code: "CANNOT_CANCEL_ORDER",
          message: `ไม่สามารถยกเลิกคำสั่งซื้อที่อยู่ในสถานะ '${order.status}' ได้`,
        },
      });
    }

    // ลบรายการใน order_items ก่อน (หรือให้ FK CASCADE ทำงาน)
    await conn.query("DELETE FROM order_items WHERE order_id = ?", [orderId]);
    // ลบใน orders
    await conn.query("DELETE FROM orders WHERE id = ?", [orderId]);

    await conn.commit();
    conn.release();

    res.status(200).json({
      message: "ยกเลิกคำสั่งซื้อสำเร็จและลบข้อมูลเรียบร้อย",
      data: {
        cancelled_order_id: orderId,
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
});

module.exports = app;

