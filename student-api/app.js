require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema");
const root = require("./resolvers");

const pool = require("./db");

const {
  hashPassword,
  verifyPassword,
  generateToken,
} = require("./auth-helpers");

const { authenticateToken, authorizeRole } = require("./middlewares/auth");
const { redisClient } = require("./cache");
const { parsePagination, parseSort } = require("./middlewares/query-parser");
const { authLimiter, generalLimiter } = require("./middlewares/rateLimiter");
const { createStudentSchema } = require("./schemas/studentSchema");

const app = express();
const rateLimit = require("express-rate-limit");

const postLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 นาที
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "เรียกใช้งานบ่อยเกินไป กรุณาลองใหม่ภายหลัง",
    },
  },
});

function requireJson(req, res, next) {
  const methodsWithBody = ["POST", "PUT", "PATCH"];

  if (methodsWithBody.includes(req.method)) {
    if (!req.is("application/json")) {
      return res.status(415).json({
        error: {
          code: "UNSUPPORTED_MEDIA_TYPE",
          message: "กรุณาส่งข้อมูลในรูปแบบ application/json",
        },
      });
    }
  }

  next();
}

// =======================
// Middleware
// =======================
app.use(helmet());

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  }),
);

app.use(morgan("dev"));
app.use(express.json({ limit: "10kb" }));

app.set("trust proxy", 1);
app.use(generalLimiter);

// =======================
// Data
// =======================

let students = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    email: "somchai@example.com",
    phone: "080-000-0001",
    courseIds: [101, 102],
  },
  {
    id: 2,
    name: "สมหญิง รักเรียน",
    major: "เทคโนโลยีสารสนเทศ",
    email: "somying@example.com",
    phone: "080-000-0002",
    courseIds: [102],
  },
];

let courses = [
  {
    id: 101,
    courseName: "การเขียนโปรแกรมเบื้องต้น",
    credit: 3,
  },
  {
    id: 102,
    courseName: "โครงสร้างข้อมูล",
    credit: 3,
  },
];

let nextId = 3;

app.use(requireJson);

// =======================
// Home
// =======================

app.get("/", (req, res) => {
  res.json({
    message: "Student API พร้อมใช้งาน",
  });
});

// =======================
// v1 Router
// =======================
const v1Router = express.Router();

// แบบฝึกหัดที่ 3: Middleware แนบ Header Deprecation (RFC 9745) และ Link
v1Router.use((req, res, next) => {
  res.setHeader("Deprecation", "@1735689600");
  res.setHeader("Link", '</api/v2/students>; rel="successor-version"');
  next();
});

v1Router.get(
  "/students",
  parsePagination,
  parseSort,
  async (req, res, next) => {
    const { major } = req.query;
    const { page, limit, offset } = req.pagination;
    const { field, order } = req.sort;

    let baseQuery = "SELECT * FROM students";
    let countQuery = "SELECT COUNT(*) AS total FROM students";
    const params = [];

    if (major) {
      baseQuery += " WHERE major = ?";
      countQuery += " WHERE major = ?";
      params.push(major);
    }

    // แทรก field/order ลง SQL ได้โดยตรงเฉพาะเพราะผ่าน allowlist ใน parseSort มาแล้ว
    // ห้ามนำรูปแบบนี้ไปใช้กับค่าจาก req อื่นที่ไม่ได้ผ่าน allowlist
    baseQuery += ` ORDER BY ${field} ${order} LIMIT ? OFFSET ?`;

    try {
      const [rows] = await pool.query(baseQuery, [...params, limit, offset]);
      const [[{ total }]] = await pool.query(countQuery, params);

      res.status(200).json({
        message: "สำเร็จ",
        data: rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

// เพิ่ม Cache ให้กับ Endpoint รายวิชา
v1Router.get("/courses", async (req, res, next) => {
  const cacheKey = "courses:all";

  try {
    if (redisClient && redisClient.isOpen) {
      const cached = await redisClient.get(cacheKey);
      if (cached) {
        return res.status(200).json({
          message: "สำเร็จ (จาก cache)",
          data: JSON.parse(cached),
        });
      }
    }

    const [rows] = await pool.query("SELECT * FROM courses");

    if (redisClient && redisClient.isOpen) {
      await redisClient.set(cacheKey, JSON.stringify(rows), { EX: 300 }); // TTL 300 วินาที (5 นาที)
    }

    res.status(200).json({ message: "สำเร็จ (จากฐานข้อมูล)", data: rows });
  } catch (err) {
    next(err);
  }
});

app.use("/api/v1", v1Router);

// =======================
// v2 Router
// =======================
const v2Router = express.Router();

v2Router.get("/students", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students");
    // v2 ปรับโครงสร้างผลลัพธ์ใหม่ ไม่มี wrapper "message" เหมือน v1
    res.status(200).json({ items: rows, count: rows.length });
  } catch (err) {
    next(err);
  }
});

app.use("/api/v2", v2Router);

// =======================
// GET Student By ID
// รองรับ ?include=courses
// =======================

app.get("/api/v1/students/:id", async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);

    if (rows.length === 0) {
      return res.status(404).json({
        error: { code: "NOT_FOUND", message: "ไม่พบข้อมูลนักศึกษา" },
      });
    }

    res.status(200).json({ message: "สำเร็จ", data: rows[0] });
  } catch (err) {
    next(err);
  }
});

