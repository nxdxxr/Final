require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const pool = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================================
// Middlewares
// ========================================================
app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ========================================================
// Root / Health Check
// ========================================================
app.get("/", (req, res) => {
  res.json({
    message: "Fitness & Gym Management API พร้อมใช้งาน (Project Phase 1)",
    studentId: "67160178",
    pno: 9,
    resource: "gyms",
    endpoints: {
      gyms: "/api/v1/gyms",
      gymById: "/api/v1/gyms/:id",
      gymClasses: "/api/v1/gyms/:id/classes",
      classes: "/api/v1/classes",
      members: "/api/v1/members",
    },
  });
});

// ========================================================
// API Routes: Gyms (Resource หลักตามโจทย์ Pno: 9)
// ========================================================

// 1. ดึงรายชื่อฟิตเนสทั้งหมด (รองรับกรองตามชื่อ หรือค่าบริการรายเดือนสูงสุด max_fee)
app.get("/api/v1/gyms", async (req, res, next) => {
  try {
    const { search, max_fee } = req.query;
    let sql = "SELECT * FROM gyms WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND (name LIKE ? OR address LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (max_fee) {
      sql += " AND monthly_fee <= ?";
      params.push(Number(max_fee));
    }

    sql += " ORDER BY id ASC";

    const [rows] = await pool.query(sql, params);

    res.status(200).json({
      message: "ดึงข้อมูลฟิตเนสสำเร็จ",
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// 2. ดึงข้อมูลฟิตเนสรายแห่งตาม id
app.get("/api/v1/gyms/:id", async (req, res, next) => {
  try {
    const gymId = Number(req.params.id);
    const [rows] = await pool.query("SELECT * FROM gyms WHERE id = ?", [gymId]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: {
          code: "GYM_NOT_FOUND",
          message: "ไม่พบข้อมูลฟิตเนสที่ระบุ",
        },
      });
    }

    res.status(200).json({
      message: "ดึงข้อมูลฟิตเนสสำเร็จ",
      data: rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// 3. ดึงรายการคลาสออกกำลังกายของฟิตเนสสาขาที่ระบุ (JOIN ตาราง classes, trainers, gyms)
app.get("/api/v1/gyms/:id/classes", async (req, res, next) => {
  try {
    const gymId = Number(req.params.id);

    // ตรวจสอบว่ามีฟิตเนสสาขานี้จริงหรือไม่
    const [gymRows] = await pool.query("SELECT id, name FROM gyms WHERE id = ?", [gymId]);
    if (gymRows.length === 0) {
      return res.status(404).json({
        error: {
          code: "GYM_NOT_FOUND",
          message: "ไม่พบข้อมูลฟิตเนสที่ระบุ",
        },
      });
    }

    // Query ข้อมูลคลาสพร้อมชื่อเทรนเนอร์ผู้สอน
    const [classes] = await pool.query(
      `SELECT
         c.id AS class_id,
         c.class_name,
         c.schedule_time,
         c.max_spots,
         c.available_spots,
         t.id AS trainer_id,
         t.name AS trainer_name,
         t.specialty AS trainer_specialty
       FROM classes c
       INNER JOIN trainers t ON c.trainer_id = t.id
       WHERE c.gym_id = ?
       ORDER BY c.id ASC`,
      [gymId]
    );

    res.status(200).json({
      message: "ดึงข้อมูลคลาสออกกำลังกายของสาขาสำเร็จ",
      gym: gymRows[0],
      count: classes.length,
      data: classes,
    });
  } catch (err) {
    next(err);
  }
});

// 4. ดึงรายการคลาสออกกำลังกายทั้งหมดในระบบ
app.get("/api/v1/classes", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         c.id,
         c.class_name,
         c.schedule_time,
         c.max_spots,
         c.available_spots,
         g.id AS gym_id,
         g.name AS gym_name,
         t.id AS trainer_id,
         t.name AS trainer_name
       FROM classes c
       INNER JOIN gyms g ON c.gym_id = g.id
       INNER JOIN trainers t ON c.trainer_id = t.id
       ORDER BY c.id ASC`
    );

    res.status(200).json({
      message: "ดึงรายการคลาสออกกำลังกายทั้งหมดสำเร็จ",
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// 5. ดึงรายชื่อสมาชิกทั้งหมด
app.get("/api/v1/members", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         m.id,
         m.name,
         m.email,
         m.phone,
         m.membership_status,
         m.created_at,
         g.id AS gym_id,
         g.name AS gym_name
       FROM members m
       INNER JOIN gyms g ON m.gym_id = g.id
       ORDER BY m.id ASC`
    );

    res.status(200).json({
      message: "ดึงข้อมูลสมาชิกสำเร็จ",
      count: rows.length,
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// 404 Handler
// ========================================================
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "ไม่พบเส้นทางที่ร้องขอ (Route not found)",
    },
  });
});

// ========================================================
// Global Error Handler
// ========================================================
app.use((err, req, res, next) => {
  console.error("Error occurred:", err);

  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.code || "ERROR",
      message: statusCode === 500 ? "เกิดข้อผิดพลาดภายในระบบฐานข้อมูลหรือเซิร์ฟเวอร์" : err.message,
    },
  });
});

// ========================================================
// Server Initialization
// ========================================================
async function startServer() {
  try {
    // ทดสอบการเชื่อมต่อ Database Pool
    const connection = await pool.getConnection();
    console.log("เชื่อมต่อ MySQL Database Pool สำเร็จ!");
    connection.release();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Fitness API Server กำลังทำงานที่พอร์ต: ${PORT}`);
      console.log(` URL: http://localhost:${PORT}`);
      console.log(` API Docs Endpoint: http://localhost:${PORT}/api/v1/gyms`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้:", err.message);
    console.log("เซิร์ฟเวอร์จะยังคงเริ่มทำงานเพื่อรองรับการตั้งค่า:");
    app.listen(PORT, () => {
      console.log(`เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT} (รอการเชื่อมต่อ MySQL Database)`);
    });
  }
}

startServer();

module.exports = app;
