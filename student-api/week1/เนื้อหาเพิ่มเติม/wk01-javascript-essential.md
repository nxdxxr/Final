# สัปดาห์ที่ 1 (เสริม): พื้นฐาน JavaScript ที่จำเป็นสำหรับการอ่านโค้ด Backend

เอกสารนี้สรุปพื้นฐานภาษา JavaScript ที่จำเป็นต่อการอ่านและทำความเข้าใจโค้ดตัวอย่างในเอกสาร [wk01.md](wk01.md) และ [wk01-lab.md](wk01-lab.md) โดยไม่ได้มุ่งสอนภาษา JavaScript ทั้งหมด แต่คัดเฉพาะไวยากรณ์และแนวคิดที่ปรากฏในโค้ดตัวอย่างของทั้งสองเอกสารเท่านั้น เพื่อให้นิสิตที่มีพื้นฐาน JavaScript ไม่มากสามารถอ่านโค้ด Express ในสัปดาห์นี้ได้อย่างเข้าใจ

---

## 1. การประกาศตัวแปรด้วย `const` และ `let`

JavaScript สมัยใหม่ (ES6 ขึ้นไป) แนะนำให้ประกาศตัวแปรด้วย `const` และ `let` แทนคำสั่ง `var` แบบเดิม

- **`const`** — ใช้ประกาศตัวแปรที่**ไม่มีการกำหนดค่าใหม่**ให้กับตัวแปรนั้นอีกหลังจากประกาศ (ค่าคงที่ในความหมายของการอ้างอิงตัวแปร)
- **`let`** — ใช้ประกาศตัวแปรที่มีการเปลี่ยนแปลงค่าได้ในภายหลัง

```javascript
const express = require("express"); // ค่าไม่เปลี่ยนแปลงตลอดการทำงานของโปรแกรม
const app = express();

let students = [{ id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์" }];
let nextId = 3; // ค่าจะถูกเปลี่ยนแปลงเมื่อมีการเพิ่มข้อมูลใหม่ (ดูหัวข้อ 6.2)
```

ข้อสังเกต: แม้ `students` ประกาศด้วย `let` เพราะตัวแปร (ตัวแปรอ้างอิง array) อาจถูกกำหนดค่าใหม่ทั้งก้อนได้ แต่การเพิ่มสมาชิกเข้าไปใน array ด้วยเมธอด `push()` (ดูหัวข้อ 5) ไม่จำเป็นต้องใช้ `let` ก็ได้ เนื่องจากเป็นการแก้ไขเนื้อหาภายใน ไม่ใช่การกำหนดตัวแปรใหม่

---

## 2. ฟังก์ชันลูกศร (Arrow Function)

Arrow Function เป็นรูปแบบการเขียนฟังก์ชันแบบย่อที่ใช้เป็นมาตรฐานในโค้ด Express สมัยใหม่ ใช้สัญลักษณ์ `=>` แทนคำว่า `function`

```javascript
// รูปแบบฟังก์ชันแบบดั้งเดิม
app.get("/", function (req, res) {
  res.send("ยินดีต้อนรับ");
});

// รูปแบบ Arrow Function (พบในโค้ดตัวอย่างของสัปดาห์นี้)
app.get("/", (req, res) => {
  res.send("ยินดีต้อนรับ");
});
```

ฟังก์ชันในตัวอย่างข้างต้นเรียกว่า **callback function** คือฟังก์ชันที่ถูกส่งเป็นพารามิเตอร์ให้อีกฟังก์ชันหนึ่ง (ในที่นี้คือ `app.get`) เพื่อให้เรียกใช้งานในภายหลัง — ในกรณีนี้คือเมื่อมีคำขอ HTTP เข้ามาที่เส้นทางนั้นจริง ๆ Express จะเป็นผู้เรียก callback function นี้เอง พร้อมส่งค่า `req` (request) และ `res` (response) เข้ามาให้โดยอัตโนมัติ

Arrow Function ที่มีเนื้อหาเพียงบรรทัดเดียวสามารถละวงเล็บปีกกาและคำว่า `return` ได้

```javascript
const double = (n) => n * 2; // เทียบเท่ากับ function(n) { return n * 2; }
```

---

## 3. Template Literals (การสร้างข้อความด้วย backtick)

