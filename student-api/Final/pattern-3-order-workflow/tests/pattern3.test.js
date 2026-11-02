// Integration Tests for Pattern 3 (Order Workflow Suite)
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { pool } = require("../db");
const { jwtSecret } = require("../config");

describe("Pattern 3: Order Workflow & Lifecycle Test Suite", () => {
  const adminToken = jwt.sign({ id: 1, name: "Admin", role: "admin" }, jwtSecret);
  const customerToken = jwt.sign({ id: 10, name: "Customer", role: "customer" }, jwtSecret);

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // โจทย์ที่ 1: Complex JOIN Order Details
  // ==========================================
  describe("โจทย์ที่ 1: GET /api/v1/orders/:id (JOIN Query & Total Amount)", () => {
    it("1.1 แสดงข้อมูลคำสั่งซื้อ พร้อมคำนวณ total_amount และแจกแจงรายการอาหารถูกต้อง (200 OK)", async () => {
      // Order id=1 ใน seed.sql: มี ข้าวผัดกุ้ง (60*2) + ชาเย็น (25*2) = 170
      const res = await request(app).get("/api/v1/orders/1");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.order_id).toBe(1);
      expect(res.body.data.customer_name).toBe("สมชาย");
      expect(Array.isArray(res.body.data.items)).toBe(true);
      expect(res.body.data.items.length).toBe(2);
      expect(res.body.data.total_amount).toBe(170);
    });

    it("1.2 คืน 404 เมื่อไม่พบคำสั่งซื้อ", async () => {
      const res = await request(app).get("/api/v1/orders/99999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("ORDER_NOT_FOUND");
    });
  });

  // ==========================================
  // โจทย์ที่ 2: Order Status State Machine
  // ==========================================
  describe("โจทย์ที่ 2: PATCH /api/v1/orders/:id/status (Workflow & Protection)", () => {
    it("2.1 ปฏิเสธ 401 เมื่อไม่ระบุ Token", async () => {
      const res = await request(app)
        .patch("/api/v1/orders/2/status")
        .send({ status: "delivered" });
      expect(res.statusCode).toBe(401);
    });

    it("2.2 ปฏิเสธ 403 เมื่อผู้ใช้ไม่ใช่ Admin หรือ Staff", async () => {
      const res = await request(app)
        .patch("/api/v1/orders/2/status")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ status: "delivered" });
      expect(res.statusCode).toBe(403);
    });

    it("2.3 ปฏิเสธ 400 เมื่อพยายามเปลี่ยนสถานะของออเดอร์ที่ delivered ไปแล้ว (Invalid Transition)", async () => {
      // Order id=1 มีสถานะ 'delivered' อยู่แล้วใน seed.sql
      const res = await request(app)
        .patch("/api/v1/orders/1/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "pending" });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("INVALID_STATE_TRANSITION");
    });

    it("2.4 อัปเดตสถานะสำเร็จเมื่อมีสิทธิ์และผ่านกฎ Transition (200 OK)", async () => {
      // Order id=2 มีสถานะ 'preparing' -> เปลี่ยนเป็น 'delivered'
      const res = await request(app)
        .patch("/api/v1/orders/2/status")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ status: "delivered" });
      expect(res.statusCode).toBe(200);
      expect(res.body.data.current_status).toBe("delivered");
    });
  });

  // ==========================================
  // โจทย์ที่ 3: Order Cancellation Transaction
  // ==========================================
  describe("โจทย์ที่ 3: DELETE /api/v1/orders/:id (Cancellation Transaction)", () => {
    it("3.1 ปฏิเสธ 400 เมื่อพยายามยกเลิกออเดอร์ที่สถานะไม่ใช่ 'pending'", async () => {
      // Order id=1 สถานะ 'delivered'
      const res = await request(app)
        .delete("/api/v1/orders/1")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("CANNOT_CANCEL_ORDER");
    });

    it("3.2 ยกเลิกออเดอร์สำเร็จเมื่อสถานะเป็น 'pending' พร้อมลบข้อมูลทั้ง 2 ตาราง (200 OK)", async () => {
      // Order id=3 มีสถานะ 'pending' อยู่ใน seed.sql
      const res = await request(app)
        .delete("/api/v1/orders/3")
        .set("Authorization", `Bearer ${customerToken}`);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.cancelled_order_id).toBe(3);

      // ยืนยันว่าข้อมูลหายไปจากฐานข้อมูลจริง
      const [orderRows] = await pool.query("SELECT * FROM orders WHERE id = 3");
      expect(orderRows.length).toBe(0);

      const [itemRows] = await pool.query("SELECT * FROM order_items WHERE order_id = 3");
      expect(itemRows.length).toBe(0);
    });
  });
});

