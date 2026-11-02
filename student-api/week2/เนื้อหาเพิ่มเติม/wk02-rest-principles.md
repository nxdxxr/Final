# สัปดาห์ที่ 2 (เสริม): หลักการสำคัญ 6 ประการของ REST โดยละเอียด

เอกสารนี้ขยายความจากหัวข้อ 3.2 ในเอกสาร [wk02.md](wk02.md) โดยอธิบายหลักการสำคัญทั้ง 6 ประการของสถาปัตยกรรม REST อย่างละเอียด พร้อมตัวอย่างโค้ดฝั่ง Backend (Node.js/Express) และฝั่ง Frontend (JavaScript, Fetch API) ประกอบแต่ละหลักการ เพื่อให้เห็นภาพการนำไปใช้งานจริง

หลักการทั้ง 6 ประการนี้ถูกกำหนดโดย Roy Fielding ในวิทยานิพนธ์ปริญญาเอกปี ค.ศ. 2000 ซึ่งเป็นเงื่อนไข (constraints) ที่ระบบจะต้องมีครบทั้งหมดจึงจะเรียกได้ว่าเป็น RESTful อย่างสมบูรณ์ (ยกเว้นข้อ 6 ที่เป็นทางเลือก)

---

## 1. Client-Server

### 1.1 หลักการ

หลักการนี้กำหนดให้แยกความรับผิดชอบระหว่างฝั่ง client (ผู้เรียกใช้บริการ เช่น เว็บเบราว์เซอร์ แอปมือถือ) และฝั่ง server (ผู้ให้บริการข้อมูลและตรรกะทางธุรกิจ) ออกจากกันอย่างชัดเจน โดยทั้งสองฝั่งสื่อสารกันผ่าน interface ที่เป็นมาตรฐาน (เช่น HTTP) เท่านั้น

ประโยชน์ที่ได้คือ

- ทีมพัฒนา frontend และ backend สามารถทำงานคู่ขนานกันได้ ตราบใดที่ตกลงรูปแบบ API (contract) ร่วมกันไว้ล่วงหน้า
- แต่ละฝั่งสามารถเปลี่ยนแปลงเทคโนโลยีภายในของตนได้อย่างอิสระ โดยไม่กระทบอีกฝั่งหนึ่ง ตราบใดที่ interface ยังคงเดิม เช่น server เปลี่ยนจากฐานข้อมูล MySQL เป็น PostgreSQL โดยที่ client ไม่ต้องรับรู้หรือแก้ไขโค้ดใด ๆ

### 1.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — server รับผิดชอบเฉพาะการให้บริการข้อมูล ไม่เกี่ยวข้องกับการแสดงผล (presentation)

```javascript
// server.js
const express = require('express');
const app = express();

app.use(express.json());

const students = [
  { id: 1, name: 'สมชาย ใจดี', major: 'วิทยาการคอมพิวเตอร์' },
];

app.get('/api/v1/students', (req, res) => {
  res.json(students); // ส่งเฉพาะข้อมูล ไม่ส่ง HTML
});

app.listen(3000, () => console.log('API server running on port 3000'));
```

**Frontend (JavaScript, Fetch API)** — client รับผิดชอบการแสดงผล โดยเรียกข้อมูลจาก server ผ่าน HTTP เท่านั้น

```javascript
// client.js
async function loadStudents() {
  const res = await fetch('http://localhost:3000/api/v1/students');
  const students = await res.json();

  const list = document.getElementById('student-list');
  list.innerHTML = students
    .map((s) => `<li>${s.name} - ${s.major}</li>`)
    .join('');
}

loadStudents();
```

จะเห็นได้ว่า server ไม่ทราบว่า client จะนำข้อมูลไปแสดงผลอย่างไร และ client ไม่ทราบว่า server เก็บข้อมูลด้วยกลไกใด ทั้งสองฝั่งผูกกันด้วย URL และรูปแบบ JSON เท่านั้น

---

## 2. Stateless

### 2.1 หลักการ