Template Literals คือการเขียนข้อความ (string) ด้วยเครื่องหมาย backtick (`` ` ``) แทนเครื่องหมายคำพูดเดี่ยวหรือคู่ ทำให้สามารถแทรกค่าตัวแปรลงในข้อความได้โดยตรงด้วยสัญลักษณ์ `${...}` โดยไม่ต้องใช้เครื่องหมาย `+` ต่อข้อความแบบเดิม

```javascript
const studentId = 5;

// วิธีเดิม (string concatenation)
const message1 = "ดึงข้อมูลนิสิตรหัส " + studentId + " สำเร็จ";

// วิธีใช้ Template Literal (พบในโค้ดตัวอย่างของสัปดาห์นี้)
const message2 = `ดึงข้อมูลนิสิตรหัส ${studentId} สำเร็จ`;
```

ตัวอย่างจากเอกสาร wk01.md

```javascript
app.get("/api/v1/students/:id", (req, res) => {
  const studentId = req.params.id;
  res.status(200).json({
    message: `ดึงข้อมูลนิสิตรหัส ${studentId} สำเร็จ`,
    data: { id: Number(studentId), name: "สมชาย ใจดี" },
  });
});
```

Template Literals ยังใช้แทรกค่าตัวแปรลงใน URL ได้เช่นกัน ดังตัวอย่าง

```javascript
console.log(`Server กำลังทำงานที่ http://localhost:${PORT}`);
```

---

## 4. Object Literal และ Object Destructuring

### 4.1 Object Literal

Object ใน JavaScript คือโครงสร้างข้อมูลที่เก็บค่าเป็นคู่ `key: value` เขียนด้วยเครื่องหมายปีกกา `{ }` ใช้แทนข้อมูลที่มีหลายฟิลด์ เช่น ข้อมูลนิสิตหนึ่งคน

```javascript
const student = { id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์" };

console.log(student.name); // เข้าถึงค่าด้วย dot notation ผลลัพธ์คือ "สมชาย ใจดี"
```

Object สามารถซ้อนกันได้ (nested object) ดังที่พบในการตอบกลับ (response) ของ API แทบทุกตัวอย่างในเอกสารทั้งสองฉบับ

```javascript
res.status(200).json({
  message: "สำเร็จ",
  data: { id: 1, name: "สมชาย ใจดี" }, // object ซ้อนอยู่ภายใน object อีกชั้นหนึ่ง
});
```

### 4.2 Object Destructuring

Destructuring คือการดึงค่าจากฟิลด์ใน object ออกมาเก็บในตัวแปรใหม่โดยตรง แทนการเขียน `.` ทีละฟิลด์ พบบ่อยที่สุดในการอ่านข้อมูลจาก `req.body`

```javascript
// วิธีเดิม
const name = req.body.name;
const major = req.body.major;

// วิธีใช้ Destructuring (พบในโค้ดตัวอย่างของสัปดาห์นี้)
const { name, major } = req.body;
```

ตัวอย่างจากเอกสาร wk01-lab.md ที่ใช้ destructuring เพื่ออ่านข้อมูลที่ client ส่งมาพร้อมกับคำขอ `POST`

```javascript
app.post("/api/v1/students", (req, res) => {
  const { name, major } = req.body;

  if (!name || !major) {
    return res
      .status(400)
      .json({ message: "กรุณาระบุ name และ major ให้ครบถ้วน" });
  }

  const newStudent = { id: nextId++, name, major };
  students.push(newStudent);

  res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ", data: newStudent });
});
```

ข้อสังเกตเพิ่มเติม: ในบรรทัด `const newStudent = { id: nextId++, name, major };` ค่า `name` และ `major` ถูกเขียนแบบย่อ ซึ่งเป็นอีกหนึ่งไวยากรณ์ของ Object Literal เรียกว่า **shorthand property** — เมื่อชื่อฟิลด์ใน object ตรงกับชื่อตัวแปรที่มีอยู่แล้วพอดี สามารถเขียนเพียงชื่อตัวแปรครั้งเดียวได้ โดยมีความหมายเทียบเท่ากับ `{ id: nextId++, name: name, major: major }`

---

## 5. เมธอดพื้นฐานของ Array

โค้ดตัวอย่างในเอกสารทั้งสองฉบับเก็บข้อมูลจำลอง (mock data) ไว้ใน array ของ object และใช้เมธอดมาตรฐานของ JavaScript ในการค้นหา เพิ่ม และลบข้อมูล แทนการเชื่อมต่อฐานข้อมูลจริง (ซึ่งจะกล่าวถึงในสัปดาห์ที่ 5)

| เมธอด         | หน้าที่                                                                                       | ตัวอย่างการใช้งานในเอกสาร                |
| ------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `find()`      | ค้นหาสมาชิกตัวแรกใน array ที่ตรงตามเงื่อนไข และคืนค่าสมาชิกนั้น (คืนค่า `undefined` หากไม่พบ) | `students.find((s) => s.id === id)`      |
| `findIndex()` | ค้นหาตำแหน่ง (index) ของสมาชิกตัวแรกที่ตรงตามเงื่อนไข (คืนค่า `-1` หากไม่พบ)                  | `students.findIndex((s) => s.id === id)` |
| `push()`      | เพิ่มสมาชิกใหม่ต่อท้าย array                                                                  | `students.push(newStudent)`              |
| `splice()`    | ลบ (หรือแทรก) สมาชิกใน array ที่ตำแหน่งที่กำหนด                                               | `students.splice(index, 1)`              |

ทุกเมธอดข้างต้นรับ **arrow function** เป็นพารามิเตอร์ (ตามหัวข้อ 2) เพื่อใช้เป็นเงื่อนไขในการเปรียบเทียบแต่ละสมาชิกของ array ทีละตัว

### 5.1 ตัวอย่าง `find()` (จากเอกสาร wk01-lab.md)

```javascript
app.get("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);
  // (s) => s.id === id หมายถึง "ให้ตรวจสอบทีละสมาชิก s ใน array
  // ว่ามีฟิลด์ id เท่ากับค่า id ที่ต้องการหรือไม่"

  if (!student) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  res.status(200).json({ message: "สำเร็จ", data: student });
});
```

### 5.2 ตัวอย่าง `findIndex()` และ `splice()` (จากเอกสาร wk01-lab.md)

```javascript
app.delete("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  students.splice(index, 1); // ลบสมาชิก 1 ตัว เริ่มจากตำแหน่ง index

  res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
});
```

---

## 6. ตัวดำเนินการที่ควรรู้จัก

### 6.1 ตัวดำเนินการเปรียบเทียบแบบเข้มงวด (`===`)

JavaScript มีตัวดำเนินการเปรียบเทียบสองแบบคือ `==` (loose equality) และ `===` (strict equality) ในโค้ด Express ทุกตัวอย่างของสัปดาห์นี้ใช้ `===` เสมอ เนื่องจากเปรียบเทียบทั้งค่าและชนิดข้อมูล (type) โดยไม่มีการแปลงชนิดข้อมูลให้อัตโนมัติ ซึ่งลดโอกาสเกิดข้อผิดพลาดที่คาดไม่ถึง

```javascript
"5" == 5; // true  (แปลงชนิดข้อมูลให้ก่อนเปรียบเทียบ ไม่แนะนำ)
"5" === 5; // false (ชนิดข้อมูลต่างกัน คือ string กับ number)
5 === 5; // true
```

### 6.2 ตัวดำเนินการเพิ่มค่า (`++`)

`nextId++` หมายถึงการนำค่า `nextId` ปัจจุบันไปใช้งานก่อน แล้วจึงเพิ่มค่าของ `nextId` ขึ้นอีก 1 หลังจากนั้น (เรียกว่า post-increment) พบในเอกสาร wk01-lab.md เพื่อจำลองการสร้าง `id` อัตโนมัติให้ข้อมูลใหม่แต่ละรายการ

```javascript
let nextId = 3;
const newStudent = { id: nextId++, name, major };
// newStudent.id ได้ค่า 3 และหลังจากนี้ nextId จะกลายเป็น 4
```

### 6.3 ตัวดำเนินการ Logical NOT (`!`) และ Logical OR (`||`)

`!` ใช้ตรวจสอบค่าตรงข้าม (negation) มักใช้ตรวจสอบว่าตัวแปรมีค่าหรือไม่ (falsy check) ส่วน `||` ใช้กำหนดค่าเริ่มต้น (default value) เมื่อค่าทางซ้ายเป็นค่าที่ถือว่า "ว่าง" (falsy) เช่น `undefined`, `null`, หรือ `""`

```javascript
// !name เป็นจริงเมื่อ name เป็นค่าว่าง เช่น undefined หรือ "" หรือ null
if (!name) {
  return res.status(400).json({ message: "กรุณาระบุชื่อนิสิต" });
}

