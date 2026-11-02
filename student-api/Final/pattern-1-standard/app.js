// Final Exam Practice - Pattern 1 (Standard)
// โครงสร้างหลัก: Express + MySQL Pool + JWT Auth + Database Transaction
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
      error: {
        code: "UNAUTHORIZED",
        message: "ต้องระบุ Token สำหรับยืนยันตัวตน",
      },
    });
  }

  jwt.verify(token, jwtSecret, (err, user) => {
    if (err) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "Token ไม่ถูกต้องหรือหมดอายุ",
        },
      });
    }
    req.user = user;
    next();
  });
}

function requireRole(requiredRole) {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: "ไม่มีสิทธิ์เข้าถึงทรัพยากรนี้",
        },
      });
    }
    next();
  };
}

// ==========================================
// โจทย์ที่ 1 (6 คะแนน): Menu Items CRUD & Query
// Pagination, Filtering & Search
// ==========================================

// GET /api/v1/menus - รายการอาหาร พร้อม Pagination, Filter (available), Search
app.get("/api/v1/menus", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.max(1, parseInt(req.query.limit) || 5);
    const offset = (page - 1) * limit;

    const { available, search } = req.query;
    const whereConditions = [];
    const params = [];

    // กรองสถานะ available
    if (available !== undefined) {
      const isAvailable = available === "true" || available === "1" || available === true ? 1 : 0;
      whereConditions.push("available = ?");
      params.push(isAvailable);
    }

    // ค้นหาตามชื่อเมนู
    if (search && search.trim() !== "") {
      whereConditions.push("name LIKE ?");
      params.push(`%${search.trim()}%`);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // 1. นับจำนวนรายการทั้งหมดตามเงื่อนไข
    const [countResult] = await pool.query(
      `SELECT COUNT(*) AS total FROM menu_items ${whereClause}`,
      params
    );
    const total = countResult[0].total;
    const totalPages = Math.ceil(total / limit);

    // 2. ดึงข้อมูลตาม Limit และ Offset
    const dataParams = [...params, limit, offset];
    const [menus] = await pool.query(
      `SELECT id, name, price, available FROM menu_items ${whereClause} ORDER BY id ASC LIMIT ? OFFSET ?`,
      dataParams
    );

    res.status(200).json({
      data: menus,
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

// GET /api/v1/menus/:id - ดูเมนูรายชิ้น
app.get("/api/v1/menus/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    const [rows] = await pool.query(
      "SELECT id, name, price, available FROM menu_items WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "MENU_NOT_FOUND",
          message: "ไม่พบเมนูอาหาร",
        },
      });
    }

    res.status(200).json({ data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// ==========================================
// โจทย์ที่ 2 (4 คะแนน): JWT Role-Based Protection
// POST /api/v1/menus - เพิ่มเมนูใหม่ (Admin Only)
// ==========================================
app.post(
  "/api/v1/menus",
  authenticateToken,
  requireRole("admin"),
  async (req, res, next) => {
    try {
      const { name, price, available } = req.body;

      if (!name || name.trim() === "" || price === undefined || Number(price) <= 0) {
        return res.status(400).json({
          error: {
            code: "VALIDATION_ERROR",
            message: "กรุณาระบุชื่อและราคาอาหารที่ถูกต้อง (ราคาต้องมากกว่า 0)",
          },
        });
      }

      const isAvailable = available === undefined ? 1 : (available ? 1 : 0);

      const [result] = await pool.query(
        "INSERT INTO menu_items (name, price, available) VALUES (?, ?, ?)",
        [name.trim(), Number(price), isAvailable]
      );

      res.status(201).json({
        message: "เพิ่มเมนูสำเร็จ",
        data: {
          id: result.insertId,
          name: name.trim(),
          price: Number(price),
          available: Boolean(isAvailable),
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

// ==========================================
// โจทย์ที่ 3 (5 คะแนน): Database Transaction
// POST /api/v1/orders - สั่งอาหารแบบ Atomic ป้องกัน Inconsistent Data
// ==========================================
app.post("/api/v1/orders", authenticateToken, async (req, res, next) => {
  const { items } = req.body;

  // ตรวจสอบความถูกต้องของ Input
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "ต้องระบุรายการอาหาร (items) อย่างน้อย 1 รายการ",
      },
    });
  }

  for (const item of items) {
    if (!item.menu_item_id || !item.quantity || Number(item.quantity) <= 0) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "menu_item_id และ quantity ต้องถูกต้อง (quantity ต้องมากกว่า 0)",
        },
      });
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const customerName = req.user.name || req.user.customer_name || `Customer #${req.user.id}`;

    // 1. สร้าง Record ในตาราง orders
    const [orderResult] = await conn.query(
      "INSERT INTO orders (customer_name, status) VALUES (?, 'pending')",
      [customerName]
    );
    const orderId = orderResult.insertId;

    // 2. ตรวจสอบเมนูแต่ละรายการ พร้อมล็อกแถวด้วย FOR UPDATE
    for (const item of items) {
      const [menuRows] = await conn.query(
        "SELECT id, name, price, available FROM menu_items WHERE id = ? FOR UPDATE",
        [item.menu_item_id]
      );

      if (menuRows.length === 0) {
        await conn.rollback();
        conn.release();
        return res.status(404).json({
          error: {
            code: "MENU_NOT_FOUND",
            message: `ไม่พบเมนูรหัส ${item.menu_item_id}`,
          },
        });
      }

      const menu = menuRows[0];
      if (!menu.available || menu.available === 0) {
        await conn.rollback();
        conn.release();
        return res.status(400).json({
          error: {
            code: "MENU_UNAVAILABLE",
            message: `เมนู '${menu.name}' หมดหรือไม่พร้อมให้บริการ`,
          },
        });
      }

      // 3. เพิ่มลง order_items
      await conn.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [orderId, item.menu_item_id, Number(item.quantity)]
      );
    }

    // 4. บันทึกข้อมูลถาวรเมื่อผ่านเงื่อนไขทั้งหมด
    await conn.commit();
    conn.release();

    res.status(201).json({
      message: "สร้างคำสั่งซื้อสำเร็จ",
      data: {
        orderId,
        status: "pending",
        itemCount: items.length,
      },
    });
  } catch (err) {
    await conn.rollback();
    conn.release();
    next(err);
  }
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Internal Server Error:", err);
  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "เกิดข้อผิดพลาดภายในเซิร์ฟเวอร์",
    },
  });
});

module.exports = app;