แต่ละคำขอ (request) จาก client ไปยัง server ต้องมีข้อมูลครบถ้วนในตัวเองเพียงพอที่ server จะประมวลผลได้ โดยที่ server **ไม่จดจำสถานะ (state) ของ client จากคำขอครั้งก่อนหน้า** ข้อมูลระบุตัวตนหรือ session ต้องถูกส่งมาพร้อมกับทุกคำขอ เช่น ผ่าน HTTP Header

ประโยชน์ที่ได้คือ

- server สามารถขยาย (scale) ในแนวนอน (horizontal scaling) ได้ง่าย เพราะคำขอใดก็ตามสามารถถูกประมวลผลโดย server instance ใดก็ได้ ไม่จำเป็นต้องเป็น instance เดิมที่เคยรับคำขอก่อนหน้า
- ลดภาระการจัดการ session บนฝั่ง server

ในทางปฏิบัติ มักใช้ **JWT (JSON Web Token)** เป็นกลไกยืนยันตัวตนแบบ stateless โดย client แนบ token มากับทุกคำขอผ่าน HTTP Header `Authorization`

### 2.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — ตรวจสอบตัวตนจาก token ที่แนบมาในทุกคำขอ โดยไม่มีการเก็บ session ไว้ในหน่วยความจำของ server

```javascript
// authMiddleware.js
const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization; // "Bearer <token>"
  if (!authHeader) {
    return res.status(401).json({ message: 'ไม่มี token แนบมากับคำขอ' });
  }

  const token = authHeader.split(' ')[1];
  try {
    // ข้อมูลผู้ใช้ถูกอ่านจาก token ในคำขอนี้เท่านั้น ไม่พึ่งพา session ก่อนหน้า
    req.user = jwt.verify(token, SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'token ไม่ถูกต้องหรือหมดอายุ' });
  }
}

module.exports = authenticate;
```

```javascript
// server.js (บางส่วน)
app.get('/api/v1/profile', authenticate, (req, res) => {
  res.json({ id: req.user.id, name: req.user.name });
});
```

**Frontend (JavaScript, Fetch API)** — แนบ token ไปกับทุกคำขอ

```javascript
async function getProfile() {
  const token = localStorage.getItem('token');

  const res = await fetch('http://localhost:3000/api/v1/profile', {
    headers: {
      Authorization: `Bearer ${token}`, // ส่งข้อมูลยืนยันตัวตนครบทุกครั้ง
    },
  });

  if (!res.ok) {
    console.error('ยืนยันตัวตนไม่สำเร็จ');
    return;
  }
  return res.json();
}
```

หาก server ปิดและเปิดใหม่ หรือมีการกระจายคำขอไปยัง server หลายเครื่องด้วย load balancer คำขอนี้ก็ยังคงสำเร็จ เพราะไม่มีข้อมูลใดที่ต้องพึ่งพาความจำของ server เครื่องใดเครื่องหนึ่งโดยเฉพาะ

---

## 3. Cacheable

### 3.1 หลักการ

การตอบกลับ (response) จาก server ต้องระบุอย่างชัดเจนว่าสามารถ**แคช (cache)** ได้หรือไม่ และหากแคชได้ ควรเก็บไว้ได้นานเท่าใด เพื่อให้ client หรือตัวกลาง (เช่น proxy, CDN) สามารถนำผลลัพธ์เดิมมาใช้ซ้ำได้โดยไม่ต้องเรียกคำขอไปยัง server ใหม่ทุกครั้ง

ประโยชน์ที่ได้คือ

- ลดภาระของ server และลดเวลาแฝง (latency) ในการตอบสนอง
- ลดการใช้แบนด์วิดท์เครือข่าย

กลไกหลักที่ใช้ควบคุมการแคชใน REST คือ HTTP Header เช่น `Cache-Control`, `ETag`, `Last-Modified` (รายละเอียดเชิงลึกเรื่อง Caching จะกล่าวถึงในสัปดาห์ที่ 7)

### 3.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — กำหนด Header ควบคุมการแคชให้ผลลัพธ์ที่ไม่เปลี่ยนแปลงบ่อย

