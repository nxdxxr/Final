const request = require("supertest");
const app = require("../index");
const pool = require("../db");

describe("Fitness & Gym Management API Suite (Phase 3 Integration Tests)", () => {
  afterAll(async () => {
    // ปิด connection pool หลังการทดสอบทั้งหมดเสร็จสิ้น
    await pool.end();
  });

  describe("1. Root & Documentation Endpoints", () => {
    it("GET / ควรเปิดหน้า Frontend Web Application ได้สำเร็จ (200 OK)", async () => {
      const res = await request(app).get("/");
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("FitZone");
    });

    it("GET /api ควรตอบกลับ JSON ภาพรวมของระบบ (200 OK)", async () => {
      const res = await request(app).get("/api");
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("Fitness & Gym Management API");
    });

    it("GET /api-docs/ ควรเปิดหน้า Swagger UI ได้สำเร็จ (200 OK)", async () => {
      const res = await request(app).get("/api-docs/");
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("Swagger UI");
    });

    it("GET /openapi.yaml ควรส่งมอบไฟล์สเปก OpenAPI ได้สำเร็จ (200 OK)", async () => {
      const res = await request(app).get("/openapi.yaml");
      expect(res.statusCode).toBe(200);
      expect(res.text).toContain("openapi: 3.0.3");
    });
  });

  describe("2. Gyms API Endpoints", () => {
    it("GET /api/v1/gyms ควรดึงรายชื่อฟิตเนสทั้งหมดได้ (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms");
      expect(res.statusCode).toBe(200);
      expect(res.body.count).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0]).toHaveProperty("name");
      expect(res.body.data[0]).toHaveProperty("monthly_fee");
    });

    it("GET /api/v1/gyms?search=สยาม ควรกรองข้อมูลตามคำค้นหาได้ (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms?search=สยาม");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].name).toContain("สยาม");
    });

    it("GET /api/v1/gyms/:id ควรดึงข้อมูลฟิตเนสรายแห่งได้ถูกต้อง (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms/1");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    it("GET /api/v1/gyms/99999 ควรตอบกลับ 404 เมื่อไม่พบฟิตเนส", async () => {
      const res = await request(app).get("/api/v1/gyms/99999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("GYM_NOT_FOUND");
    });

    it("GET /api/v1/gyms/:id/classes ควรดึงคลาสของสาขาพร้อมชื่อเทรนเนอร์ (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms/1/classes");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      if (res.body.data.length > 0) {
        expect(res.body.data[0]).toHaveProperty("trainer_name");
      }
    });
  });

  describe("3. External API Resilience (Weather)", () => {
    it("GET /api/v1/gyms/1/weather ควรดึงข้อมูลสภาพอากาศพร้อม Resilience metadata (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms/1/weather");
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty("temperatureCelsius");
      expect(res.body.resilience).toHaveProperty("attemptsUsed");
      expect(res.body.resilience).toHaveProperty("isFallback");
    });

    it("GET /api/v1/gyms/1/weather?simulate=network ควรลองซ้ำและส่ง Fallback เมื่อเน็ตเวิร์กล่ม (200 OK)", async () => {
      const res = await request(app).get("/api/v1/gyms/1/weather?simulate=network");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.isFallback).toBe(true);
      expect(res.body.resilience.attemptsUsed).toBe(3); // 1 call + 2 retries
    });
  });

  describe("4. Classes & Booking API", () => {
    it("GET /api/v1/classes ควรดึงรายการคลาสออกกำลังกายทั้งหมด (200 OK)", async () => {
      const res = await request(app).get("/api/v1/classes");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/v1/classes/:id/bookings ควรตอบกลับ 400 เมื่อไม่มี memberId", async () => {
      const res = await request(app).post("/api/v1/classes/1/bookings").send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/v1/classes/99999/bookings ควรตอบกลับ 404 เมื่อคลาสไม่มีอยู่จริง", async () => {
      const res = await request(app)
        .post("/api/v1/classes/99999/bookings")
        .send({ memberId: 1 });
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("CLASS_NOT_FOUND");
    });

    it("POST /api/v1/classes/:id/bookings ควรจองคลาสสำเร็จ (201 Created)", async () => {
      // สร้างสมาชิกใหม่ชั่วคราวเพื่อทำการจอง
      const tempEmail = `booker-${Date.now()}@fitzone.com`;
      const memberRes = await request(app).post("/api/v1/members").send({
        name: "ผู้จองคลาส ทดสอบ",
        email: tempEmail,
        phone: "089-111-2222",
        gymId: 1,
      });
      const newMemberId = memberRes.body.data.id;

      const res = await request(app)
        .post("/api/v1/classes/1/bookings")
        .send({ memberId: newMemberId });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain("จองคลาสออกกำลังกายสำเร็จ");
      expect(res.body).toHaveProperty("bookingId");
    });
  });

  describe("5. Members API", () => {
    it("GET /api/v1/members ควรดึงรายชื่อสมาชิกทั้งหมด (200 OK)", async () => {
      const res = await request(app).get("/api/v1/members");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it("POST /api/v1/members ควรตอบกลับ 400 เมื่อข้อมูลไม่ครบถ้วน", async () => {
      const res = await request(app).post("/api/v1/members").send({ name: "ทดสอบ" });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("POST /api/v1/members ควรตอบกลับ 404 เมื่อ gymId ไม่มีอยู่จริง", async () => {
      const res = await request(app).post("/api/v1/members").send({
        name: "นายทดสอบ สมมุติ",
        email: `test-${Date.now()}@example.com`,
        phone: "089-999-0000",
        gymId: 99999,
      });
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("GYM_NOT_FOUND");
    });
    it("POST /api/v1/members ควรลงทะเบียนสมาชิกใหม่สำเร็จ (201 Created)", async () => {
      const uniqueEmail = `test-user-${Date.now()}@fitzone.com`;
      const res = await request(app).post("/api/v1/members").send({
        name: "สมเกียรติ มั่นคง",
        email: uniqueEmail,
        phone: "081-234-5678",
        gymId: 1,
      });
      expect(res.statusCode).toBe(201);
      expect(res.body.message).toContain("สมัครสมาชิกสำเร็จ");
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.email).toBe(uniqueEmail);
    });
  });

  describe("6. My Bookings & Cancellation API", () => {
    it("GET /api/v1/members/:id/bookings ควรดึงรายการคลาสที่สมาชิกจองไว้ (200 OK)", async () => {
      const res = await request(app).get("/api/v1/members/1/bookings");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body).toHaveProperty("member");
    });

    it("GET /api/v1/members/99999/bookings ควรตอบกลับ 404 เมื่อไม่พบสมาชิก", async () => {
      const res = await request(app).get("/api/v1/members/99999/bookings");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("MEMBER_NOT_FOUND");
    });

    it("DELETE /api/v1/bookings/99999 ควรตอบกลับ 404 เมื่อไม่พบการจอง", async () => {
      const res = await request(app).delete("/api/v1/bookings/99999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("BOOKING_NOT_FOUND");
    });

    it("DELETE /api/v1/bookings/:id ควรยกเลิกการจองและคืนที่นั่งว่างสำเร็จ (200 OK)", async () => {
      // 1. สร้างสมาชิกชั่วคราวและจองคลาส
      const tempEmail = `cancel-test-${Date.now()}@fitzone.com`;
      const memberRes = await request(app).post("/api/v1/members").send({
        name: "ผู้ทดสอบ ยกเลิก",
        email: tempEmail,
        phone: "089-777-8888",
        gymId: 1,
      });
      const memberId = memberRes.body.data.id;

      const bookRes = await request(app)
        .post("/api/v1/classes/2/bookings")
        .send({ memberId });
      const bookingId = bookRes.body.bookingId;

      // 2. ขอยกเลิกการจอง
      const delRes = await request(app).delete(`/api/v1/bookings/${bookingId}`);
      expect(delRes.statusCode).toBe(200);
      expect(delRes.body.message).toContain("ยกเลิกการจองคลาสออกกำลังกายสำเร็จ");
      expect(delRes.body.cancelledBookingId).toBe(bookingId);
    });
  });

  describe("7. 404 Route Handler", () => {
    it("GET /api/v1/non-existent-route ควรตอบกลับ 404 ROUTE_NOT_FOUND", async () => {
      const res = await request(app).get("/api/v1/non-existent-route");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("ROUTE_NOT_FOUND");
    });
  });
});
