# Frontend เรียกใช้ API: ตัวอย่างสำหรับโครงงานระยะที่ 3

เอกสารนี้เป็นส่วนเสริมของ [wk15-project-phase3.md](wk15-project-phase3.md) ส่วนที่ 2 (Client-Facing Frontend) ครอบคลุมเทคนิคขั้นต่ำที่เพียงพอสำหรับส่งงานส่วนนี้เท่านั้น ไม่ใช่เนื้อหาสอน Frontend แบบละเอียด สมมติว่านิสิตมีพื้นฐาน HTML/CSS/JavaScript มาก่อนแล้ว

ตัวอย่างในเอกสารนี้ใช้ HTML/CSS/JavaScript ล้วน (ไม่ใช้ framework) และ `fetch` ซึ่งเป็น API มาตรฐานของเบราว์เซอร์ หากนิสิตถนัด React ดูตัวอย่างเทียบเท่าได้ที่ [wk15-frontend-react.md](wk15-frontend-react.md) หรือใช้เทคโนโลยีอื่นได้ตามที่ `wk15-project-phase3.md` ระบุไว้ (ไม่จำกัดเฟรมเวิร์ก) โดยยึดหลักการเดียวกันในเอกสารนี้

**หมายเหตุสำคัญเรื่องโครงสร้างเอกสาร**: หัวข้อ 1-5 ด้านล่างแยกอธิบายทีละเทคนิค (CORS, GET, POST, JWT, DELETE/PUT) เพื่อให้อ่านเข้าใจทีละจุด โค้ดในแต่ละหัวข้อ**ไม่ใช่ไฟล์แยกกัน** แต่เป็นส่วนหนึ่งของไฟล์ `frontend/index.html` ไฟล์เดียว อยู่ใน `<script>` เดียวกันทั้งหมด ตัวแปรอย่าง `API_BASE` และฟังก์ชันอย่าง `loadBooks()` ที่ประกาศในหัวข้อ 2 ถูกเรียกใช้ต่อในหัวข้อ 3-5 หากต้องการไฟล์ที่พร้อมคัดลอกไปใช้ได้ตรง ๆ ให้ดูหัวข้อ 6 (ไฟล์ฉบับสมบูรณ์) แทนการคัดลอกทีละ snippet

## สารบัญ