```javascript
app.get('/api/v1/courses', (req, res) => {
  // ข้อมูลรายวิชาเปลี่ยนแปลงไม่บ่อย จึงอนุญาตให้แคชได้ 5 นาที
  res.set('Cache-Control', 'public, max-age=300');
  res.json(courses);
});

app.get('/api/v1/profile', authenticate, (req, res) => {
  // ข้อมูลส่วนตัว ห้ามแคชที่ตัวกลางใด ๆ
  res.set('Cache-Control', 'no-store');
  res.json({ id: req.user.id, name: req.user.name });
});
```

**Frontend (JavaScript, Fetch API)** — เบราว์เซอร์และ Fetch API จะเคารพ Header `Cache-Control` ที่ server ส่งมาโดยอัตโนมัติ โดยนักพัฒนาสามารถกำหนดพฤติกรรมการแคชฝั่ง client เพิ่มเติมได้ผ่านพารามิเตอร์ `cache`

```javascript
// ใช้ค่าแคชเดิมถ้ายังไม่หมดอายุตาม Cache-Control ของ server
fetch('http://localhost:3000/api/v1/courses', { cache: 'default' });

// บังคับข้ามแคช ดึงข้อมูลใหม่จาก server เสมอ (ใช้กับข้อมูลที่ต้องอัปเดตทันที)
fetch('http://localhost:3000/api/v1/profile', { cache: 'no-store' });
```

---

## 4. Uniform Interface

### 4.1 หลักการ

REST กำหนดให้ทุก resource ในระบบถูกเข้าถึงผ่านรูปแบบ (interface) ที่เป็นมาตรฐานเดียวกันทั่วทั้งระบบ ประกอบด้วยแนวคิดย่อย 4 ประการ

1. **การระบุตัวตนของ resource ผ่าน URI** — แต่ละ resource มี URI เฉพาะของตนเอง เช่น `/students/1`
2. **การจัดการ resource ผ่าน representation** — client ไม่ได้แก้ไขข้อมูลใน database โดยตรง แต่ส่ง representation (เช่น JSON) ไปให้ server จัดการ
3. **Self-descriptive messages** — แต่ละคำขอ/คำตอบมีข้อมูลเพียงพอให้เข้าใจวิธีประมวลผล เช่น HTTP Method, Header `Content-Type`
4. **HATEOAS (Hypermedia as the Engine of Application State)** — response ควรมีลิงก์ (hyperlink) ที่บอกว่าจากสถานะปัจจุบัน client สามารถทำอะไรต่อได้บ้าง

ประโยชน์ที่ได้คือ client และ server เข้าใจตรงกันโดยไม่ต้องเรียนรู้รูปแบบเฉพาะของแต่ละ endpoint

### 4.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — ทุก resource ใช้รูปแบบ URI และ HTTP Method เดียวกัน พร้อมแนบลิงก์แบบ HATEOAS

```javascript
app.get('/api/v1/students/:id', (req, res) => {
  const student = students.find((s) => s.id === Number(req.params.id));
  if (!student) return res.status(404).json({ message: 'ไม่พบข้อมูล' });

  res.json({
    ...student,
    // แนบลิงก์บอกการกระทำที่ทำได้ต่อจากสถานะปัจจุบัน (HATEOAS)
    links: [
      { rel: 'self', href: `/api/v1/students/${student.id}`, method: 'GET' },
      { rel: 'update', href: `/api/v1/students/${student.id}`, method: 'PUT' },
      { rel: 'delete', href: `/api/v1/students/${student.id}`, method: 'DELETE' },
      { rel: 'courses', href: `/api/v1/students/${student.id}/courses`, method: 'GET' },
    ],
  });
});
```

**Frontend (JavaScript, Fetch API)** — client เดินตามลิงก์ที่ server มอบให้ แทนที่จะฝัง URL ไว้ตายตัว

