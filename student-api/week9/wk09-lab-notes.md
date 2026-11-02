ไฟล์ที่ต้องมีใน student-api/ ก่อนเริ่มทำ wk09-lab มีดังนี้:

> ไฟล์ที่ทำมาก่อนจากแล็บก่อนหน้านี้

- index.js — จะถูกแยกเป็น app.js + server.js ในขั้นตอนที่ 2.2
- auth-helpers.js — มี hashPassword, verifyPassword, generateToken ตรงกับที่ test เรียกใช้
- middlewares/auth.js — มี authenticateToken
- db.js — export pool เดี่ยว mock ได้ด้วย jest.mock("./db")
- cache.js — มี connectRedis (ต้องย้ายไป server.js ตามที่แก้ไปแล้ว)
- .env — ต้องมี JWT_SECRET, JWT_EXPIRES_IN ใช้งานได้จริง
- routes/ (auth, students, ฯลฯ) — endpoint ที่ integration test เรียก เช่น /api/v1/auth/register

> ยังไม่มี ต้องสร้างระหว่างทำแล็บ

- app.js, server.js (แยกจาก index.js)
- auth-helpers.test.js
- auth.test.js
- login-mocked.test.js
- jest.config.js / jest.setup.js (ถ้า JWT_SECRET เป็น undefined ใน test)
- devDependencies jest, supertest (ติดตั้งด้วย npm install --save-dev jest supertest)
- package.json ต้องเพิ่ม script "test": "jest" และ "test:coverage": "jest --coverage"

## แบบฝึกหัดที่ 5: เปรียบเทียบเวลารันระหว่าง test ที่ mock กับ test ที่ต่อฐานข้อมูลจริง

รันด้วย `npx jest --verbose <ไฟล์>` แยกทีละไฟล์ แล้วดูเวลาต่อ request จาก log ของ morgan (ไม่ใช่เวลารวมของ jest เพราะเวลารวมมี overhead เริ่มต้นของ jest เองราว 1 วินาทีปนอยู่ ทำให้เทียบกันตรง ๆ ไม่ได้)

| Route                     | auth.test.js (ต่อ MySQL จริง) | login-mocked.test.js (mock `./db`) |
| -------------------------- | ------------------------------ | ----------------------------------- |
| POST /api/v1/auth/register | ~88 ms                          | -                                    |
| POST /api/v1/auth/login    | ~62 ms                          | ~8 ms                                |

**เหตุผล**: test ที่ต่อฐานข้อมูลจริงต้องเปิด connection จาก pool, ส่ง query ผ่านเครือข่าย (แม้เป็น localhost ก็ยังมี round-trip ของ TCP/protocol overhead) และรอ MySQL ประมวลผลจริง ส่วน `login-mocked.test.js` ใช้ `jest.mock("./db")` แทนที่ `pool.query` ด้วยฟังก์ชันจำลองที่คืนค่าในหน่วยความจำทันที ไม่มีการเชื่อมต่อเครือข่ายหรือ I/O ใด ๆ เวลาที่ใช้จึงเหลือแค่เวลาประมวลผล JavaScript ล้วน (การ hash/verify password ด้วย bcrypt ยังคงทำงานจริงทั้งสองฝั่ง จึงไม่ใช่ตัวแปรที่ทำให้ต่างกัน) สอดคล้องกับหลักการในหัวข้อ 4.4 ของ `wk09.md` ที่ระบุว่า mock ช่วยให้ test เร็วขึ้นและเสถียรขึ้นเพราะตัดการพึ่งพาระบบภายนอกออกไป
