// Integration Tests for Pattern 1
const request = require("supertest");
const jwt = require("jsonwebtoken");
const app = require("../app");
const { pool } = require("../db");
const { jwtSecret } = require("../config");

describe("Pattern 1: Final Exam Simulation Suite", () => {
  const adminToken = jwt.sign({ id: 1, name: "Admin Manager", role: "admin" }, jwtSecret);
  const customerToken = jwt.sign({ id: 99, name: "Customer Somchai", role: "customer" }, jwtSecret);

  afterAll(async () => {
    await pool.end();
  });

  // ==========================================
  // โจทย์ที่ 1: Menu Items Query & Pagination
  // ==========================================
  describe("โจทย์ที่ 1: Menu API (Pagination, Filtering & Search)", () => {
    it("1.1 GET /api/v1/menus ควรตอบกลับ pagination ถูกต้อง (page=1, limit=5)", async () => {
      const res = await request(app).get("/api/v1/menus?page=1&limit=5");
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(20);
      expect(res.body.pagination.totalPages).toBe(Math.ceil(res.body.pagination.total / 5));
    });

    it("1.2 GET /api/v1/menus?available=false ควรกองเฉพาะเมนูที่ไม่พร้อมขาย", async () => {
      const res = await request(app).get("/api/v1/menus?available=false");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const item of res.body.data) {
        expect(Boolean(item.available)).toBe(false);
      }
    });

    it("1.3 GET /api/v1/menus?search=กุ้ง ควรค้นหาเมนูที่มีคำว่ากุ้ง", async () => {
      const res = await request(app).get("/api/v1/menus?search=กุ้ง");
      expect(res.statusCode).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
      for (const item of res.body.data) {
        expect(item.name).toContain("กุ้ง");
      }
    });

    it("1.4 GET /api/v1/menus/:id ควรคืน 404 เมื่อไม่พบเมนู", async () => {
      const res = await request(app).get("/api/v1/menus/99999");
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("MENU_NOT_FOUND");
    });
  });

  // ==========================================
  // โจทย์ที่ 2: JWT Authentication & Role
  // ==========================================
  describe("โจทย์ที่ 2: JWT Protection (Admin Only Menu Creation)", () => {
    it("2.1 POST /api/v1/menus ควรปฏิเสธ 401 เมื่อไม่แนบ Token", async () => {
      const res = await request(app)
        .post("/api/v1/menus")
        .send({ name: "ต้มข่าไก่", price: 80 });
      expect(res.statusCode).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHORIZED");
    });

    it("2.2 POST /api/v1/menus ควรปฏิเสธ 403 เมื่อผู้ใช้ไม่ใช่ Admin (Role Customer)", async () => {
      const res = await request(app)
        .post("/api/v1/menus")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ name: "ต้มข่าไก่", price: 80 });
      expect(res.statusCode).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("2.3 POST /api/v1/menus ควรคืน 400 เมื่อส่งข้อมูลไม่ครบถ้วน (ราคาติดลบ/ไม่มีชื่อ)", async () => {
      const res = await request(app)
        .post("/api/v1/menus")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "", price: -10 });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("2.4 POST /api/v1/menus ควรสร้างเมนูสำเร็จเมื่อเป็น Admin (201 Created)", async () => {
      const uniqueName = `เมนูทดสอบพิเศษ-${Date.now()}`;
      const res = await request(app)
        .post("/api/v1/menus")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: uniqueName, price: 95.5, available: true });
      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty("id");
      expect(res.body.data.name).toBe(uniqueName);
      expect(res.body.data.price).toBe(95.5);
    });
  });

  // ==========================================
  // โจทย์ที่ 3: Database Transaction
  // ==========================================
  describe("โจทย์ที่ 3: Food Ordering Transaction (Atomic & Safe)", () => {
    it("3.1 POST /api/v1/orders ควรคืน 400 เมื่อไม่ส่งรายการอาหาร", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({ items: [] });
      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });

    it("3.2 POST /api/v1/orders ควร ROLLBACK และคืน 400 เมื่อมีเมนูที่ available=false", async () => {
      // เมนู id=9 (ข้าวขาหมู) หรือ id=18 (น้ำแตงโม) มี available=false ใน seed.sql
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          items: [
            { menu_item_id: 1, quantity: 1 }, // มีขาย
            { menu_item_id: 9, quantity: 1 }, // ไม่มีขาย (available=false)
          ],
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.code).toBe("MENU_UNAVAILABLE");
    });

    it("3.3 POST /api/v1/orders ควร ROLLBACK และคืน 404 เมื่อเมนูไม่มีอยู่จริง", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          items: [{ menu_item_id: 99999, quantity: 1 }],
        });
      expect(res.statusCode).toBe(404);
      expect(res.body.error.code).toBe("MENU_NOT_FOUND");
    });

    it("3.4 POST /api/v1/orders ควรสร้างคำสั่งซื้อสำเร็จและ COMMIT ข้อมูลทั้ง orders และ order_items (201 Created)", async () => {
      const res = await request(app)
        .post("/api/v1/orders")
        .set("Authorization", `Bearer ${customerToken}`)
        .send({
          items: [
            { menu_item_id: 1, quantity: 2 }, // ข้าวผัดกุ้ง
            { menu_item_id: 2, quantity: 1 }, // ผัดกะเพราหมูสับ
          ],
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.data).toHaveProperty("orderId");
      expect(res.body.data.status).toBe("pending");
      expect(res.body.data.itemCount).toBe(2);

      // ตรวจสอบในฐานข้อมูลจริงว่าบันทึกครบถ้วน
      const [orderRows] = await pool.query("SELECT * FROM orders WHERE id = ?", [res.body.data.orderId]);
      expect(orderRows.length).toBe(1);

      const [itemRows] = await pool.query("SELECT * FROM order_items WHERE order_id = ?", [res.body.data.orderId]);
      expect(itemRows.length).toBe(2);
    });
  });
});

