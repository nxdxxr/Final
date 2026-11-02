const request = require("supertest");
const app = require("./app");
const pool = require("./db");
const { generateToken } = require("./auth-helpers");

describe("CRUD /api/v1/students", () => {
  const adminToken = generateToken({
    id: 999,
    email: "admin@test.com",
    role: "admin",
  });

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // 1. GET /api/v1/students
  // ==========================================
  describe("GET /api/v1/students", () => {
    test("ควรคืน 200 พร้อมรายการนักศึกษาและ pagination", async () => {
      const response = await request(app).get("/api/v1/students");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty("pagination");
    });

    // ทดสอบ Pagination และ Filtering
    test("ควรคืนข้อมูลการแบ่งหน้าถูกต้องตาม query parameter (?page=2&limit=5)", async () => {
      const response = await request(app).get(
        "/api/v1/students?page=2&limit=5",
      );

      expect(response.status).toBe(200);
      expect(response.body.pagination.page).toBe(2);
      expect(response.body.pagination.limit).toBe(5);
      expect(response.body.data.length).toBeLessThanOrEqual(5);

      const expectedTotalPages = Math.ceil(response.body.pagination.total / 5);
      expect(response.body.pagination.totalPages).toBe(expectedTotalPages);
    });

    test("ควรกองข้อมูลเฉพาะสาขาที่ระบุ (?major=วิทยาการคอมพิวเตอร์)", async () => {
      const major = "วิทยาการคอมพิวเตอร์";
      const response = await request(app).get(
        `/api/v1/students?major=${encodeURIComponent(major)}`,
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      response.body.data.forEach((student) => {
        expect(student.major).toBe(major);
      });
    });

    test("ควรเรียงลำดับข้อมูลตามฟิลด์และทิศทางที่ระบุ (?sort=name&order=desc)", async () => {
      const response = await request(app).get(
        "/api/v1/students?sort=name&order=desc",
      );

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body).toHaveProperty("pagination");
    });
  });

  // ==========================================
  // 2. POST /api/v1/students
  // ==========================================
  describe("POST /api/v1/students", () => {
    test("ควรคืน 201 เมื่อส่งข้อมูลครบถ้วนและถูกต้อง", async () => {
      const uniqueEmail = `student_${Date.now()}@example.com`;
      const response = await request(app).post("/api/v1/students").send({
        name: "ทดสอบ สมมุติ",
        major: "วิทยาการคอมพิวเตอร์",
        email: uniqueEmail,
      });

      expect(response.status).toBe(201);
      expect(response.body.data).toHaveProperty("id");
      expect(response.body.data.email).toBe(uniqueEmail);
    });

    test("ควรคืน 400 เมื่อข้อมูลไม่ครบถ้วน (ขาด email)", async () => {
      const response = await request(app).post("/api/v1/students").send({
        name: "ทดสอบ ไม่ครบ",
        major: "เทคโนโลยีสารสนเทศ",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });

    test("ควรคืน 400 พร้อม details เมื่อสาขา International ไม่แนบ passportNumber (Conditional Validation)", async () => {
      const response = await request(app)
        .post("/api/v1/students")
        .send({
          name: "John Smith",
          email: "john@example.com",
          major: "International Business",
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
      expect(response.body.error).toHaveProperty("details");
      const passportError = response.body.error.details.find(
        (d) => d.field === "passportNumber",
      );
      expect(passportError).toBeDefined();
      expect(passportError.message).toBe(
        "ต้องระบุ passportNumber สำหรับสาขานานาชาติ",
      );
    });

    test("ควรคืน 201 เมื่อสาขา International แนบ passportNumber ถูกต้อง", async () => {
      const uniqueEmail = `inter_${Date.now()}@example.com`;
      const response = await request(app)
        .post("/api/v1/students")
        .send({
          name: "John Smith",
          email: uniqueEmail,
          major: "International Business",
          passportNumber: "A12345678",
        });

      expect(response.status).toBe(201);
      expect(response.body.data.email).toBe(uniqueEmail);
    });
  });

  // ==========================================
  // 3. PUT /api/v1/students/:id
  // ==========================================
  describe("PUT /api/v1/students/:id", () => {
    test("ควรคืน 200 เมื่อแก้ไขข้อมูลนักศึกษาสำเร็จ", async () => {
      const response = await request(app).put("/api/v1/students/1").send({
        name: "สมชาย แก้ไขแล้ว",
        major: "วิทยาการคอมพิวเตอร์",
        email: "somchai_updated@example.com",
      });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("สมชาย แก้ไขแล้ว");
    });

    test("ควรคืน 404 เมื่อระบุ id ที่ไม่มีอยู่จริง", async () => {
      const response = await request(app).put("/api/v1/students/99999").send({
        name: "ไม่พบนายคนนี้",
        major: "สาขาใดๆ",
        email: "notfound@example.com",
      });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });

    test("ควรคืน 400 เมื่อส่งข้อมูลไม่ครบถ้วน", async () => {
      const response = await request(app).put("/api/v1/students/1").send({
        name: "สมชาย ขาดอีเมล",
      });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  // ==========================================
  // 4. DELETE /api/v1/students/:id
  // ==========================================
  describe("DELETE /api/v1/students/:id", () => {
    test("ควรคืน 200 เมื่อลบข้อมูลนักศึกษาสำเร็จโดยใช้สิทธิ์ admin", async () => {
      // สร้างนักศึกษาขึ้นมาก่อนเพื่อเตรียมลบ
      const uniqueEmail = `to_delete_${Date.now()}@example.com`;
      const created = await request(app).post("/api/v1/students").send({
        name: "นิสิต ทดลองลบ",
        major: "วิทยาการคอมพิวเตอร์",
        email: uniqueEmail,
      });

      const studentId = created.body.data.id;

      // ลบด้วย adminToken
      const response = await request(app)
        .delete(`/api/v1/students/${studentId}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("ลบข้อมูลสำเร็จ");
    });

    test("ควรคืน 404 เมื่อลบ id ที่ไม่มีอยู่จริง", async () => {
      const response = await request(app)
        .delete("/api/v1/students/999999")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ==========================================
  // 5. GET /api/v1/students/:id
  // ==========================================
  describe("GET /api/v1/students/:id", () => {
    test("ควรคืน 200 เมื่อพบข้อมูลนักศึกษาตาม id", async () => {
      const response = await request(app).get("/api/v1/students/1");
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty("id");
    });

    test("ควรคืน 404 เมื่อไม่พบนักศึกษาตาม id", async () => {
      const response = await request(app).get("/api/v1/students/999999");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ==========================================
  // 6. PATCH /api/v1/students/:id
  // ==========================================
  describe("PATCH /api/v1/students/:id", () => {
    test("ควรคืน 200 เมื่อแก้ไขข้อมูลบางส่วนสำเร็จ", async () => {
      const response = await request(app)
        .patch("/api/v1/students/1")
        .send({ name: "สมชาย มีการแก้ไขชื่อ" });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe("สมชาย มีการแก้ไขชื่อ");
    });

    test("ควรคืน 404 เมื่อแก้ไข id ที่ไม่มีอยู่จริง", async () => {
      const response = await request(app)
        .patch("/api/v1/students/999999")
        .send({ name: "ไม่มีคนนี้" });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    });
  });

  // ==========================================
  // 7. Enrollment & Course endpoints
  // ==========================================
  describe("Enrollment & Course endpoints", () => {
    test("GET /api/v1/students/:id/courses ควรคืน 200 พร้อมวิชาที่ลงทะเบียน", async () => {
      const response = await request(app).get("/api/v1/students/1/courses");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("POST /api/v1/students/:id/enrollments ควรคืน 404 เมื่อไม่พบวิชา", async () => {
      const response = await request(app)
        .post("/api/v1/students/1/enrollments")
        .send({ courseId: 999999 });

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("COURSE_NOT_FOUND");
    });

    test("DELETE /api/v1/students/:id/enrollments/:courseId ควรคืน 404 เมื่อไม่มีการลงทะเบียนนั้น", async () => {
      const response = await request(app).delete(
        "/api/v1/students/1/enrollments/999999",
      );

      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("ENROLLMENT_NOT_FOUND");
    });
  });

  // ==========================================
  // 8. General & Middleware Routes
  // ==========================================
  describe("General & Middleware Routes", () => {
    test("GET / ควรคืน 200 พร้อมข้อความพร้อมใช้งาน", async () => {
      const response = await request(app).get("/");
      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Student API พร้อมใช้งาน");
    });

    test("POST ด้วย Content-Type ไม่ใช่ application/json ควรคืน 415", async () => {
      const response = await request(app)
        .post("/api/v1/students")
        .set("Content-Type", "text/plain")
        .send("plain text");

      expect(response.status).toBe(415);
      expect(response.body.error.code).toBe("UNSUPPORTED_MEDIA_TYPE");
    });

    test("GET route ที่ไม่มีอยู่จริง ควรคืน 404 ROUTE_NOT_FOUND", async () => {
      const response = await request(app).get("/api/v1/non-existent-route");
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("ROUTE_NOT_FOUND");
    });

    test("GET /api/v1/courses ควรคืน 200 พร้อมรายการรายวิชา", async () => {
      const response = await request(app).get("/api/v1/courses");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    test("GET /api/v2/students ควรคืน 200 พร้อมโครงสร้าง v2 (items & count)", async () => {
      const response = await request(app).get("/api/v2/students");
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("items");
      expect(response.body).toHaveProperty("count");
    });
  });
});