// =======================
// POST Student
// =======================

app.post("/api/v1/students", async (req, res, next) => {
  const result = createStudentSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
        details: result.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
  }

  const { name, major, email } = result.data;

  try {
    const [result] = await pool.query(
      "INSERT INTO students (name, major, email) VALUES (?, ?, ?)",
      [name, major, email],
    );

    if (redisClient && redisClient.isOpen) {
      await redisClient.del("students:all"); // ล้างแคชเนื่องจากข้อมูลเปลี่ยนแปลงแล้ว
    }

    res.status(201).json({
      message: "เพิ่มข้อมูลสำเร็จ",
      data: { id: result.insertId, name, major, email },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: { code: "DUPLICATE_EMAIL", message: "อีเมลนี้มีอยู่ในระบบแล้ว" },
      });
    }
    next(err);
  }
});

// =======================
// PUT Student
// =======================

app.put("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);

  const { name, major, email } = req.body;

  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "ไม่พบข้อมูลนักศึกษา",
      },
    });
  }

  if (!name || !major || !email) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุข้อมูลให้ครบ",
      },
    });
  }

  student.name = name;
  student.major = major;
  student.email = email;

  res.status(200).json({
    message: "แก้ไขข้อมูลสำเร็จ",
    data: student,
  });
});

// =======================
// PATCH Student
// =======================

app.patch("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);

  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({
      error: {
        code: "NOT_FOUND",
        message: "ไม่พบข้อมูลนักศึกษา",
      },
    });
  }

  const { name, major, email } = req.body;

  if (name !== undefined) student.name = name;
  if (major !== undefined) student.major = major;
  if (email !== undefined) student.email = email;

  res.status(200).json({
    message: "แก้ไขข้อมูลสำเร็จ",
    data: student,
  });
});

// =======================
// DELETE Student
// =======================

app.delete(
  "/api/v1/students/:id",
  authenticateToken,
  authorizeRole("admin"),
  async (req, res, next) => {
    try {
      const [result] = await pool.query("DELETE FROM students WHERE id = ?", [
        req.params.id,
      ]);

      if (result.affectedRows === 0) {
        return res.status(404).json({
          error: {
            code: "NOT_FOUND",
            message: "ไม่พบข้อมูลนิสิต",
          },
        });
      }

      res.status(200).json({
        message: "ลบข้อมูลสำเร็จ",
      });
    } catch (err) {
      next(err);
    }
  },
);

// =======================
// Implement Route ลงทะเบียนเรียนด้วย Transaction
// =======================
app.post("/api/v1/students/:id/enrollments", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const [courseRows] = await connection.query(
      "SELECT * FROM courses WHERE id = ? FOR UPDATE",
      [courseId],
    );

    if (courseRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: { code: "COURSE_NOT_FOUND", message: "ไม่พบรายวิชาที่ระบุ" },
      });
    }

    if (courseRows[0].seat_available <= 0) {
      await connection.rollback();
      return res.status(409).json({
        error: { code: "SEAT_FULL", message: "ที่นั่งเต็มแล้ว" },
      });
    }

    await connection.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId],
    );

    await connection.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId],
    );

    await connection.commit();
    res.status(201).json({ message: "ลงทะเบียนสำเร็จ" });
  } catch (err) {
    await connection.rollback();
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "ALREADY_ENROLLED",
          message: "นิสิตลงทะเบียนรายวิชานี้ไปแล้ว",
        },
      });
    }
    next(err);
  } finally {
    connection.release();
  }
});

// =======================
// GraphQL
// =======================

app.use(
  "/graphql",
  graphqlHTTP({
    schema,
    rootValue: root,
    graphiql: true,
  }),
);

// =======================
// เพิ่มเติมweek5 - GET Student Courses เพิ่ม Endpoint ดึงข้อมูลแบบ JOIN
// =======================

