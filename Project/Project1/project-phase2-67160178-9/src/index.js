require("dotenv").config();

const express = require("express");
const path = require("path");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");

const pool = require("./db");
const { fetchGymWeatherWithResilience } = require("./services/external-api");

const app = express();
const PORT = process.env.PORT || 3000;

// โหลดเอกสาร OpenAPI Specification
const swaggerDocument = YAML.load(path.join(__dirname, "openapi.yaml"));

// ========================================================
// Middlewares
// ========================================================
app.use(
  helmet({
    contentSecurityPolicy: false, // ปิด CSP เพื่อให้ Swagger UI แสดงผลได้ถูกต้อง
  })
);
app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

// ========================================================
// Swagger UI Docs (สัปดาห์ที่ 10: Docs & DX)
// ========================================================
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// ========================================================
// Root / Health Check
// ========================================================
app.get("/", (req, res) => {
  res.json({
    message: "Fitness & Gym Management API พร้อมใช้งาน (Project Phase 1 & 2)",
    studentId: "67160178",
    pno: 9,
    resource: "gyms",
    documentation: {
      swaggerUi: "/api-docs",
      openapiSpec: "/openapi.yaml",
    },
    endpoints: {
      gyms: "/api/v1/gyms",
      gymById: "/api/v1/gyms/:id",
      gymClasses: "/api/v1/gyms/:id/classes",
      gymWeather: "/api/v1/gyms/:id/weather (External API with Retry/Timeout/Fallback)",
      classes: "/api/v1/classes",
      bookClass: "POST /api/v1/classes/:id/bookings (Transaction-safe)",
      members: "/api/v1/members",
      registerMember: "POST /api/v1/members",
    },
  });
});

// ให้บริการไฟล์ openapi.yaml ตรง ๆ เผื่อเรียกดูไฟล์ดิบ
app.get("/openapi.yaml", (req, res) => {
  res.sendFile(path.join(__dirname, "openapi.yaml"));
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

    const [gymRows] = await pool.query("SELECT id, name FROM gyms WHERE id = ?", [gymId]);
    if (gymRows.length === 0) {
      return res.status(404).json({
        error: {
          code: "GYM_NOT_FOUND",
          message: "ไม่พบข้อมูลฟิตเนสที่ระบุ",
        },
      });
    }

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

// 4. External API Integration: ดึงข้อมูลสภาพอากาศภายนอกพร้อมกลไกความทนทาน (สัปดาห์ที่ 11: Resilience)
// รองรับ ?simulate=network | ?simulate=timeout | ?simulate=500 สำหรับทดสอบ Failure Scenario
app.get("/api/v1/gyms/:id/weather", async (req, res, next) => {
  try {
    const gymId = Number(req.params.id);
    const { simulate } = req.query;

    const [gymRows] = await pool.query("SELECT id, name FROM gyms WHERE id = ?", [gymId]);
    if (gymRows.length === 0) {
      return res.status(404).json({
        error: {
          code: "GYM_NOT_FOUND",
          message: "ไม่พบข้อมูลฟิตเนสที่ระบุ",
        },
      });
    }

    const gymName = gymRows[0].name;

    // เรียก External API ผ่านฟังก์ชันที่มี Retry, Timeout, และ Fallback
    const weatherResult = await fetchGymWeatherWithResilience(gymId, gymName, {
      simulate,
      timeoutMs: 3000,
      maxRetries: 2,
    });

    res.status(200).json({
      message: "ดึงข้อมูลสภาพอากาศสำเร็จ",
      data: weatherResult.data,
      resilience: {
        attemptsUsed: weatherResult.attemptsUsed,
        isFallback: weatherResult.data.isFallback,
        logs: weatherResult.logs,
      },
    });
  } catch (err) {
    next(err);
  }
});

// ========================================================
// API Routes: Classes & Bookings
// ========================================================

// 5. ดึงรายการคลาสออกกำลังกายทั้งหมดในระบบ
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

// 6. จองคลาสออกกำลังกาย (ใช้ Database Transaction ป้องกัน Concurrency และ Race Condition)
app.post("/api/v1/classes/:id/bookings", async (req, res, next) => {
  const classId = Number(req.params.id);
  const { memberId } = req.body;

  if (!memberId) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ memberId ใน Request Body",
      },
    });
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. ตรวจสอบและ Lock แถวคลาสด้วย FOR UPDATE ป้องกัน race condition
    const [classRows] = await connection.query(
      "SELECT * FROM classes WHERE id = ? FOR UPDATE",
      [classId]
    );

    if (classRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "CLASS_NOT_FOUND", message: "ไม่พบข้อมูลคลาสออกกำลังกายที่ระบุ" },
      });
    }

    const selectedClass = classRows[0];

    // 2. ตรวจสอบจำนวนที่นั่งคงเหลือ
    if (selectedClass.available_spots <= 0) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "SEAT_FULL", message: "ที่นั่งในคลาสนี้เต็มแล้ว ไม่สามารถจองเพิ่มได้" },
      });
    }

    // 3. ตรวจสอบสมาชิกว่ามีอยู่จริงหรือไม่
    const [memberRows] = await connection.query(
      "SELECT id, name FROM members WHERE id = ?",
      [memberId]
    );

    if (memberRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "MEMBER_NOT_FOUND", message: "ไม่พบข้อมูลสมาชิกที่ระบุ" },
      });
    }

    // 4. บันทึกข้อมูลการจอง
    const [insertResult] = await connection.query(
      "INSERT INTO class_bookings (member_id, class_id, status) VALUES (?, ?, 'confirmed')",
      [memberId, classId]
    );

    // 5. ตัดยอดที่นั่งว่างในคลาส
    await connection.query(
      "UPDATE classes SET available_spots = available_spots - 1 WHERE id = ?",
      [classId]
    );

    await connection.commit();

    res.status(201).json({
      message: "จองคลาสออกกำลังกายสำเร็จ",
      bookingId: insertResult.insertId,
      classId,
      memberId,
      className: selectedClass.class_name,
      remainingSpots: selectedClass.available_spots - 1,
    });
  } catch (err) {
    await connection.rollback();

    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "ALREADY_BOOKED",
          message: "สมาชิกท่านนี้ได้ทำการจองคลาสดังกล่าวไปแล้ว",
        },
      });
    }

    next(err);
  } finally {
    connection.release();
  }
});