1. [เปิดให้ Frontend เรียก Backend ได้ (CORS)](#1-เปิดให้-frontend-เรียก-backend-ได้-cors)
   - [วิธีรันและเปิดดูผลลัพธ์จริง](#วิธีรันและเปิดดูผลลัพธ์จริง)
2. [เรียก API ด้วย fetch (GET)](#2-เรียก-api-ด้วย-fetch-get)
3. [ส่งข้อมูลด้วย fetch (POST) พร้อมฟอร์มและตรวจสอบเบื้องต้น](#3-ส่งข้อมูลด้วย-fetch-post-พร้อมฟอร์มและตรวจสอบเบื้องต้น)
4. [Login และแนบ JWT Token (สำหรับ endpoint ที่ต้องยืนยันตัวตน)](#4-login-และแนบ-jwt-token-สำหรับ-endpoint-ที่ต้องยืนยันตัวตน)
   - 4.1 [Login แล้วเก็บ token ไว้ใช้ต่อ](#41-login-แล้วเก็บ-token-ไว้ใช้ต่อ)
   - 4.2 [แนบ token ไปกับ request ที่ต้องยืนยันตัวตน](#42-แนบ-token-ไปกับ-request-ที่ต้องยืนยันตัวตน)
5. [ลบ/แก้ไขข้อมูล (DELETE/PUT)](#5-ลบแก้ไขข้อมูล-deleteput)
   - 5.1 [DELETE](#51-delete)
   - 5.2 [PUT](#52-put)
6. [ไฟล์ `index.html` ฉบับสมบูรณ์ (รวมทุก snippet)](#6-ไฟล-indexhtml-ฉบับสมบูรณ-รวมทุก-snippet)
7. [Checklist ก่อนส่งงาน](#7-checklist-ก่อนส่งงาน)

---

## 1. เปิดให้ Frontend เรียก Backend ได้ (CORS)

Frontend กับ Backend มักรันกันคนละ origin (เช่น เปิดไฟล์ HTML ตรง ๆ ในเบราว์เซอร์ หรือรันผ่าน Live Server คนละพอร์ตกับ Express) เบราว์เซอร์จะปิดกั้น request ข้าม origin โดยปริยาย ต้องเปิด CORS ที่ฝั่ง Express ก่อน

```bash
npm install cors
```

```javascript
// index.js (เพิ่มก่อน route ทั้งหมด)
const cors = require("cors");
app.use(cors());
```

`cors()` แบบไม่ใส่ option จะอนุญาตทุก origin — ใช้ได้สำหรับโครงงานในชั้นเรียน แต่ในระบบจริงควรจำกัด origin ที่อนุญาตเป็นช่องทางหนึ่ง (ไม่ใช่ขอบเขตของงานส่งนี้)

ทางเลือกอื่นที่ไม่ต้องติดตั้ง `cors`: ให้ Express serve ไฟล์ Frontend เป็น static file จาก origin เดียวกัน จะไม่เจอปัญหา CORS เลย

```javascript
// index.js
app.use(express.static("frontend")); // เปิดไฟล์ frontend/index.html ที่ http://localhost:3000/
```

### วิธีรันและเปิดดูผลลัพธ์จริง

เลือกวิธีใดวิธีหนึ่งตามที่ตั้งค่าไว้ด้านบน ทั้งสองวิธีมีผลต่อค่า `API_BASE` ในโค้ดตัวอย่างข้อ 2 เป็นต้นไปของเอกสารนี้

- **ถ้าใช้ `cors()`**: รัน backend ด้วย `node index.js` ตามปกติ แล้วเปิดไฟล์ `frontend/index.html` ตรง ๆ ในเบราว์เซอร์ (double-click หรือใช้ส่วนขยาย Live Server ของ VS Code) `API_BASE` ในโค้ดต้องเป็น URL เต็มของ backend เช่น `http://localhost:3000/api/v1`
- **ถ้าใช้ `express.static("frontend")`**: รัน backend ด้วย `node index.js` แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:3000/` (Express จะเสิร์ฟ `frontend/index.html` ให้เอง) เนื่องจาก Frontend กับ Backend อยู่ origin เดียวกันแล้ว `API_BASE` สามารถใช้ path สัมพัทธ์ได้เลย ไม่ต้องใส่ host เช่น `const API_BASE = "/api/v1";`

> **คำเตือน**: อย่าเปิดไฟล์ `.html` ตรง ๆ ด้วย double-click แล้วคาดหวังว่าจะเรียก backend ได้ถ้าเลือกวิธี `express.static` ไว้ — ต้องเปิดผ่าน `http://localhost:3000/` เท่านั้น มิฉะนั้นเบราว์เซอร์จะเปิดไฟล์ผ่าน `file://` protocol ซึ่งไม่ใช่ origin เดียวกับ backend และจะเจอปัญหา CORS เหมือนเดิม

---

## 2. เรียก API ด้วย fetch (GET)

```html
<!-- frontend/index.html -->
<div id="status"></div>
<ul id="book-list"></ul>

<script>
  const API_BASE = "http://localhost:3000/api/v1"; // แก้ตาม backend จริง

  async function loadBooks() {
    const statusEl = document.getElementById("status");
    const listEl = document.getElementById("book-list");
    statusEl.textContent = "กำลังโหลดข้อมูล...";
    listEl.innerHTML = "";

    try {
      const res = await fetch(`${API_BASE}/books`);
      if (!res.ok) {
        throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);
      }
      const data = await res.json();

      statusEl.textContent = "";
      data.forEach((book) => {
        const li = document.createElement("li");
        li.textContent = `${book.title} — ${book.author} `;

        // ปุ่มแก้ไข/ลบ ผูกกับ id ของแต่ละแถว ใช้งานจริงในหัวข้อ 5
        const editBtn = document.createElement("button");
        editBtn.textContent = "แก้ไข";
        editBtn.onclick = () => updateBook(book.id, { title: "ชื่อใหม่", author: book.author });

        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "ลบ";
        deleteBtn.onclick = () => deleteBook(book.id);

        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
        listEl.appendChild(li);
      });
    } catch (err) {
      statusEl.textContent = `โหลดข้อมูลไม่สำเร็จ: ${err.message}`;
    }
  }

  loadBooks();
</script>
```

ประเด็นที่เกณฑ์ตรวจเน้น (`wk15-project-phase3.md` ส่วนที่ 2):

- **แสดงสถานะ loading** — ตั้งข้อความ "กำลังโหลด..." ก่อนเรียก `fetch` แล้วค่อยล้างออกเมื่อสำเร็จ ไม่ปล่อยหน้าจอว่างเงียบระหว่างรอ
- **แสดงสถานะ error** — ตรวจ `res.ok` เอง (fetch ไม่ throw error ให้อัตโนมัติเมื่อ status เป็น 4xx/5xx) และ catch ข้อผิดพลาดเครือข่าย (เช่น backend ปิดอยู่) มาแสดงเป็นข้อความที่ผู้ใช้อ่านเข้าใจ ไม่ใช่ปล่อยให้ error เงียบใน console เท่านั้น
- ปุ่ม "แก้ไข" ในตัวอย่างนี้ใส่ค่า `title` ตายตัวไว้ก่อนเพื่อความกระชับ โครงงานจริงควรเปิดฟอร์มให้ผู้ใช้กรอกค่าที่จะแก้ไขเอง (ดูรูปแบบฟอร์มในหัวข้อ 3)

---

## 3. ส่งข้อมูลด้วย fetch (POST) พร้อมฟอร์มและตรวจสอบเบื้องต้น

```html
<!-- frontend/index.html (ต่อจากด้านบน) -->
<form id="add-book-form">
  <input type="text" id="title" placeholder="ชื่อหนังสือ" required />
  <input type="text" id="author" placeholder="ผู้แต่ง" required />
  <button type="submit">เพิ่มหนังสือ</button>
</form>
<div id="form-status"></div>

<script>
  const form = document.getElementById("add-book-form");
  const formStatusEl = document.getElementById("form-status");

  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // กัน browser reload หน้าแบบ form ปกติ

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();

    // ตรวจสอบเบื้องต้นฝั่ง Frontend ก่อนส่ง (ไม่ทดแทนการตรวจฝั่ง Backend)
    if (!title || !author) {
      formStatusEl.textContent = "กรุณากรอกชื่อหนังสือและผู้แต่งให้ครบ";
      return;
    }

    formStatusEl.textContent = "กำลังบันทึก...";

    try {
      const res = await fetch(`${API_BASE}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, author }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error?.message || `เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`,
        );
      }

      formStatusEl.textContent = "เพิ่มหนังสือสำเร็จ";
      form.reset();
      loadBooks(); // โหลดรายการใหม่ให้เห็นข้อมูลล่าสุด
    } catch (err) {
      formStatusEl.textContent = `บันทึกไม่สำเร็จ: ${err.message}`;
    }
  });
</script>
```

จุดที่มักพลาด:

- ลืมใส่ `headers: { "Content-Type": "application/json" }` — Express/`express.json()` จะไม่ parse body ให้ และ `req.body` ฝั่ง backend จะว่างเปล่า
- ลืม `e.preventDefault()` — ฟอร์มจะ submit แบบปกติและรีโหลดหน้าทั้งหน้า ทำให้ error ที่จับไว้ไม่แสดงผล
- ตรวจสอบเบื้องต้นฝั่ง Frontend (เช่น required field) เป็นแค่ช่วยผู้ใช้กรอกถูกเร็วขึ้น **ไม่ใช่การตรวจสอบความปลอดภัย** — backend ต้อง validate อินพุตเองเสมอ (ตามที่สอนไว้ตั้งแต่สัปดาห์ที่ 3)

---

## 4. Login และแนบ JWT Token (สำหรับ endpoint ที่ต้องยืนยันตัวตน)

ระบบโครงงานส่วนใหญ่มี endpoint ที่ป้องกันด้วย JWT ตามที่สอนไว้ในสัปดาห์ที่ 6 ([wk06.md](wk06.md)) — endpoint เหล่านี้ต้องแนบ token ใน header `Authorization: Bearer <token>` มาด้วยทุกครั้ง มิฉะนั้นจะได้ `401 Unauthorized`

### 4.1 Login แล้วเก็บ token ไว้ใช้ต่อ

```html
<form id="login-form">
  <input type="email" id="email" placeholder="อีเมล" required />
  <input type="password" id="password" placeholder="รหัสผ่าน" required />
  <button type="submit">เข้าสู่ระบบ</button>
</form>
<div id="login-status"></div>

<script>
  document
    .getElementById("login-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const statusEl = document.getElementById("login-status");

      statusEl.textContent = "กำลังเข้าสู่ระบบ...";

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error?.message || "เข้าสู่ระบบไม่สำเร็จ");
        }

        // เก็บ token ไว้ใน localStorage เพื่อใช้แนบกับ request ถัดไป
        localStorage.setItem("token", data.token);
        statusEl.textContent = "เข้าสู่ระบบสำเร็จ";
      } catch (err) {
        statusEl.textContent = `เข้าสู่ระบบไม่สำเร็จ: ${err.message}`;
      }
    });
</script>
```

`localStorage` เก็บข้อมูลเฉพาะในเบราว์เซอร์ของผู้ใช้คนนั้น ใช้งานง่ายและเพียงพอสำหรับขอบเขตโครงงานวิชานี้ (ระบบจริงระดับ production อาจพิจารณาวิธีอื่น เช่น `httpOnly` cookie ซึ่งนอกขอบเขตของงานส่งนี้)

### 4.2 แนบ token ไปกับ request ที่ต้องยืนยันตัวตน

```javascript
async function loadMyProfile() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 401) {
    // token ไม่มี/หมดอายุ/ไม่ถูกต้อง — ให้ผู้ใช้ login ใหม่
    localStorage.removeItem("token");
    alert("กรุณาเข้าสู่ระบบใหม่");
    return;
  }

  if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);

  const profile = await res.json();
  console.log(profile);
}
```

หลักการเดียวกันนี้ใช้กับ POST/PUT/DELETE ที่ต้องยืนยันตัวตนได้เช่นกัน — เพิ่ม header `Authorization: Bearer <token>` เข้าไปใน `headers` ของ `fetch` ทุกครั้งที่เรียก endpoint ที่ผ่าน middleware `authenticateToken` (ตามที่สอนในหัวข้อ 2.6 ของ `wk06.md`)

จุดที่มักพลาด:

- ลืมแนบ header `Authorization` ไปกับ endpoint ที่ต้องยืนยันตัวตน แล้วสงสัยว่าทำไมได้ `401` ทั้งที่เพิ่ง login สำเร็จ
- รูปแบบ header ต้องเป็น `Bearer <token>` (มีคำว่า `Bearer` และเว้นวรรค 1 ครั้งก่อน token) ตรงกับที่ฝั่ง backend แยกด้วย `authHeader.split(" ")[1]`
- token มีวันหมดอายุ (`JWT_EXPIRES_IN` ที่ตั้งไว้ในสัปดาห์ที่ 6) เมื่อหมดอายุจะได้ `401` เช่นกัน ต้องจัดการให้ผู้ใช้ login ใหม่ ไม่ใช่ปล่อยให้หน้าจอค้างหรือ error เงียบ

---

## 5. ลบ/แก้ไขข้อมูล (DELETE/PUT)

รูปแบบเดียวกับ POST เปลี่ยนแค่ `method` และ URL ที่มี id ต่อท้าย

### 5.1 DELETE

```javascript
async function deleteBook(id) {
  if (!confirm("ยืนยันการลบ?")) return; // confirm() ใช้ได้ปกติ ไม่ใช่ alert/prompt ที่บล็อก event loop แบบมีปัญหา

  try {
    const res = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`ลบไม่สำเร็จ: ${res.status}`);
    loadBooks();
  } catch (err) {
    alert(err.message);
  }
}
```

> **คำเตือน — 204 No Content**: endpoint ลบข้อมูลสำเร็จมักตอบกลับ status `204` โดยไม่มี response body เลย ตัวอย่างข้างบนจึงไม่เรียก `res.json()` ต่อจาก DELETE หากเขียน `const data = await res.json();` ต่อจาก request ที่ตอบ `204` จะได้ error `Unexpected end of JSON input` ทันที เพราะไม่มี JSON ให้ parse — ตรวจสอบก่อนเสมอว่า endpoint นั้นตอบกลับ body จริงหรือไม่ (ดูจากพฤติกรรมจริงใน Postman) ก่อนเรียก `.json()`

### 5.2 PUT

```javascript
async function updateBook(id, updatedData) {
  const statusEl = document.getElementById("status");
  statusEl.textContent = "กำลังบันทึก...";

  try {
    const res = await fetch(`${API_BASE}/books/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedData), // เช่น { title: "...", author: "..." }
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(
        errBody.error?.message || `แก้ไขไม่สำเร็จ: ${res.status}`,
      );
    }

    statusEl.textContent = "แก้ไขสำเร็จ";
    loadBooks();
  } catch (err) {
    statusEl.textContent = `แก้ไขไม่สำเร็จ: ${err.message}`;
  }
}
```

ข้อแตกต่างจาก POST คือ URL ต้องมี id ของรายการที่จะแก้ไขต่อท้าย (`${API_BASE}/books/${id}`) ส่วน POST ไม่มี id เพราะเป็นการสร้างรายการใหม่

---

## 6. ไฟล์ `index.html` ฉบับสมบูรณ์ (รวมทุก snippet)

ไฟล์ด้านล่างรวมโค้ดจากหัวข้อ 1-5 เข้าเป็นไฟล์เดียวที่รันได้จริง ใช้เป็นจุดเริ่มต้นแล้วปรับชื่อ endpoint/field ให้ตรงกับระบบโครงงานของตนเอง (ตัวอย่างนี้สมมติ resource ชื่อ `books`)

```html
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8" />
  <title>ตัวอย่าง Frontend เรียกใช้ API</title>
</head>
<body>
  <h1>ระบบจัดการหนังสือ</h1>

  <!-- ฟอร์ม Login -->
  <form id="login-form">
    <input type="email" id="email" placeholder="อีเมล" required />
    <input type="password" id="password" placeholder="รหัสผ่าน" required />
    <button type="submit">เข้าสู่ระบบ</button>
  </form>
  <div id="login-status"></div>

  <hr />

  <!-- ฟอร์มเพิ่มหนังสือ -->
  <form id="add-book-form">
    <input type="text" id="title" placeholder="ชื่อหนังสือ" required />
    <input type="text" id="author" placeholder="ผู้แต่ง" required />
    <button type="submit">เพิ่มหนังสือ</button>
  </form>
  <div id="form-status"></div>

  <hr />

  <!-- รายการหนังสือ -->
  <div id="status"></div>
  <ul id="book-list"></ul>

  <script>
    // ถ้าใช้ cors(): "http://localhost:3000/api/v1"
    // ถ้าใช้ express.static("frontend"): "/api/v1"
    const API_BASE = "http://localhost:3000/api/v1";

    // ---------- หัวข้อ 2: โหลดและแสดงรายการ (GET) ----------
    async function loadBooks() {
      const statusEl = document.getElementById("status");
      const listEl = document.getElementById("book-list");
      statusEl.textContent = "กำลังโหลดข้อมูล...";
      listEl.innerHTML = "";

      try {
        const res = await fetch(`${API_BASE}/books`);
        if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);
        const data = await res.json();

        statusEl.textContent = "";
        data.forEach((book) => {
          const li = document.createElement("li");
          li.textContent = `${book.title} — ${book.author} `;

          const editBtn = document.createElement("button");
          editBtn.textContent = "แก้ไข";
          editBtn.onclick = () => updateBook(book.id, { title: "ชื่อใหม่", author: book.author });

          const deleteBtn = document.createElement("button");
          deleteBtn.textContent = "ลบ";
          deleteBtn.onclick = () => deleteBook(book.id);

          li.appendChild(editBtn);
          li.appendChild(deleteBtn);
          listEl.appendChild(li);
        });
      } catch (err) {
        statusEl.textContent = `โหลดข้อมูลไม่สำเร็จ: ${err.message}`;
      }
    }

    // ---------- หัวข้อ 3: เพิ่มข้อมูล (POST) ----------
    document.getElementById("add-book-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const formStatusEl = document.getElementById("form-status");
      const title = document.getElementById("title").value.trim();
      const author = document.getElementById("author").value.trim();

      if (!title || !author) {
        formStatusEl.textContent = "กรุณากรอกชื่อหนังสือและผู้แต่งให้ครบ";
        return;
      }

      formStatusEl.textContent = "กำลังบันทึก...";

      try {
        const res = await fetch(`${API_BASE}/books`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, author }),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);
        }

        formStatusEl.textContent = "เพิ่มหนังสือสำเร็จ";
        e.target.reset();
        loadBooks();
      } catch (err) {
        formStatusEl.textContent = `บันทึกไม่สำเร็จ: ${err.message}`;
      }
    });

    // ---------- หัวข้อ 4: Login และเก็บ JWT token ----------
    document.getElementById("login-form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      const statusEl = document.getElementById("login-status");

      statusEl.textContent = "กำลังเข้าสู่ระบบ...";

      try {
        const res = await fetch(`${API_BASE}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "เข้าสู่ระบบไม่สำเร็จ");

        localStorage.setItem("token", data.token);
        statusEl.textContent = "เข้าสู่ระบบสำเร็จ";
      } catch (err) {
        statusEl.textContent = `เข้าสู่ระบบไม่สำเร็จ: ${err.message}`;
      }
    });

    // ---------- หัวข้อ 5: ลบ/แก้ไขข้อมูล (DELETE/PUT) ----------
    async function deleteBook(id) {
      if (!confirm("ยืนยันการลบ?")) return;

      try {
        // เพิ่ม Authorization header ที่นี่ถ้า endpoint นี้ต้องยืนยันตัวตน (ดูหัวข้อ 4.2)
        const res = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
        if (!res.ok) throw new Error(`ลบไม่สำเร็จ: ${res.status}`);
        loadBooks();
      } catch (err) {
        alert(err.message);
      }
    }

    async function updateBook(id, updatedData) {
      const statusEl = document.getElementById("status");
      statusEl.textContent = "กำลังบันทึก...";

      try {
        const res = await fetch(`${API_BASE}/books/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedData),
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(errBody.error?.message || `แก้ไขไม่สำเร็จ: ${res.status}`);
        }

        statusEl.textContent = "แก้ไขสำเร็จ";
        loadBooks();
      } catch (err) {
        statusEl.textContent = `แก้ไขไม่สำเร็จ: ${err.message}`;
      }
    }

    loadBooks();
  </script>
</body>
</html>
```

ตัวอย่างนี้ตัด header `Authorization` ออกจาก `deleteBook`/`updateBook` เพื่อความกระชับ — ถ้า endpoint `/books/:id` ของระบบจริงต้องยืนยันตัวตน ให้เพิ่ม `headers: { Authorization: \`Bearer ${localStorage.getItem("token")}\` }` ตามรูปแบบในหัวข้อ 4.2

---

## 7. Checklist ก่อนส่งงาน

- [ ] เรียก API จริงของระบบโครงงานตนเองอย่างน้อย 3 endpoint ครอบคลุม GET และอย่างน้อย 1 endpoint ที่เปลี่ยนแปลงข้อมูล (POST/PUT/DELETE)
- [ ] ทุกครั้งที่เรียก API มีสถานะ loading ให้ผู้ใช้เห็นระหว่างรอ
- [ ] ทุกครั้งที่เรียก API ล้มเหลว (เช่น backend ปิดอยู่ หรือ API ตอบ error) แสดงข้อความที่อ่านเข้าใจ ไม่ใช่หน้าจอค้างเงียบ
- [ ] ฟอร์มรับข้อมูลตรวจสอบความครบถ้วนเบื้องต้นก่อนส่ง (เช่น required field)
- [ ] เปิด CORS หรือ serve Frontend เป็น static file จาก origin เดียวกับ Backend แล้ว ทดสอบเปิดหน้าเว็บจริงใน browser เห็นข้อมูลจาก API ไม่ใช่แค่ทดสอบผ่าน Postman
- [ ] endpoint ที่ต้องยืนยันตัวตนแนบ header `Authorization: Bearer <token>` ถูกต้อง และจัดการกรณี token หมดอายุ/ไม่ถูกต้อง (`401`) โดยไม่ปล่อยหน้าจอค้าง
- [ ] ทดสอบเปิดหน้าเว็บจริงตามวิธีรันที่เลือกไว้ (เปิดไฟล์ตรง ๆ + `cors()`, หรือผ่าน `http://localhost:3000/` + `express.static`) ไม่ใช่แค่ดูโค้ดเฉย ๆ
- [ ] ถ้ามี DELETE ที่ตอบกลับ `204` ไม่เรียก `.json()` ต่อ (จะ error) และถ้ามี PUT ตรวจว่า URL มี id ต่อท้ายถูกต้อง
- [ ] ถ้ามี DELETE ที่ตอบกลับ `204` ไม่เรียก `.json()` ต่อ (จะ error) และถ้ามี PUT ตรวจว่า URL มี id ต่อท้ายถูกต้อง

## เอกสารอ้างอิงประกอบ

- MDN — Using Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN — CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- MDN — Window.localStorage: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- npm cors: https://www.npmjs.com/package/cors
- สัปดาห์ที่ 6 (Authentication/Authorization ฝั่ง Backend): `wk06.md`