```javascript
async function loadStudentAndActions(id) {
  const res = await fetch(`http://localhost:3000/api/v1/students/${id}`);
  const student = await res.json();

  // อ่าน endpoint ต่อไปจาก response แทนการเขียน URL คงที่ในโค้ด
  const coursesLink = student.links.find((l) => l.rel === 'courses');
  const coursesRes = await fetch(`http://localhost:3000${coursesLink.href}`, {
    method: coursesLink.method,
  });

  return coursesRes.json();
}
```

---

## 5. Layered System

### 5.1 หลักการ

สถาปัตยกรรมของระบบสามารถประกอบด้วยหลายชั้น (layer) ซ้อนกันได้ เช่น load balancer, API Gateway, reverse proxy, caching layer โดยที่ client ไม่จำเป็นต้องทราบว่ากำลังสื่อสารกับ server ต้นทางโดยตรงหรือผ่านชั้นตัวกลางใด ๆ ตราบใดที่ client ยังคงได้รับ response ที่ถูกต้องตามรูปแบบเดิม

ประโยชน์ที่ได้คือ

- สามารถแทรกชั้นเพิ่มเติมเพื่อเพิ่มความสามารถของระบบ เช่น เพิ่ม rate limiting, logging, หรือ authentication ที่ API Gateway โดยไม่กระทบโค้ดฝั่ง client
- เพิ่มความสามารถในการขยายระบบ (scalability) ด้วยการห่อหุ้ม (encapsulate) โครงสร้างภายในไว้แต่ละชั้น ทำให้ปรับปรุงหรือแทนที่ระบบเดิม (legacy system) ได้โดยไม่กระทบ client และยังเปิดทางให้ทำ shared caching ระหว่างชั้นได้อีกด้วย

### 5.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — ตัวอย่าง reverse proxy ชั้นหน้าที่ทำหน้าที่ rate limiting ก่อนส่งต่อคำขอไปยัง API server จริง (แนวคิดแบบ layered)

```javascript
// gateway.js — ชั้น API Gateway
const express = require('express');
const rateLimit = require('express-rate-limit');
const { createProxyMiddleware } = require('http-proxy-middleware');

const gateway = express();

gateway.use(
  rateLimit({ windowMs: 60 * 1000, max: 100 }) // จำกัด 100 คำขอต่อนาที
);

// ส่งต่อคำขอไปยัง API server จริงที่ทำงานอยู่เบื้องหลัง (client ไม่รู้ชั้นนี้)
gateway.use('/api', createProxyMiddleware({ target: 'http://localhost:3000' }));

gateway.listen(8080, () => console.log('API Gateway running on port 8080'));
```

**Frontend (JavaScript, Fetch API)** — client เรียกผ่าน URL เดียว โดยไม่ทราบว่าเบื้องหลังมี gateway คั่นอยู่กี่ชั้น

```javascript
// client ไม่ทราบว่ามี API Gateway คั่นอยู่ก่อนถึง API server จริง
const res = await fetch('http://localhost:8080/api/v1/students');
const students = await res.json();
```

หากภายหลังต้องเพิ่มชั้น caching layer หรือเปลี่ยน API server เป็นหลายเครื่องเบื้องหลัง load balancer โค้ดฝั่ง client ด้านบนก็ยังคงทำงานได้โดยไม่ต้องแก้ไข

---

## 6. Code on Demand (ทางเลือก)

### 6.1 หลักการ

เป็นหลักการเดียวใน 6 ข้อที่เป็น**ทางเลือก (optional)** ไม่บังคับ กล่าวคือ server สามารถขยายความสามารถของ client ได้ชั่วคราว โดยการส่งโค้ดที่ execute ได้ (เช่น JavaScript) ไปให้ client รันเพิ่มเติม แทนที่จะส่งเฉพาะข้อมูล (data) เพียงอย่างเดียว

ในทางปฏิบัติ Code on Demand มักไม่ถูกใช้ในการออกแบบ REST API ทั่วไป เพราะขัดกับความเรียบง่ายของ interface และมีประเด็นด้านความปลอดภัย (การรัน code ที่มาจาก server โดยตรงบน client) แต่สามารถพบตัวอย่างได้ในการที่เว็บเบราว์เซอร์ดาวน์โหลดและรันไฟล์ JavaScript จาก server เพื่อเพิ่มพฤติกรรมให้หน้าเว็บ

### 6.2 ตัวอย่างโค้ด

**Backend (Node.js/Express)** — ส่งสคริปต์ JavaScript ให้ client ไปรันเพิ่มเติม โดยเนื้อหาของสคริปต์กำหนดจากข้อมูลฝั่ง server (เช่น แคมเปญส่วนลดที่ตั้งค่าไว้ในฐานข้อมูล) ทำให้เปลี่ยนกฎการคำนวณได้โดยไม่ต้องแก้หรือ deploy โค้ดฝั่ง client ใหม่

```javascript
// สมมติว่าอัตราส่วนลดถูกดึงมาจากฐานข้อมูล และอาจเปลี่ยนแปลงได้ตามแคมเปญ
function getActiveDiscountRate() {
  return 0.1; // ปกติจะอ่านค่านี้จาก database หรือ config ที่แก้ไขได้โดยไม่ต้อง deploy
}

