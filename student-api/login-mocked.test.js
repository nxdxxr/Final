jest.mock("./db");
const pool = require("./db");
const request = require("supertest");
const app = require("./app");
const { hashPassword } = require("./auth-helpers");

describe("POST /api/v1/auth/login (mocked database)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("ควรคืน token เมื่อ email และ password ถูกต้อง", async () => {
    const hashedPassword = await hashPassword("Passw0rd!");

    pool.query.mockResolvedValueOnce([
      [
        {
          id: 1,
          email: "mocked@example.com",
          password_hash: hashedPassword,
          role: "student",
        },
      ],
    ]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "mocked@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("token");
  });

  test("ควรคืน 401 เมื่อไม่พบผู้ใช้ในระบบ", async () => {
    pool.query.mockResolvedValueOnce([[]]);

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "notfound@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("INVALID_CREDENTIALS");
  });

  // แบบฝึกหัดที่ 3: Mock External Failure ด้วย mockRejectedValueOnce
  test("ควรคืน 500 พร้อมรูปแบบ error message มาตรฐานเมื่อฐานข้อมูลเกิดข้อผิดพลาด (Connection timeout)", async () => {
    pool.query.mockRejectedValueOnce(new Error("Connection timeout"));

    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "any@example.com", password: "Passw0rd!" });

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(response.body.error.message).toBe(
      "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ",
    );
  });
});

describe("GET /api/v1/students (mocked external failure)", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("ควรคืน 500 พร้อมรูปแบบ error message มาตรฐานเมื่อ pool.query ล้มเหลว", async () => {
    pool.query.mockRejectedValueOnce(new Error("ETIMEDOUT: Connection lost"));

    const response = await request(app).get("/api/v1/students");

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error.code).toBe("INTERNAL_SERVER_ERROR");
    expect(response.body.error.message).toBe(
      "เกิดข้อผิดพลาดที่ไม่คาดคิดภายในระบบ",
    );
  });
});

