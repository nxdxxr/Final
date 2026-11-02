// Integration Tests for Pattern 2 (Debugging & Verification)
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { pool } = require("../db");
const { jwtSecret } = require("../config");

describe("Pattern 2: Debugging & Test-Driven Verification Suite", () => {
  const validToken = jwt.sign({ id: 50, name: "Test User", role: "customer" }, jwtSecret, { expiresIn: "1h" });
  const expiredToken = jwt.sign({ id: 50, name: "Test User", role: "customer" }, jwtSecret, { expiresIn: "-1s" });
  const wrongSecretToken = jwt.sign({ id: 50, name: "Hacker" }, "wrong-secret-key");

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // โจทย์ 1 Test: Pagination Edge Cases & Math Bug Check
  // ==========================================
  describe("โจทย์ที่ 1: ตรวจสอบความถูกต้องของ Pagination & Query Edge Cases", () => {
    it("1.1 คำนวณ totalPages ถูกต้องแบบปัดเศษขึ้น (Math.ceil) เสมอ", async () => {
      const res = await request(app).get("/api/v1/menus?limit=4");
      expect(res.statusCode).toBe(200);
      const total = res.body.pagination.total;
      const expectedTotalPages = Math.ceil(total / 4);
      expect(res.body.pagination.totalPages).toBe(expectedTotalPages);
    });

    it("1.2 เมื่อขอหน้าที่เกินจำนวนจริง (page=999) ต้องได้ data เป็น array ว่าง ไม่พัง (200 OK)", async () => {
      const res = await request(app).get("/api/v1/menus?page=999&limit=10");
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination.page).toBe(999);
    });

    it("1.3 เมื่อส่ง parameter ที่ผิดประเภท (page=-5, limit=abc) ต้อง fallback สู่ค่าเริ่มต้นที่ปลอดภัย", async () => {
      const res = await request(app).get("/api/v1/menus?page=-5&limit=abc");
      expect(res.statusCode).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });
  });

  // ==========================================
  // โจทย์ 2 Test: Auth Middleware Robustness
  // ==========================================
  describe("โจทย์ที่ 2: ตรวจสอบความแข็งแกร่งของ Auth Middleware ต่อรูปแบบ Token ต่าง ๆ", () => {
    it("2.1 คืน 401 เมื่อส่ง Header มั่ว (ไม่มีคำว่า Bearer)", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", "Basic 123456")
        .send({ items: [{ menu_item_id: 1, quantity: 1 }] });
      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("2.2 คืน 403 เมื่อ Token หมดอายุ (TokenExpiredError)", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${expiredToken}`)
        .send({ items: [{ menu_item_id: 1, quantity: 1 }] });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
      expect(res.body.error.message).toContain("หมดอายุ");
    });

    it("2.3 คืน 403 เมื่อ Token ลงนามด้วย Secret ที่ไม่ตรงกัน (Signature Error)", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${wrongSecretToken}`)
        .send({ items: [{ menu_item_id: 1, quantity: 1 }] });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  // ==========================================
  // โจทย์ 3 Test: Transaction Data Integrity & Rollback Leak Check
  // ==========================================
  describe("โจทย์ที่ 3: ตรวจสอบความบริสุทธิ์ของ Transaction เมื่อเกิด Rollback", () => {
    it("3.1 เมื่อสั่งเมนูที่ available=false ต้องไม่มีแถวใดถูกบันทึกลงตาราง orders หรือ order_items (Zero Dirty Reads)", async () => {
      // 1. นับจำนวน orders ปัจจุบันก่อนสั่ง
      const [beforeOrders] = await pool.query("SELECT COUNT(*) AS count FROM orders");
      const [beforeItems] = await pool.query("SELECT COUNT(*) AS count FROM order_items");
      const orderCountBefore = beforeOrders[0].count;
      const itemCountBefore = beforeItems[0].count;

      // 2. ส่ง Request ที่มีเมนู available=false (id=9 ข้าวขาหมู)
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          items: [
            { menu_item_id: 1, quantity: 2 },
            { menu_item_id: 9, quantity: 1 }, // เมนูนี้ปิดให้บริการ
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("MENU_UNAVAILABLE");

      // 3. ตรวจสอบว่าจำนวนแถวในฐานข้อมูลต้องไม่เพิ่มขึ้นแม้แต่แถวเดียว!
      const [afterOrders] = await pool.query("SELECT COUNT(*) AS count FROM orders");
      const [afterItems] = await pool.query("SELECT COUNT(*) AS count FROM order_items");
      expect(afterOrders[0].count).toBe(orderCountBefore);
      expect(afterItems[0].count).toBe(itemCountBefore);
    });

    it("3.2 ทำงานหลาย Transaction พร้อมกันได้โดย Connection ไม่ค้าง (No Pool Leak)", async () => {
      // ยิงพร้อมกัน 5 Requests
      const promises = Array.from({ length: 5 }).map(() =>
        request(app)
          .post("/api/v1/orders")
          .set("Authorization", `Bearer ${validToken}`)
          .send({ items: [{ menu_item_id: 1, quantity: 1 }] })
      );

      const results = await Promise.all(promises);
      for (const r of results) {
        expect(r.statusCode).toBe(201);
      }
    });
  });
});

