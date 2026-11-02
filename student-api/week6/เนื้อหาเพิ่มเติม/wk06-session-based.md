# เอกสารเสริมสัปดาห์ที่ 6: Session-based Authentication

> เอกสารนี้เป็นเนื้อหาเสริมของหัวข้อ 1.2 ใน `wk06.md` เพื่อขยายความแนวทาง Session-based Authentication ที่ถูกกล่าวถึงเพียงสั้น ๆ ในตารางเปรียบเทียบ **รายวิชานี้ไม่ได้ implement Session-based Authentication ในแล็บหรือโปรเจกต์ใด ๆ** (ใช้ JWT ตลอดทั้งวิชาตามเหตุผลในหัวข้อ 1.2 ของ `wk06.md`) เนื้อหานี้จึงมีไว้เพื่อให้นิสิตเข้าใจแนวทางที่พบได้บ่อยในระบบอื่น และสามารถเปรียบเทียบข้อดีข้อเสียกับ JWT ได้อย่างมีหลักการ ไม่อยู่ในขอบเขตการประเมินผลของแล็บหรือข้อสอบ

---

## 1. หลักการทำงานของ Session-based Authentication

### 1.1 วงจรชีวิตของ Session

![วงจรชีวิตของ Session-based Authentication](wk06/session-based.png)

```
1. ผู้ใช้ส่ง email/password มาที่ POST /login
                    │
                    ▼
2. เซิร์ฟเวอร์ตรวจสอบข้อมูลกับฐานข้อมูล (เช่นเดียวกับ JWT ในหัวข้อ 3.3 ของ wk06.md)
                    │
                    ▼
3. หากถูกต้อง เซิร์ฟเวอร์สร้าง session ใหม่ เก็บข้อมูลผู้ใช้ไว้ฝั่งเซิร์ฟเวอร์
   (เช่น ในหน่วยความจำ, Redis, หรือฐานข้อมูล) พร้อมกำหนด session ID สุ่มไม่ซ้ำ
                    │
                    ▼
4. เซิร์ฟเวอร์ส่ง session ID กลับให้ client ผ่าน HTTP Header
   Set-Cookie: connect.sid=<session-id>; HttpOnly; Secure
                    │
                    ▼
5. Browser เก็บ cookie นี้ไว้อัตโนมัติ และแนบ cookie เดิมกลับมา
   ทุกคำขอถัดไปในโดเมนเดียวกันโดยอัตโนมัติ (ไม่ต้องเขียนโค้ดฝั่ง client เพิ่ม)
                    │
                    ▼
6. เซิร์ฟเวอร์อ่าน session ID จาก cookie แล้วค้นหาข้อมูล session ที่เก็บไว้
   หากพบและยังไม่หมดอายุ อนุญาตให้เข้าถึง resource
```

ข้อแตกต่างสำคัญจาก JWT (หัวข้อ 2.2 ของ `wk06.md`) คือขั้นตอนที่ 3 และ 6: เซิร์ฟเวอร์ **ต้องเก็บสถานะ (state)** ของผู้ใช้ที่ login แล้วไว้เอง และ **ต้องค้นหาข้อมูลนี้ทุกคำขอ** ต่างจาก JWT ที่ข้อมูลทั้งหมดฝังอยู่ใน token จึงไม่ต้องพึ่งพาสถานะฝั่งเซิร์ฟเวอร์

### 1.2 การ Implement ด้วย `express-session`

ตัวอย่างต่อไปนี้แสดงเพื่อการเปรียบเทียบเท่านั้น ไม่ใช่ส่วนหนึ่งของโปรเจกต์ `student-api`

```bash
npm install express-session
```

```javascript
const session = require("express-session");

app.use(
  session({
    secret: process.env.SESSION_SECRET, // ใช้เซ็นและป้องกันการปลอมแปลง session ID ใน cookie
    resave: false, // ไม่บันทึก session ซ้ำหากไม่มีการเปลี่ยนแปลงข้อมูล
    saveUninitialized: false, // ไม่สร้าง session ให้ผู้ใช้ที่ยังไม่ login
    cookie: {
      httpOnly: true, // ป้องกัน JavaScript ฝั่ง client อ่าน cookie นี้ได้ (ลดความเสี่ยง XSS)
      secure: process.env.NODE_ENV === "production", // ส่ง cookie ผ่าน HTTPS เท่านั้นเมื่อขึ้น production
      maxAge: 1000 * 60 * 60, // อายุ session 1 ชั่วโมง
    },
  }),
);

app.post("/login", async (req, res, next) => {
  const { email, password } = req.body;
  // ... ตรวจสอบ email/password เช่นเดียวกับหัวข้อ 3.3 ของ wk06.md ...

  req.session.userId = user.id;
  req.session.role = user.role;
  res.status(200).json({ message: "เข้าสู่ระบบสำเร็จ" });
});

function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({
      error: { code: "NO_SESSION", message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" },
    });
  }
  next();
}

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({ message: "ออกจากระบบสำเร็จ" });
  });
});
```

