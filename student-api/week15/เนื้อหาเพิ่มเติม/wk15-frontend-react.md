# Frontend เรียกใช้ API ด้วย React: ตัวอย่างสำหรับโครงงานระยะที่ 3

เอกสารนี้เป็นส่วนเสริมของ [wk15-project-phase3.md](wk15-project-phase3.md) ส่วนที่ 2 (Client-Facing Frontend) สำหรับนิสิตที่เลือกใช้ **React** แทน HTML/CSS/JavaScript ล้วน ครอบคลุมเทคนิคขั้นต่ำที่เพียงพอสำหรับส่งงานส่วนนี้เท่านั้น ไม่ใช่เนื้อหาสอน React แบบละเอียด สมมติว่านิสิตมีพื้นฐาน React (component, JSX, hooks พื้นฐาน) มาก่อนแล้ว

หลักการเรียก API (CORS, fetch, JWT, การจัดการ loading/error) เหมือนกับเอกสาร [wk15-frontend.md](wk15-frontend.md) ทุกประการ ต่างกันแค่วิธีจัดการ state และ UI ด้วย React เท่านั้น — ถ้าใช้ HTML/CSS/JavaScript ล้วนให้ดูเอกสารนั้นแทน

## สารบัญ

1. [ตั้งโปรเจกต์ React ด้วย Vite](#1-ตั้งโปรเจกต์-react-ด้วย-vite)
2. [เปิดให้ React เรียก Backend ได้ (CORS)](#2-เปิดให้-react-เรียก-backend-ได้-cors)
3. [เรียก API ด้วย useEffect + useState (GET)](#3-เรียก-api-ด้วย-useeffect--usestate-get)
4. [ส่งข้อมูลด้วยฟอร์ม (POST)](#4-ส่งข้อมูลด้วยฟอร์ม-post)
5. [Login และแนบ JWT Token](#5-login-และแนบ-jwt-token)
   - 5.1 [Login แล้วเก็บ token ไว้ใช้ต่อ](#51-login-แล้วเก็บ-token-ไว้ใช้ต่อ)
   - 5.2 [แนบ token ไปกับ request ที่ต้องยืนยันตัวตน](#52-แนบ-token-ไปกับ-request-ที่ต้องยืนยันตัวตน)
6. [ลบ/แก้ไขข้อมูล (DELETE/PUT)](#6-ลบแก้ไขข้อมูล-deleteput)
7. [App.jsx ฉบับสมบูรณ์ (รวมทุกส่วน)](#7-appjsx-ฉบับสมบูรณ์-รวมทุกส่วน)
8. [Checklist ก่อนส่งงาน](#8-checklist-ก่อนส่งงาน)

---

## 1. ตั้งโปรเจกต์ React ด้วย Vite

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm run dev
```

คำสั่งนี้สร้างโฟลเดอร์ `frontend/` แยกจากโปรเจกต์ backend (`student-api` หรือโปรเจกต์โครงงานของตนเอง) เป็นคนละโปรเจกต์ Node.js กัน (มี `package.json` คนละไฟล์) `npm run dev` จะรัน dev server ของ Vite ที่พอร์ตอื่น (ปกติ `http://localhost:5173`) ซึ่งคนละ origin กับ backend (`http://localhost:3000`) เสมอ — ต่างจาก vanilla JS ที่อาจ serve จาก origin เดียวกันได้ React ผ่าน Vite dev server **ต้องเปิด CORS ที่ backend เสมอ** (ดูหัวข้อ 2)

โครงสร้างโฟลเดอร์หลังตั้งโปรเจกต์:

```
project-phase3-<ชื่อ>/
├── src/              (โค้ด backend เดิม)
├── frontend/         (โปรเจกต์ React ใหม่)
│   ├── src/
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
└── package.json      (backend)
```

---

## 2. เปิดให้ React เรียก Backend ได้ (CORS)

ที่ฝั่ง **backend** (ไม่ใช่ฝั่ง React) ติดตั้งและเปิด CORS เหมือนกับตัวอย่าง vanilla JS

```bash
npm install cors
```

```javascript
// index.js (ฝั่ง backend เพิ่มก่อน route ทั้งหมด)
const cors = require("cors");
app.use(cors());
```

เนื่องจาก Vite dev server กับ backend เป็นคนละพอร์ตเสมอ (ต่างจาก vanilla JS ที่เลือก serve static จาก origin เดียวกันได้) ตัวอย่างในเอกสารนี้จึง**ไม่มีทางเลือก** serve static แบบ `express.static` — ต้องใช้ `cors()` เท่านั้นระหว่างพัฒนา

---

## 3. เรียก API ด้วย `useEffect` + `useState` (GET)

```jsx
// frontend/src/App.jsx
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000/api/v1"; // แก้ตาม backend จริง

function App() {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("");

  async function loadBooks() {
    setStatus("กำลังโหลดข้อมูล...");
    try {
      const res = await fetch(`${API_BASE}/books`);
      if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);
      const data = await res.json();
      setBooks(data);
      setStatus("");
    } catch (err) {
      setStatus(`โหลดข้อมูลไม่สำเร็จ: ${err.message}`);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []); // array ว่าง = เรียกครั้งเดียวตอน component mount

  return (
    <div>
      <p>{status}</p>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            {book.title} — {book.author}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

ประเด็นที่เกณฑ์ตรวจเน้น (`wk15-project-phase3.md` ส่วนที่ 2) และจุดที่มักพลาดเฉพาะ React:

- **แสดงสถานะ loading/error** — ใช้ `useState` เก็บข้อความสถานะ แล้วแสดงใน JSX เหมือนตัวอย่าง `status` ด้านบน
- **`useEffect` ต้องมี dependency array `[]`** — ถ้าลืมใส่ `[]` ท้าย `useEffect` จะเรียก `loadBooks()` ซ้ำไม่รู้จบทุกครั้งที่ component re-render (infinite loop เรียก API รัว ๆ)
- **ต้องมี `key` prop ที่ไม่ซ้ำกันในแต่ละ `<li>`** — ใช้ `book.id` ซึ่งเป็นค่าที่ไม่ซ้ำกันจริงจากฐานข้อมูล ไม่ใช่ index ของ array (จะมีปัญหาเวลาลบ/เรียงข้อมูลใหม่)

---

## 4. ส่งข้อมูลด้วยฟอร์ม (POST)

```jsx
// เพิ่มใน App.jsx (ต่อจาก state เดิม)
const [title, setTitle] = useState("");
const [author, setAuthor] = useState("");
const [formStatus, setFormStatus] = useState("");

async function handleAddBook(e) {
  e.preventDefault(); // กัน browser reload หน้าแบบ form ปกติ

  if (!title.trim() || !author.trim()) {
    setFormStatus("กรุณากรอกชื่อหนังสือและผู้แต่งให้ครบ");
    return;
  }

  setFormStatus("กำลังบันทึก...");

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

    setFormStatus("เพิ่มหนังสือสำเร็จ");
    setTitle("");
    setAuthor("");
    loadBooks(); // โหลดรายการใหม่ให้เห็นข้อมูลล่าสุด
  } catch (err) {
    setFormStatus(`บันทึกไม่สำเร็จ: ${err.message}`);
  }
}

// ใน JSX ที่ return
<form onSubmit={handleAddBook}>
  <input
    type="text"
    placeholder="ชื่อหนังสือ"
    value={title}
    onChange={(e) => setTitle(e.target.value)}
    required
  />
  <input
    type="text"
    placeholder="ผู้แต่ง"
    value={author}
    onChange={(e) => setAuthor(e.target.value)}
    required
  />
  <button type="submit">เพิ่มหนังสือ</button>
</form>
<p>{formStatus}</p>
```

จุดที่มักพลาด:

- ลืมใส่ `headers: { "Content-Type": "application/json" }` — เหมือนตัวอย่าง vanilla JS, `req.body` ฝั่ง backend จะว่างเปล่า
- ลืม `e.preventDefault()` — ฟอร์มจะ submit แบบปกติและรีโหลดหน้าทั้งหน้า
- ใช้ **controlled input** (`value={title}` คู่กับ `onChange`) ไม่ใช่ uncontrolled — React แนะนำให้ state เป็นแหล่งข้อมูลจริงของ input เสมอ ไม่ใช่อ่านค่าจาก DOM ตรง ๆ แบบ vanilla JS (`document.getElementById(...).value`)
- ตรวจสอบเบื้องต้นฝั่ง Frontend (เช่น `required`) เป็นแค่ช่วยผู้ใช้กรอกถูกเร็วขึ้น **ไม่ใช่การตรวจสอบความปลอดภัย** — backend ต้อง validate อินพุตเองเสมอ (ตามที่สอนไว้ตั้งแต่สัปดาห์ที่ 3)

---

## 5. Login และแนบ JWT Token

ระบบโครงงานส่วนใหญ่มี endpoint ที่ป้องกันด้วย JWT ตามที่สอนไว้ในสัปดาห์ที่ 6 ([wk06.md](wk06.md)) — endpoint เหล่านี้ต้องแนบ token ใน header `Authorization: Bearer <token>` มาด้วยทุกครั้ง มิฉะนั้นจะได้ `401 Unauthorized`

### 5.1 Login แล้วเก็บ token ไว้ใช้ต่อ

```jsx
const [email, setEmail] = useState("");
const [password, setPassword] = useState("");
const [loginStatus, setLoginStatus] = useState("");

async function handleLogin(e) {
  e.preventDefault();
  setLoginStatus("กำลังเข้าสู่ระบบ...");

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || "เข้าสู่ระบบไม่สำเร็จ");

    // เก็บ token ไว้ใน localStorage เพื่อใช้แนบกับ request ถัดไป
    localStorage.setItem("token", data.token);
    setLoginStatus("เข้าสู่ระบบสำเร็จ");
  } catch (err) {
    setLoginStatus(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
  }
}

// ใน JSX
<form onSubmit={handleLogin}>
  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
  <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
  <button type="submit">เข้าสู่ระบบ</button>
</form>
<p>{loginStatus}</p>
```

`localStorage` เก็บข้อมูลเฉพาะในเบราว์เซอร์ของผู้ใช้คนนั้น ใช้งานง่ายและเพียงพอสำหรับขอบเขตโครงงานวิชานี้ (ระบบจริงระดับ production อาจพิจารณาวิธีอื่น เช่น `httpOnly` cookie ซึ่งนอกขอบเขตของงานส่งนี้) `localStorage` เป็น Web API มาตรฐานของเบราว์เซอร์ ใช้งานได้เหมือนกันทั้งใน React และ vanilla JS ไม่ต้องติดตั้งไลบรารีเพิ่ม

### 5.2 แนบ token ไปกับ request ที่ต้องยืนยันตัวตน

```jsx
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

## 6. ลบ/แก้ไขข้อมูล (DELETE/PUT)

```jsx
async function deleteBook(id) {
  if (!confirm("ยืนยันการลบ?")) return;

  try {
    const res = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`ลบไม่สำเร็จ: ${res.status}`);
    loadBooks();
  } catch (err) {
    alert(err.message);
  }
}

async function updateBook(id, updatedData) {
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

    loadBooks();
  } catch (err) {
    alert(err.message);
  }
}

// ใน JSX ของแต่ละแถว ผูกปุ่มกับ id ของรายการนั้น
<li key={book.id}>
  {book.title} — {book.author}
  <button onClick={() => updateBook(book.id, { title: "ชื่อใหม่", author: book.author })}>
    แก้ไข
  </button>
  <button onClick={() => deleteBook(book.id)}>ลบ</button>
</li>
```

> **คำเตือน — 204 No Content**: endpoint ลบข้อมูลสำเร็จมักตอบกลับ status `204` โดยไม่มี response body เลย ตัวอย่างข้างบนจึงไม่เรียก `res.json()` ต่อจาก DELETE หากเขียน `const data = await res.json();` ต่อจาก request ที่ตอบ `204` จะได้ error `Unexpected end of JSON input` ทันที เพราะไม่มี JSON ให้ parse — ตรวจสอบก่อนเสมอว่า endpoint นั้นตอบกลับ body จริงหรือไม่ (ดูจากพฤติกรรมจริงใน Postman) ก่อนเรียก `.json()`

ข้อแตกต่างจาก POST คือ URL ต้องมี id ของรายการที่จะแก้ไข/ลบต่อท้าย (`${API_BASE}/books/${id}`) ส่วน POST ไม่มี id เพราะเป็นการสร้างรายการใหม่ `confirm()`/`alert()` ใช้งานได้ปกติใน React เหมือนกับ vanilla JS เพราะเป็น Web API ของเบราว์เซอร์ ไม่ใช่ของ framework ใดโดยเฉพาะ

---

## 7. `App.jsx` ฉบับสมบูรณ์ (รวมทุกส่วน)

ไฟล์ด้านล่างรวมโค้ดจากหัวข้อ 3-6 เข้าเป็น component เดียวที่รันได้จริง ใช้เป็นจุดเริ่มต้นแล้วปรับชื่อ endpoint/field ให้ตรงกับระบบโครงงานของตนเอง (ตัวอย่างนี้สมมติ resource ชื่อ `books`)

```jsx
// frontend/src/App.jsx
import { useState, useEffect } from "react";

const API_BASE = "http://localhost:3000/api/v1"; // แก้ตาม backend จริง

function App() {
  const [books, setBooks] = useState([]);
  const [status, setStatus] = useState("");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [formStatus, setFormStatus] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginStatus, setLoginStatus] = useState("");

  // ---------- หัวข้อ 3: โหลดและแสดงรายการ (GET) ----------
  async function loadBooks() {
    setStatus("กำลังโหลดข้อมูล...");
    try {
      const res = await fetch(`${API_BASE}/books`);
      if (!res.ok) throw new Error(`เซิร์ฟเวอร์ตอบกลับผิดพลาด: ${res.status}`);
      const data = await res.json();
      setBooks(data);
      setStatus("");
    } catch (err) {
      setStatus(`โหลดข้อมูลไม่สำเร็จ: ${err.message}`);
    }
  }

  useEffect(() => {
    loadBooks();
  }, []);

  // ---------- หัวข้อ 4: เพิ่มข้อมูล (POST) ----------
  async function handleAddBook(e) {
    e.preventDefault();

    if (!title.trim() || !author.trim()) {
      setFormStatus("กรุณากรอกชื่อหนังสือและผู้แต่งให้ครบ");
      return;
    }

    setFormStatus("กำลังบันทึก...");

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

      setFormStatus("เพิ่มหนังสือสำเร็จ");
      setTitle("");
      setAuthor("");
      loadBooks();
    } catch (err) {
      setFormStatus(`บันทึกไม่สำเร็จ: ${err.message}`);
    }
  }

  // ---------- หัวข้อ 5: Login และเก็บ JWT token ----------
  async function handleLogin(e) {
    e.preventDefault();
    setLoginStatus("กำลังเข้าสู่ระบบ...");

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "เข้าสู่ระบบไม่สำเร็จ");

      localStorage.setItem("token", data.token);
      setLoginStatus("เข้าสู่ระบบสำเร็จ");
    } catch (err) {
      setLoginStatus(`เข้าสู่ระบบไม่สำเร็จ: ${err.message}`);
    }
  }

  // ---------- หัวข้อ 6: ลบ/แก้ไขข้อมูล (DELETE/PUT) ----------
  async function deleteBook(id) {
    if (!confirm("ยืนยันการลบ?")) return;

    try {
      // เพิ่ม Authorization header ที่นี่ถ้า endpoint นี้ต้องยืนยันตัวตน (ดูหัวข้อ 5.2)
      const res = await fetch(`${API_BASE}/books/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`ลบไม่สำเร็จ: ${res.status}`);
      loadBooks();
    } catch (err) {
      alert(err.message);
    }
  }

  async function updateBook(id, updatedData) {
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

      loadBooks();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <div>
      <h1>ระบบจัดการหนังสือ</h1>

      <form onSubmit={handleLogin}>
        <input type="email" placeholder="อีเมล" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="รหัสผ่าน" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit">เข้าสู่ระบบ</button>
      </form>
      <p>{loginStatus}</p>

      <hr />

      <form onSubmit={handleAddBook}>
        <input type="text" placeholder="ชื่อหนังสือ" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <input type="text" placeholder="ผู้แต่ง" value={author} onChange={(e) => setAuthor(e.target.value)} required />
        <button type="submit">เพิ่มหนังสือ</button>
      </form>
      <p>{formStatus}</p>

      <hr />

      <p>{status}</p>
      <ul>
        {books.map((book) => (
          <li key={book.id}>
            {book.title} — {book.author}
            <button onClick={() => updateBook(book.id, { title: "ชื่อใหม่", author: book.author })}>
              แก้ไข
            </button>
            <button onClick={() => deleteBook(book.id)}>ลบ</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
```

ตัวอย่างนี้ตัด header `Authorization` ออกจาก `deleteBook`/`updateBook` เพื่อความกระชับ — ถ้า endpoint `/books/:id` ของระบบจริงต้องยืนยันตัวตน ให้เพิ่ม `headers: { Authorization: \`Bearer ${localStorage.getItem("token")}\` }` ตามรูปแบบในหัวข้อ 5.2

รัน `npm run dev` ในโฟลเดอร์ `frontend/` และรัน backend แยก (`node index.js`) พร้อมกันคนละ terminal แล้วเปิดเบราว์เซอร์ไปที่ URL ที่ Vite แสดง (ปกติ `http://localhost:5173`)

---

## 8. Checklist ก่อนส่งงาน

- [ ] เรียก API จริงของระบบโครงงานตนเองอย่างน้อย 3 endpoint ครอบคลุม GET และอย่างน้อย 1 endpoint ที่เปลี่ยนแปลงข้อมูล (POST/PUT/DELETE)
- [ ] ทุกครั้งที่เรียก API มีสถานะ loading ให้ผู้ใช้เห็นระหว่างรอ (เก็บด้วย `useState`)
- [ ] ทุกครั้งที่เรียก API ล้มเหลว (เช่น backend ปิดอยู่ หรือ API ตอบ error) แสดงข้อความที่อ่านเข้าใจ ไม่ใช่หน้าจอค้างเงียบ
- [ ] ฟอร์มรับข้อมูลตรวจสอบความครบถ้วนเบื้องต้นก่อนส่ง (เช่น `required`) และใช้ controlled input (`value` + `onChange`)
- [ ] เปิด CORS ที่ backend แล้ว ทดสอบเปิดหน้าเว็บจริงผ่าน `npm run dev` เห็นข้อมูลจาก API ไม่ใช่แค่ทดสอบผ่าน Postman
- [ ] endpoint ที่ต้องยืนยันตัวตนแนบ header `Authorization: Bearer <token>` ถูกต้อง และจัดการกรณี token หมดอายุ/ไม่ถูกต้อง (`401`) โดยไม่ปล่อยหน้าจอค้าง
- [ ] `useEffect` ที่เรียก API มี dependency array `[]` ไม่เรียกซ้ำไม่รู้จบ
- [ ] แต่ละแถวที่ render ด้วย `.map()` มี `key` prop ที่ไม่ซ้ำกัน (ใช้ `id` จริง ไม่ใช่ index)
- [ ] ถ้ามี DELETE ที่ตอบกลับ `204` ไม่เรียก `.json()` ต่อ (จะ error) และถ้ามี PUT ตรวจว่า URL มี id ต่อท้ายถูกต้อง

## เอกสารอ้างอิงประกอบ

- React — Synchronizing with Effects (useEffect): https://react.dev/learn/synchronizing-with-effects
- React — useState: https://react.dev/reference/react/useState
- Vite — Getting Started: https://vite.dev/guide/
- MDN — Using Fetch: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
- MDN — CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- npm cors: https://www.npmjs.com/package/cors
- สัปดาห์ที่ 6 (Authentication/Authorization ฝั่ง Backend): `wk06.md`
- ตัวอย่างแบบ HTML/CSS/JavaScript ล้วน (ไม่ใช้ framework): [wk15-frontend.md](wk15-frontend.md)