// ========================================================
// API Routes: Members
// ========================================================

// 7. ดึงรายชื่อสมาชิกทั้งหมด
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

// 8. ลงทะเบียนสมาชิกใหม่
app.post("/api/v1/members", async (req, res, next) => {
  const { name, email, phone, gymId } = req.body;

  if (!name || !email || !phone || !gymId) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ name, email, phone และ gymId ให้ครบถ้วน",
      },
    });
  }

  try {
    // ตรวจสอบว่าสาขาฟิตเนสมีอยู่จริงหรือไม่
    const [gymRows] = await pool.query("SELECT id FROM gyms WHERE id = ?", [gymId]);
    if (gymRows.length === 0) {
      return res.status(404).json({
        error: {
          code: "GYM_NOT_FOUND",
          message: "ไม่พบสาขาฟิตเนสที่ระบุ",
        },
      });
    }

    const [insertResult] = await pool.query(
      "INSERT INTO members (name, email, phone, gym_id, membership_status) VALUES (?, ?, ?, ?, 'active')",
      [name, email, phone, gymId]
    );

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      data: {
        id: insertResult.insertId,
        gym_id: gymId,
        name,
        email,
        phone,
        membership_status: "active",
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "อีเมลนี้ถูกใช้สมัครสมาชิกในระบบแล้ว",
        },
      });
    }
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
    const connection = await pool.getConnection();
    console.log("เชื่อมต่อ MySQL Database Pool สำเร็จ!");
    connection.release();

    app.listen(PORT, () => {
      console.log(`=================================================`);
      console.log(` Fitness API Server (Phase 1 & 2) พอร์ต: ${PORT}`);
      console.log(` API Base: http://localhost:${PORT}`);
      console.log(` Swagger UI Docs: http://localhost:${PORT}/api-docs`);
      console.log(`=================================================`);
    });
  } catch (err) {
    console.error("ไม่สามารถเชื่อมต่อฐานข้อมูลได้:", err.message);
    app.listen(PORT, () => {
      console.log(`เซิร์ฟเวอร์ทำงานที่พอร์ต ${PORT} (รอการเชื่อมต่อ MySQL)`);
    });
  }
}

startServer();

module.exports = app;