ค่าเริ่มต้นของ `express-session` เก็บ session ไว้ใน**หน่วยความจำของโปรเซส (`MemoryStore`)** ซึ่งเอกสารประกอบไลบรารีระบุชัดเจนว่า**ไม่เหมาะสำหรับ production** เนื่องจากมีปัญหาเดียวกับ In-memory Cache ที่กล่าวถึงในหัวข้อ 2.1 ของ `wk07.md` คือข้อมูลหายเมื่อรีสตาร์ต และไม่แชร์ระหว่างหลายอินสแตนซ์ ระบบจริงจึงต้องใช้ session store แยกต่างหาก เช่น Redis ผ่านไลบรารี `connect-redis` (เป็นคนละแพ็กเกจกับ `redis` ที่ใช้ทำ Caching ในสัปดาห์ที่ 7 แต่ทำงานผ่าน Redis Server ตัวเดียวกันได้)

---

## 2. ข้อสังเกตสำคัญ: Logout ทำได้ทันที ต่างจาก JWT

หัวข้อ 2.7 ของ `wk06.md` อธิบายว่า JWT แบบพื้นฐาน "logout" ทันทีไม่ได้ เพราะเซิร์ฟเวอร์ไม่เก็บสถานะของ token ที่ออกไปแล้ว — Session-based Authentication ไม่มีข้อจำกัดนี้ เพราะเซิร์ฟเวอร์เป็นผู้เก็บสถานะ session ไว้เองตั้งแต่ต้น (หัวข้อ 1.1 ข้อ 3) เมื่อเรียก `req.session.destroy()` เซิร์ฟเวอร์ลบข้อมูล session นั้นออกจาก store ทันที คำขอถัดไปที่แนบ session ID เดิมมาจะไม่พบข้อมูล session อีกต่อไป (แม้ cookie เดิมจะยังอยู่ในมือผู้ไม่หวังดีก็ตาม) จึงถูกปฏิเสธทันทีโดยไม่ต้องรอหมดอายุเหมือน JWT

นี่คือข้อได้เปรียบหลักของ Session-based Authentication เหนือ JWT แบบพื้นฐาน แต่ต้องแลกกับการที่เซิร์ฟเวอร์ต้องเก็บสถานะ (stateful) ซึ่งขัดกับหลักการ Stateless ของ REST ที่กล่าวถึงในสัปดาห์ที่ 2

---

## 3. ตารางเปรียบเทียบโดยละเอียด

| ประเด็น | Session-based | JWT (Token-based) |
| --- | --- | --- |
| สถานะฝั่งเซิร์ฟเวอร์ | ต้องเก็บ (stateful) | ไม่ต้องเก็บ (stateless) |
| การ Scale หลายอินสแตนซ์ | ต้องใช้ shared store (เช่น Redis) มิฉะนั้นแต่ละอินสแตนซ์เห็น session ไม่ตรงกัน | ทำได้ทันทีโดยไม่ต้องมี store ร่วม เพราะทุก instance ตรวจสอบ signature ได้เอง |
| การ Logout | ทันที (ลบ session ออกจาก store) | ทำทันทีไม่ได้หากไม่มี Token Blocklist (ดูหัวข้อ 2.7 ของ `wk06.md`) |
| กลไกส่งข้อมูลจาก client | Cookie (browser แนบให้อัตโนมัติ) | ต้องแนบ Header `Authorization: Bearer <token>` เอง (เหมาะกับ mobile app / API ที่ไม่ใช่ browser ด้วย) |
| ความเสี่ยงด้านความปลอดภัยหลัก | CSRF (Cross-Site Request Forgery) เนื่องจาก browser แนบ cookie ให้อัตโนมัติแม้เป็นคำขอข้ามเว็บไซต์ | Token รั่วไหลแล้วใช้งานได้จนหมดอายุ (ดูหัวข้อ 2.7 ของ `wk06.md`) |
| ขนาดข้อมูลที่ส่งทุกคำขอ | เล็ก (มีเพียง session ID) | ใหญ่กว่า (payload ทั้งหมดถูกส่งไปมาทุกคำขอ) |