// หากไม่มีการส่ง query string "page" มา ให้ใช้ค่าเริ่มต้นเป็น 1
const page = req.query.page || 1;
```

---

## 7. ฟังก์ชัน `Number()` และการแปลงชนิดข้อมูล

ค่าที่ได้จาก `req.params` และ `req.query` ใน Express จะเป็นชนิดข้อมูล **string** เสมอ แม้จะดูเป็นตัวเลขก็ตาม (เช่น URL `/students/5` ค่า `req.params.id` จะเป็น string `"5"` ไม่ใช่ number `5`) จึงจำเป็นต้องแปลงเป็นชนิดข้อมูล number ด้วยฟังก์ชัน `Number()` ก่อนนำไปเปรียบเทียบด้วย `===` กับค่าตัวเลขใน array

```javascript
// ตัวอย่างจากเอกสาร wk01-lab.md
app.get("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id); // แปลง string "5" ให้เป็น number 5
  const student = students.find((s) => s.id === id);
  // หากไม่แปลงชนิดข้อมูลก่อน จะเปรียบเทียบ number กับ string
  // ด้วย === แล้วได้ผลลัพธ์ false เสมอ แม้ค่าตัวเลขจะตรงกันก็ตาม
  ...
});
```

---

## 8. โมดูล: `require` และ `module.exports`

Node.js แบ่งโค้ดออกเป็นไฟล์ย่อยที่เรียกว่า **โมดูล (module)** โดยใช้คำสั่ง `require()` เพื่อนำเข้าโมดูล และ `module.exports` เพื่อส่งออกค่าจากไฟล์หนึ่งให้ไฟล์อื่นเรียกใช้งานได้ ดังที่ใช้ในการแยก route ด้วย `express.Router()` ตามที่กล่าวถึงในเอกสาร wk01.md หัวข้อ 4.4

ไฟล์ `routes/students.js` (ไฟล์ที่ส่งออกค่า)

```javascript
const express = require("express"); // นำเข้าไลบรารี express ที่ติดตั้งไว้
const router = express.Router();

