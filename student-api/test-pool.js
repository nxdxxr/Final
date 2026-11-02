require("dotenv").config();

const pool = require("./db");

async function testPool() {
  const start = Date.now();

  try {
    const requests = Array.from({ length: 20 }, (_, i) => {
      return pool.query("SELECT SLEEP(1) AS delay, ? AS request_id", [i + 1]);
    });

    const results = await Promise.all(requests);

    const elapsed = Date.now() - start;

    console.log("จำนวนคำขอ:", results.length);
    console.log("ทุก Query ทำงานสำเร็จ");
    console.log("เวลาที่ใช้:", elapsed, "ms");
  } catch (err) {
    console.error("เกิดข้อผิดพลาด:", err);
  } finally {
    await pool.end();
  }
}

testPool();