app.get('/api/v1/discount-rule', (req, res) => {
  const rate = getActiveDiscountRate();
  res.type('application/javascript');
  // ส่งฟังก์ชันคำนวณส่วนลดเป็นโค้ดที่ client นำไปรันเอง โดยฝัง rate ปัจจุบันไว้ในสคริปต์
  res.send(`
    function calculateDiscount(price) {
      return price > 1000 ? price * (1 - ${rate}) : price;
    }
  `);
});
```

**Frontend (JavaScript)** — client โหลดและรันโค้ดที่ได้รับจาก server แบบ dynamic

```javascript
async function loadDiscountRule() {
  const res = await fetch('http://localhost:3000/api/v1/discount-rule');
  const scriptText = await res.text();

  // รันโค้ดที่ server ส่งมา เพื่อให้ได้ฟังก์ชัน calculateDiscount มาใช้งาน
  const runRule = new Function(`${scriptText}; return calculateDiscount;`);
  const calculateDiscount = runRule();

  console.log(calculateDiscount(1500)); // 1350
}
```

หมายเหตุด้านความปลอดภัย: การใช้ `new Function` หรือ `eval` เพื่อรันโค้ดจากภายนอกมีความเสี่ยงหากไม่สามารถเชื่อถือแหล่งที่มาของโค้ดได้ ในทางปฏิบัติของ REST API ทั่วไปในรายวิชานี้จะไม่ใช้หลักการนี้ และจะยึดหลักการ 5 ข้อแรกเป็นหลัก

---

## สรุป

| หลักการ | ใจความสำคัญ | กลไกที่ใช้ในทางปฏิบัติ |
| --- | --- | --- |
| Client-Server | แยกส่วนแสดงผลและส่วนข้อมูลออกจากกัน | Frontend/Backend แยกโปรเจกต์ สื่อสารผ่าน HTTP |
| Stateless | แต่ละคำขอมีข้อมูลครบในตัวเอง | JWT แนบผ่าน `Authorization` header |
| Cacheable | ระบุได้ว่าผลลัพธ์แคชได้หรือไม่ | HTTP Header `Cache-Control`, `ETag` |
| Uniform Interface | ใช้รูปแบบเข้าถึง resource เดียวกันทั่วระบบ | URI, HTTP Method, HATEOAS |
| Layered System | มีชั้นตัวกลางได้โดย client ไม่ต้องรับรู้ | API Gateway, Load Balancer, Reverse Proxy |
| Code on Demand | server ส่งโค้ดให้ client รันเพิ่มได้ (ทางเลือก) | ส่ง script ผ่าน response แล้ว execute ฝั่ง client |

หลักการทั้ง 6 ประการนี้เป็นพื้นฐานสำคัญก่อนเข้าสู่หัวข้อการออกแบบ RESTful API โดยละเอียดในสัปดาห์ที่ 3

---

## เอกสารอ้างอิง (Reference)

1. Fielding, R. T. (2000). *Architectural Styles and the Design of Network-based Software Architectures* (Doctoral dissertation, University of California, Irvine). สืบค้นจาก https://ics.uci.edu/~fielding/pubs/dissertation/top.htm
2. MDN Web Docs. *HTTP Caching*. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
3. MDN Web Docs. *Using the Fetch API*. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
4. Express.js Official Documentation. สืบค้นจาก https://expressjs.com