app.get("/api/v1/students/:id/courses", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT courses.*
       FROM courses
       JOIN enrollments
         ON courses.id = enrollments.course_id
       WHERE enrollments.student_id = ?`,
      [req.params.id],
    );

    res.status(200).json({
      message: "สำเร็จ",
      data: rows,
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// เพิ่มเติมweek5 - Unsafe Enrollment ทดสอบผลกระทบเมื่อ
// ไม่ใช้ Transaction
// =======================

app.post("/api/v1/students/:id/enrollments-unsafe", async (req, res, next) => {
  const studentId = req.params.id;
  const { courseId } = req.body;

  try {
    // INSERT ก่อน
    await pool.query(
      "INSERT INTO enrollments (student_id, course_id) VALUES (?, ?)",
      [studentId, courseId],
    );

    // UPDATE ทีหลัง
    await pool.query(
      "UPDATE courses SET seat_available = seat_available - 1 WHERE id = ?",
      [courseId],
    );

    res.status(201).json({
      message: "ลงทะเบียนสำเร็จ (Unsafe)",
    });
  } catch (err) {
    next(err);
  }
});

// =======================
// เพิ่มเติมweek5 - Cancel Enrollment เพิ่ม Endpoint สำหรับยกเลิกการลงทะเบียน
// ใช้ Transaction
// =======================

app.delete(
  "/api/v1/students/:id/enrollments/:courseId",
  async (req, res, next) => {
    const studentId = req.params.id;
    const courseId = req.params.courseId;

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // ตรวจสอบว่ามีการลงทะเบียนอยู่หรือไม่
      const [enrollmentRows] = await connection.query(
        `SELECT * FROM enrollments
         WHERE student_id = ? AND course_id = ?`,
        [studentId, courseId],
      );

      if (enrollmentRows.length === 0) {
        await connection.rollback();

        return res.status(404).json({
          error: {
            code: "ENROLLMENT_NOT_FOUND",
            message: "ไม่พบข้อมูลการลงทะเบียน",
          },
        });
      }

      // ลบข้อมูลการลงทะเบียน
      await connection.query(
        `DELETE FROM enrollments
         WHERE student_id = ? AND course_id = ?`,
        [studentId, courseId],
      );

      // เพิ่มจำนวนที่นั่งกลับ 1
      await connection.query(
        `UPDATE courses
         SET seat_available = seat_available + 1
         WHERE id = ?`,
        [courseId],
      );

      await connection.commit();

      res.status(200).json({
        message: "ยกเลิกการลงทะเบียนสำเร็จ",
      });
    } catch (err) {
      await connection.rollback();
      next(err);
    } finally {
      connection.release();
    }
  },
);

// =======================
// auth/register
// =======================

app.post("/api/v1/auth/register", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const passwordHash = await hashPassword(password);

    const [result] = await pool.query(
      "INSERT INTO users (email, password_hash, role) VALUES (?, ?, 'student')",
      [email, passwordHash],
    );

    res.status(201).json({
      message: "สมัครสมาชิกสำเร็จ",
      data: {
        id: result.insertId,
        email,
        role: "student",
      },
    });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        error: {
          code: "DUPLICATE_EMAIL",
          message: "อีเมลนี้มีอยู่ในระบบแล้ว",
        },
      });
    }

    next(err);
  }
});

// =======================
// auth/login
// =======================

app.use("/api/v1/auth/login", authLimiter);
app.post("/api/v1/auth/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "กรุณาระบุ email และ password",
      },
    });
  }

  try {
    const [rows] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (rows.length === 0) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const user = rows[0];

    const isPasswordValid = await verifyPassword(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({
        error: {
          code: "INVALID_CREDENTIALS",
          message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
        },
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      message: "เข้าสู่ระบบสำเร็จ",
      token,
    });
  } catch (err) {
    next(err);
  }
});

/// auth/login - เปลี่ยนรหัสผ่าน

app.patch(
  "/api/v1/auth/change-password",
  authenticateToken,
  async (req, res, next) => {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "กรุณาระบุ oldPassword และ newPassword",
        },
      });
    }

    try {
      const [rows] = await pool.query("SELECT * FROM users WHERE id = ?", [
        req.user.id,
      ]);

      if (rows.length === 0) {
        return res.status(404).json({
          error: {
            code: "USER_NOT_FOUND",
            message: "ไม่พบผู้ใช้งาน",
          },
        });
      }

      const user = rows[0];

      const isPasswordValid = await verifyPassword(
        oldPassword,
        user.password_hash,
      );

      if (!isPasswordValid) {
        return res.status(401).json({
          error: {
            code: "INVALID_PASSWORD",
            message: "รหัสผ่านเดิมไม่ถูกต้อง",
          },
        });
      }

      const newPasswordHash = await hashPassword(newPassword);

      await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
        newPasswordHash,
        req.user.id,
      ]);

      res.status(200).json({
        message: "เปลี่ยนรหัสผ่านสำเร็จ",
      });
    } catch (err) {
      next(err);
    }
  },
);

// =======================
// auth/me
// =======================

app.get("/api/v1/auth/me", authenticateToken, (req, res) => {
  res.status(200).json({ message: "สำเร็จ", data: req.user });
});

// =======================
// 404
// =======================

app.use((req, res) => {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "ไม่พบเส้นทางที่ร้องขอ",
    },
  });
});

// =======================
// Error Handler
// =======================

app.use((err, req, res, next) => {
  console.error(err.stack);

  const statusCode = err.status || err.statusCode || 500;

  res.status(statusCode).json({
    error: {
      code: statusCode === 500 ? "INTERNAL_SERVER_ERROR" : err.type || "ERROR",
      message:
        statusCode === 500
          ? "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ"
          : err.message,
    },
  });
});

module.exports = app;
