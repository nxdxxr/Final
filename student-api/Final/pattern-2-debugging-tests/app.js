// Final Exam Practice - Pattern 2 (Debugging & Testing Focus)
// เน้นจุดที่มักมีบั๊ก: Pagination math, Auth middleware error handling, Transaction connection leak
const express = require("express");
const jwt = require("jsonwebtoken");
const { pool } = require("./db");
const { jwtSecret } = require("./config");

const app = express();
app.use(express.json());

// ==========================================
// โจทย์ที่ 2 (4 คะแนน): Debugged Auth Middleware
// จุดที่มักมีบั๊ก:
// 1. ไม่มี Header หรือ Header เป็นค่าว่าง ทำให้ .split(" ") crash
// 2. ไม่ได้ตรวจสอบคำว่า "Bearer " นำหน้า
// 3. jwt.verify แบบ sync แล้วไม่ใส่ try...catch ทำให้เซิร์ฟเวอร์ตาย
// ==========================================
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  
  // ตรวจสอบว่ามี Header หรือไม่ และขึ้นต้นด้วย "Bearer " ถูกต้อง
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "ต้องระบุ Token ในรูปแบบ Bearer <token>",
      },
    });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "ไม่พบ Token ในส่วน Header",
      },
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: err.name === "TokenExpiredError" ? "Token หมดอายุแล้ว" : "Token ไม่ถูกต้อง",
        },
      });
    }
    req.user = user;
    next();
  });
}

// ==========================================
// โจทย์ที่ 1 (6 คะแนน): Debugged Pagination & Query
// จุดที่มักมีบั๊ก:
// 1. totalPages ใช้ Math.floor แทน Math.ceil ทำให้หน้าสุดท้ายหาย
// 2. page หรือ limit เป็น NaN / String หรือค่าน้อยกว่า 1
// 3. SQL Injection เมื่อต่อ String ใน query search
// ==========================================
app.get("/api/v1/menus", async (req, res, next) => {
  try {
    // ป้องกัน NaN หรือค่าติดลบ
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 5;

    const offset = (page - 1) * limit;
    const { available, search } = req.query;

    const conditions = [];
    const params = [];

    if (available !== undefined) {
      const isAvailable = (available === "true" || available === "1" || available === true) ? 1 : 0;
      conditions.push("available = ?");
      params.push(isAvailable);
    }

    if (search && search.trim() !== "") {
      conditions.push("name LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const whereClause = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

    // นับจำนวนรวม
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM menu_items ${whereClause}`,
      params
    );
    const total = countRows[0].total;

    // แก้บั๊ก: ต้องใช้ Math.ceil เท่านั้น
    const totalPages = Math.ceil(total / limit);

    // ดึงข้อมูล
    const [rows] = await pool.query(
      `SELECT id, name, price, available FROM menu_items ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.status(200).json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// โจทย์ที่ 3 (5 คะแนน): Debugged Transaction
// จุดที่มักมีบั๊ก:
// 1. Connection Leak: ลืม conn.release() เมื่อเกิด error หรือ rollback
// 2. Dirty Insert: บันทึก orders ไปแล้วแต่เมนูไม่มีขาย ไม่ได้ rollback
// 3. Concurrency Race: ไม่อ่านด้วย FOR UPDATE
// ==========================================
app.post("/api/v1/orders", authenticateToken, async (req, res, next) => {
  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "รายการอาหารต้องเป็น Array และมีอย่างน้อย 1 รายการ",
      },
    });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const customerName = req.user.name || "Anonymous";

    // 1. บันทึกคำสั่งซื้อ
    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_name, status) VALUES (?, 'pending')",
      [customerName]
    );
    const orderId = orderResult.insertId;

    // 2. ลูปตรวจสอบสินค้า
    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      if (isNaN(qty) || qty <= 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "จำนวนสินค้า (quantity) ต้องเป็นตัวเลขมากกว่า 0",
          },
        });
      }

      // SELECT FOR UPDATE ล็อกแถว
      const [menuRows] = await conn.query(
        "SELECT id, name, price, available FROM menu_items WHERE id = ? FOR UPDATE",
        [it.menu_item_id]
      );

      if (menuRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          error: {
            code: "MENU_NOT_FOUND",
            message: `ไม่พบเมนูรหัส ${it.menu_item_id}`,
          },
        });
      }

      if (!menuRows[0].available) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: {
            code: "MENU_UNAVAILABLE",
            message: `เมนู '${menuRows[0].name}' ไม่พร้อมให้บริการในขณะนี้`,
          },
        });
      }

      await conn.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [orderId, it.menu_item_id, qty]
      );
    }

    await conn.commit();
    conn.release(); // คืน Connection สู่ Pool เสมอ

    res.status(201).json({
      message: "สั่งอาหารสำเร็จ",
      data: {
        orderId,
        status: "pending",
        itemCount: items.length,
      },
    });
  } catch (err) {
    // ป้องกัน Connection Leak ในทุกกรณีที่เกิด Unhandled Exception
    try {
      await conn.rollback();
    } catch (e) {
      // rollback error ignore
    }
    conn.release();
    next(err);
  }
});

module.exports = app;