router.get("/", (req, res) => {
  res.status(200).json({ message: "รายการนิสิตทั้งหมด" });
});

module.exports = router; // ส่งออกตัวแปร router ให้ไฟล์อื่นนำไปใช้ได้
```

ไฟล์ `index.js` (ไฟล์ที่นำเข้าค่า)

```javascript
const express = require("express");
const studentRoutes = require("./routes/students"); // นำเข้าค่าที่ส่งออกจากไฟล์ students.js
// เครื่องหมาย "./" หมายถึงไฟล์อยู่ในโฟลเดอร์เดียวกันหรือโฟลเดอร์ย่อยของไฟล์ปัจจุบัน

const app = express();
app.use("/api/v1/students", studentRoutes);
```

หลักการสำคัญ: หาก `require()` ไม่มี `./` นำหน้า (เช่น `require("express")`) หมายถึงการนำเข้าไลบรารีที่ติดตั้งไว้ในโฟลเดอร์ `node_modules` แต่หากมี `./` หรือ `../` นำหน้า หมายถึงการนำเข้าไฟล์ที่เขียนขึ้นเองภายในโปรเจกต์

---

## 9. Method Chaining: การเรียกเมธอดต่อกันเป็นทอด

โค้ด Express เรียกเมธอดของ object ต่อกันเป็นทอด (chaining) บ่อยครั้ง ซึ่งทำได้เพราะเมธอดแต่ละตัวคืนค่า object ที่มีเมธอดต่อไปให้เรียกใช้ได้อีก

```javascript
res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ", data: newStudent });
```

จากตัวอย่างข้างต้น การทำงานแบ่งเป็น 2 ขั้นตอนที่เขียนต่อกันในบรรทัดเดียว

1. `res.status(201)` — กำหนดค่า HTTP Status Code เป็น `201` และคืนค่า `res` กลับมาอีกครั้ง เพื่อให้เรียกเมธอดถัดไปต่อได้
2. `.json({ ... })` — แปลง object ที่ระบุให้เป็นรูปแบบ JSON และส่งเป็น body ของ response กลับไปยัง client

หากเขียนแยกเป็นสองบรรทัดจะได้ผลลัพธ์เดียวกัน

```javascript
res.status(201);
res.json({ message: "เพิ่มข้อมูลสำเร็จ", data: newStudent });
```

---

## 10. คำสั่ง `return` ในบริบทของ Express Route Handler

ในฟังก์ชัน route handler ของ Express คำสั่ง `return` มีบทบาทสำคัญมากกว่าการ "คืนค่า" ตามความหมายทั่วไปของฟังก์ชัน เพราะทำหน้าที่**หยุดการทำงานของฟังก์ชันทันที** เพื่อป้องกันไม่ให้โค้ดส่วนถัดไปทำงานต่อ (และป้องกันไม่ให้เกิดข้อผิดพลาดจากการเรียก `res.json()` ซ้ำสองครั้งในคำขอเดียว)

```javascript
app.post("/api/v1/students", (req, res) => {
  const { name, major } = req.body;

  if (!name || !major) {
    // หากไม่มี return ฟังก์ชันจะทำงานต่อไปถึงโค้ดด้านล่าง
    // ทำให้เกิดการเรียก res.json() ซ้ำสองครั้ง ซึ่ง Express จะแจ้งข้อผิดพลาด
    return res
      .status(400)
      .json({ message: "กรุณาระบุ name และ major ให้ครบถ้วน" });
  }

  const newStudent = { id: nextId++, name, major };
  students.push(newStudent);

  res.status(201).json({ message: "เพิ่มข้อมูลสำเร็จ", data: newStudent });
});
```

จากตัวอย่างข้างต้น หาก `name` หรือ `major` ไม่ถูกส่งมา ฟังก์ชันจะตอบกลับด้วย Status Code `400` และหยุดทำงานทันทีที่คำสั่ง `return` โดยไม่ไปถึงบรรทัด `res.status(201)` ด้านล่าง

---

## 11. สรุปคำศัพท์และไวยากรณ์ที่ควรจำ

| ไวยากรณ์ / แนวคิด                   | ความหมายโดยย่อ                                       |
| ----------------------------------- | ---------------------------------------------------- | -------- | --------------------------------- |
| `const` / `let`                     | ประกาศตัวแปรที่ไม่เปลี่ยนค่า / เปลี่ยนค่าได้         |
| `(req, res) => { ... }`             | Arrow Function ที่ใช้เป็น callback ของ route handler |
| `` `ข้อความ ${ตัวแปร}` ``           | Template Literal สำหรับแทรกค่าตัวแปรลงในข้อความ      |
| `{ key: value }`                    | Object Literal สำหรับเก็บข้อมูลหลายฟิลด์             |
| `const { name, major } = req.body;` | Object Destructuring ดึงค่าฟิลด์ออกมาเป็นตัวแปร      |
| `array.find(callback)`              | ค้นหาสมาชิกตัวแรกที่ตรงเงื่อนไข                      |
| `array.findIndex(callback)`         | ค้นหาตำแหน่งของสมาชิกตัวแรกที่ตรงเงื่อนไข            |
| `array.push(item)`                  | เพิ่มสมาชิกต่อท้าย array                             |
| `array.splice(index, count)`        | ลบสมาชิกออกจาก array ตามตำแหน่งที่กำหนด              |
| `===`                               | เปรียบเทียบค่าและชนิดข้อมูลแบบเข้มงวด                |
| `nextId++`                          | ใช้ค่าปัจจุบันก่อน แล้วจึงเพิ่มค่าอีก 1              |
| `!value` / `value                   |                                                      | default` | ตรวจสอบค่าว่าง / กำหนดค่าเริ่มต้น |
| `Number(value)`                     | แปลงชนิดข้อมูลจาก string เป็น number                 |
| `require()` / `module.exports`      | นำเข้า / ส่งออกโมดูลระหว่างไฟล์                      |
| `res.status(code).json(obj)`        | Method Chaining เรียกเมธอดต่อกันเป็นทอด              |
| `return res.status(...).json(...)`  | หยุดการทำงานของฟังก์ชันทันทีพร้อมส่ง response กลับ   |

ความเข้าใจในไวยากรณ์และแนวคิดทั้ง 11 หัวข้อข้างต้นเพียงพอสำหรับการอ่านและปรับแก้โค้ดตัวอย่างทั้งหมดในเอกสาร wk01.md และ wk01-lab.md รวมถึงเป็นพื้นฐานสำหรับการอ่านโค้ด Express ในสัปดาห์ถัดไปของรายวิชานี้

---

## เอกสารอ้างอิง (Reference)

1. MDN Web Docs. _JavaScript Guide_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide
2. MDN Web Docs. _Array.prototype.find()_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
3. MDN Web Docs. _Destructuring assignment_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Destructuring_assignment
4. Node.js Documentation. _Modules: CommonJS modules_. สืบค้นจาก https://nodejs.org/docs/latest/api/modules.html
5. Express.js Official Documentation. สืบค้นจาก https://expressjs.com