> **ข้อควรระวัง**: แถว "ความเสี่ยงด้านความปลอดภัยหลัก" ของ Session-based ต้องอาศัยการป้องกัน CSRF เพิ่มเติม (เช่น CSRF token หรือกำหนด cookie attribute `SameSite=Strict`/`Lax`) ซึ่งเป็นความซับซ้อนที่ JWT ไม่มี เนื่องจาก JWT ไม่ได้ถูกแนบไปกับคำขอโดยอัตโนมัติผ่าน cookie แต่ต้องเขียนโค้ดฝั่ง client ให้แนบ Header เอง คำขอปลอมจากเว็บไซต์อื่นจึงไม่มี token ที่ถูกต้องมาแนบให้โดยอัตโนมัติ

---

## 4. เมื่อใดจึงควรพิจารณาใช้ Session-based แทน JWT

แม้รายวิชานี้ใช้ JWT ตลอดทั้งวิชา แต่ในทางปฏิบัติ Session-based ยังคงเป็นทางเลือกที่เหมาะสมในบางสถานการณ์

| สถานการณ์ | แนวทางที่เหมาะสมกว่า | เหตุผล |
| --- | --- | --- |
| Web application แบบดั้งเดิมที่ render HTML ฝั่งเซิร์ฟเวอร์ (server-rendered) และมี client เดียวคือ browser | Session-based | ใช้ประโยชน์จากกลไก cookie ของ browser ได้เต็มที่ ไม่ต้องจัดการ token เอง |
| ต้องการ logout ทันทีโดยไม่ implement Token Blocklist เพิ่มเติม | Session-based | ลบ session ออกจาก store ได้ทันที |
| API ที่ให้บริการหลาย client ประเภท (web, mobile app, third-party) | JWT | ไม่ผูกกับกลไก cookie ของ browser จึงยืดหยุ่นกว่า |
| ระบบที่ต้อง scale หลายอินสแตนซ์โดยไม่ต้องการเพิ่ม shared store | JWT | ตรวจสอบ token ได้ในตัวเองโดยไม่ต้องพึ่งพา store ร่วม |

---

## สรุปเนื้อหาสำคัญ

1. Session-based Authentication ให้เซิร์ฟเวอร์เก็บสถานะการ login ไว้เอง (stateful) และส่ง session ID กลับให้ client ผ่าน cookie ต่างจาก JWT ที่ไม่เก็บสถานะใด ๆ ฝั่งเซิร์ฟเวอร์
2. ข้อได้เปรียบหลักของ Session-based คือ logout ได้ทันทีโดยลบ session ออกจาก store ซึ่งเป็นข้อจำกัดของ JWT แบบพื้นฐานตามที่กล่าวถึงในหัวข้อ 2.7 ของ `wk06.md`
3. ข้อเสียหลักของ Session-based คือต้องมี shared store (เช่น Redis) เมื่อ scale หลายอินสแตนซ์ และต้องป้องกัน CSRF เพิ่มเติมเนื่องจาก cookie ถูกแนบไปกับคำขออัตโนมัติ
4. รายวิชานี้เลือกใช้ JWT ตลอดทั้งวิชาเนื่องจากสอดคล้องกับหลักการ Stateless ของ REST และเหมาะกับ API ที่ให้บริการหลาย client ประเภท แต่นิสิตควรทราบหลักการของ Session-based ไว้เพื่อเลือกใช้ให้เหมาะกับสถานการณ์จริงในอนาคต

---

## เอกสารอ้างอิง (Reference)

1. Express.js Official Documentation. *express-session*. สืบค้นจาก https://expressjs.com/en/resources/middleware/session.html
2. OWASP Foundation. *Cross-Site Request Forgery Prevention Cheat Sheet*. สืบค้นจาก https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
3. MDN Web Docs. *Set-Cookie header* (แอตทริบิวต์ `HttpOnly`, `Secure`, `SameSite`). สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Set-Cookie

---

## คำถามท้ายบท

1. จงอธิบายความแตกต่างของ "สถานะ" (state) ระหว่าง Session-based Authentication และ JWT ว่าเก็บไว้ที่ใดและมีผลอย่างไรต่อการ scale ระบบ
2. เพราะเหตุใด Session-based Authentication จึง "logout" ผู้ใช้ได้ทันที ในขณะที่ JWT แบบพื้นฐานทำไม่ได้ (เชื่อมโยงกับหัวข้อ 2.7 ของ `wk06.md`)
3. CSRF คืออะไร เหตุใดจึงเป็นความเสี่ยงของ Session-based Authentication มากกว่า JWT
4. หากต้องพัฒนาระบบที่ต้องรองรับทั้ง web application และ mobile application พร้อมกัน ควรเลือกใช้แนวทางใดระหว่าง Session-based และ JWT เพราะเหตุใด
