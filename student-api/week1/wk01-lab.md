# ปฏิบัติการสัปดาห์ที่ 1: สร้าง REST API เบื้องต้นด้วย Node.js และ Express

## วัตถุประสงค์ของปฏิบัติการ

เมื่อทำปฏิบัติการนี้เสร็จสิ้น นิสิตจะสามารถ

1. ติดตั้งและตั้งค่าสภาพแวดล้อมการพัฒนา (development environment) สำหรับ Node.js และ Express ได้ด้วยตนเอง
2. สร้างโครงสร้างโปรเจกต์ (skeleton) ที่รองรับการทำงานแบบ CRUD (Create, Read, Update, Delete) ได้
3. ทดสอบการทำงานของ API ด้วยเครื่องมือ Postman ได้อย่างถูกต้อง
4. ตรวจสอบและอธิบายโครงสร้างโปรเจกต์ของตนเองได้

ปฏิบัติการนี้ต่อยอดจากเนื้อหาบรรยายในเอกสาร `wk01.md` และเป็นส่วนหนึ่งของการประเมินผล CLO1 (ใบงานส่งสัปดาห์ที่ 1) ตามที่กำหนดไว้ใน `course_plan.md`

## เวลาที่ใช้

ปฏิบัติการนี้ใช้เวลารวม 2 ชั่วโมง แบ่งเป็น

| ช่วงเวลา    | กิจกรรม                                        |
| ----------- | ---------------------------------------------- |
| 0-15 นาที   | ติดตั้งสภาพแวดล้อมการพัฒนา (Environment Setup) |
| 15-90 นาที  | สร้าง Skeleton CRUD และทดสอบด้วย Postman       |
| 90-120 นาที | ตรวจสอบโครงสร้างโปรเจกต์ (Review Structure)    |

## เครื่องมือที่ต้องใช้

1. Node.js เวอร์ชัน LTS (แนะนำเวอร์ชัน 18 ขึ้นไป)
2. โปรแกรมแก้ไขโค้ด เช่น Visual Studio Code
3. Postman สำหรับทดสอบ API
4. Terminal หรือ Command Prompt

---

## ส่วนที่ 1: ติดตั้งสภาพแวดล้อมการพัฒนา (0-15 นาที)

### ขั้นตอนที่ 1.1 ตรวจสอบการติดตั้ง Node.js

เปิด Terminal และตรวจสอบเวอร์ชันของ Node.js และ npm

```bash
node -v
npm -v
```

หากยังไม่ได้ติดตั้ง ให้ดาวน์โหลดและติดตั้งจากเว็บไซต์ทางการของ Node.js (เวอร์ชัน LTS) ก่อนดำเนินการต่อ

### ขั้นตอนที่ 1.2 สร้างโฟลเดอร์โปรเจกต์

```bash
mkdir student-api
cd student-api
npm init -y
```

คำสั่งข้างต้นจะสร้างไฟล์ `package.json` ซึ่งเป็นไฟล์ตั้งค่าหลักของโปรเจกต์

### ขั้นตอนที่ 1.3 ติดตั้งไลบรารีที่จำเป็น

```bash
npm install express
npm install --save-dev nodemon
```

### ขั้นตอนที่ 1.4 ตั้งค่า script สำหรับรันโปรเจกต์

เปิดไฟล์ `package.json` และแก้ไขส่วน `scripts` ดังนี้

```json
{
  "name": "student-api",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  }
}
```

### จุดตรวจสอบที่ 1

ก่อนดำเนินการต่อในส่วนถัดไป ให้ตรวจสอบว่า

- คำสั่ง `node -v` และ `npm -v` แสดงหมายเลขเวอร์ชันได้ถูกต้อง
- โฟลเดอร์ `student-api` มีไฟล์ `package.json` และโฟลเดอร์ `node_modules`
- ไฟล์ `package.json` มี `express` อยู่ในส่วน `dependencies` และมี `nodemon` อยู่ในส่วน `devDependencies`

---

## ส่วนที่ 2: สร้าง Skeleton CRUD และทดสอบด้วย Postman (15-90 นาที)

### ขั้นตอนที่ 2.1 สร้างไฟล์เริ่มต้นของเซิร์ฟเวอร์

สร้างไฟล์ `index.js` ในโฟลเดอร์หลักของโปรเจกต์

```javascript
const express = require("express");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({ message: "Student API พร้อมใช้งาน" });
});

app.listen(PORT, () => {
  console.log(`Server กำลังทำงานที่ http://localhost:${PORT}`);
});
```

รันเซิร์ฟเวอร์ด้วยคำสั่ง

```bash
npm run dev
```

เปิดเว็บเบราว์เซอร์และเข้าไปที่ `http://localhost:3000` เพื่อตรวจสอบว่าเซิร์ฟเวอร์ทำงานถูกต้อง ควรเห็นข้อความ `{"message":"Student API พร้อมใช้งาน"}`

### ขั้นตอนที่ 2.2 สร้างข้อมูลจำลอง (Mock Data)

ในสัปดาห์นี้ยังไม่มีการเชื่อมต่อฐานข้อมูลจริง (จะกล่าวถึงในสัปดาห์ที่ 5) จึงใช้ข้อมูลจำลองที่เก็บไว้ในหน่วยความจำ (in-memory) ไปก่อน เพิ่มโค้ดต่อไปนี้ในไฟล์ `index.js` เหนือส่วน `app.listen`

```javascript
let students = [
  { id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์" },
  { id: 2, name: "สมหญิง รักเรียน", major: "เทคโนโลยีสารสนเทศ" },
];
let nextId = 3;
```

### ขั้นตอนที่ 2.3 สร้าง Route สำหรับ CRUD ครบทั้ง 5 เส้นทาง

เพิ่มโค้ดต่อไปนี้ในไฟล์ `index.js` ต่อจากส่วนข้อมูลจำลอง

```javascript
// 1. GET: ดึงรายการนิสิตทั้งหมด
app.get("/api/v1/students", (req, res) => {
  res.status(200).json({ message: "สำเร็จ", data: students });
});

// 2. GET: ดึงข้อมูลนิสิตรายบุคคลตาม id
app.get("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  res.status(200).json({ message: "สำเร็จ", data: student });
});

// 3. POST: เพิ่มข้อมูลนิสิตใหม่
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

// 4. PUT: แก้ไขข้อมูลนิสิตทั้งระเบียน
app.put("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const { name, major } = req.body;
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  if (!name || !major) {
    return res
      .status(400)
      .json({ message: "กรุณาระบุ name และ major ให้ครบถ้วน" });
  }

  student.name = name;
  student.major = major;

  res.status(200).json({ message: "แก้ไขข้อมูลสำเร็จ", data: student });
});

// 5. DELETE: ลบข้อมูลนิสิต
app.delete("/api/v1/students/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = students.findIndex((s) => s.id === id);

  if (index === -1) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  students.splice(index, 1);

  res.status(200).json({ message: "ลบข้อมูลสำเร็จ" });
});
```

บันทึกไฟล์ เนื่องจากใช้ `nodemon` เซิร์ฟเวอร์จะรีสตาร์ตให้อัตโนมัติ

### ขั้นตอนที่ 2.4 ทดสอบ API ด้วย Postman

เปิดโปรแกรม Postman และทดสอบตามลำดับต่อไปนี้ เพื่อจำลองการใช้งานจริงตั้งแต่ดูข้อมูล เพิ่มข้อมูล แก้ไข และลบ

**การทดสอบที่ 1: ดึงรายการนิสิตทั้งหมด**

- Method: `GET`
- URL: `http://localhost:3000/api/v1/students`
- ผลลัพธ์ที่คาดหวัง: Status Code `200` พร้อมรายการนิสิต 2 คนตามข้อมูลจำลอง

**การทดสอบที่ 2: เพิ่มข้อมูลนิสิตใหม่**

- Method: `POST`
- URL: `http://localhost:3000/api/v1/students`
- Headers: `Content-Type: application/json`
- Body (raw, JSON):

```json
{
  "name": "วิชัย ตั้งใจเรียน",
  "major": "วิศวกรรมซอฟต์แวร์"
}
```

- ผลลัพธ์ที่คาดหวัง: Status Code `201` พร้อมข้อมูลนิสิตใหม่ที่มี `id` เป็น `3`

**การทดสอบที่ 3: ดึงข้อมูลนิสิตรายบุคคล**

- Method: `GET`
- URL: `http://localhost:3000/api/v1/students/3`
- ผลลัพธ์ที่คาดหวัง: Status Code `200` พร้อมข้อมูลของ "วิชัย ตั้งใจเรียน"

**การทดสอบที่ 4: แก้ไขข้อมูลนิสิต**

- Method: `PUT`
- URL: `http://localhost:3000/api/v1/students/3`
- Headers: `Content-Type: application/json`
- Body (raw, JSON):

```json
{
  "name": "วิชัย ตั้งใจเรียน",
  "major": "วิทยาการข้อมูล"
}
```

- ผลลัพธ์ที่คาดหวัง: Status Code `200` พร้อมข้อมูล `major` ที่เปลี่ยนเป็น "วิทยาการข้อมูล"

**การทดสอบที่ 5: ลบข้อมูลนิสิต**

- Method: `DELETE`
- URL: `http://localhost:3000/api/v1/students/3`
- ผลลัพธ์ที่คาดหวัง: Status Code `200` พร้อมข้อความยืนยันการลบ

**การทดสอบที่ 6: ทดสอบกรณีไม่พบข้อมูล**

- Method: `GET`
- URL: `http://localhost:3000/api/v1/students/999`
- ผลลัพธ์ที่คาดหวัง: Status Code `404` พร้อมข้อความ "ไม่พบข้อมูลนิสิต"

### จุดตรวจสอบที่ 2

ก่อนดำเนินการต่อในส่วนถัดไป ให้ตรวจสอบว่า

- ทดสอบครบทั้ง 6 กรณีข้างต้น และได้ Status Code ตรงตามที่คาดหวังทุกกรณี
- เมื่อส่งข้อมูลไม่ครบ (เช่น ไม่ส่ง `name`) ในคำขอ POST หรือ PUT ระบบตอบกลับด้วย Status Code `400`
- บันทึกผลการทดสอบ (สามารถใช้ฟีเจอร์ Collection ของ Postman บันทึกคำขอทั้งหมดไว้เพื่อใช้ตรวจสอบภายหลัง)

---

## ส่วนที่ 3: ตรวจสอบโครงสร้างโปรเจกต์ (90-120 นาที)

### ขั้นตอนที่ 3.1 ตรวจสอบโครงสร้างไฟล์

ตรวจสอบว่าโครงสร้างโปรเจกต์ปัจจุบันมีลักษณะดังนี้

```
student-api/
├── node_modules/
├── package.json
├── package-lock.json
└── index.js
```

### ขั้นตอนที่ 3.2 ทบทวนคุณภาพของโค้ด

พิจารณาคำถามต่อไปนี้ร่วมกับเพื่อนในชั้นเรียนหรือผู้สอน (Peer Review เบื้องต้น)

1. โค้ดใน `index.js` มีการตรวจสอบข้อมูลนำเข้า (validation) ก่อนประมวลผลหรือไม่
2. ทุก route มีการตอบกลับด้วย Status Code ที่เหมาะสมกับผลลัพธ์หรือไม่
3. โครงสร้างโค้ดในไฟล์เดียวยังอ่านง่ายอยู่หรือไม่ หากมี route เพิ่มขึ้นอีก 10 เส้นทาง จะเกิดปัญหาใดตามมา

### ขั้นตอนที่ 3.3 เตรียมพร้อมสำหรับสัปดาห์ถัดไป

ข้อสังเกตจากคำถามข้อ 3 ในขั้นตอนที่ 3.2 คือเหตุผลสำคัญที่ในทางปฏิบัติจริงจะมีการแยกโค้ดออกเป็นโมดูลย่อยด้วย `express.Router()` ตามที่กล่าวถึงในเอกสารบรรยาย (`wk01.md` หัวข้อที่ 4.4) และจะนำไปใช้ต่อเนื่องในสัปดาห์ถัดไปเมื่อเริ่มออกแบบ URI Schema ตามหลัก RESTful

---

## ส่วนต่อยอด: แบบฝึกหัดเพิ่มเติมด้วยตนเอง

ส่วนนี้เป็นแบบฝึกหัดสำหรับนิสิตฝึกฝนเพิ่มเติมนอกเวลาปฏิบัติการ เพื่อเสริมความเข้าใจให้ลึกซึ้งยิ่งขึ้น

### แบบฝึกหัดที่ 1: แยกโครงสร้างด้วย Router

ปรับโครงสร้างโปรเจกต์จากขั้นตอนที่ 2 โดยย้าย route ทั้งหมดของ `/api/v1/students` ไปไว้ในไฟล์แยกต่างหาก ตามโครงสร้างต่อไปนี้

```
student-api/
├── node_modules/
├── routes/
│   └── students.js
├── package.json
├── package-lock.json
└── index.js
```

โดยไฟล์ `index.js` ควรเหลือเพียงการตั้งค่าเซิร์ฟเวอร์และการเรียกใช้ router เท่านั้น

### แบบฝึกหัดที่ 2: เพิ่ม Resource ใหม่

เพิ่ม resource ใหม่ชื่อ `courses` (รายวิชา) ที่มีคุณสมบัติ `id`, `courseCode` และ `courseName` โดยให้มี route ครบทั้ง 5 เส้นทางเช่นเดียวกับ `students` ได้แก่

- `GET /api/v1/courses`
- `GET /api/v1/courses/:id`
- `POST /api/v1/courses`
- `PUT /api/v1/courses/:id`
- `DELETE /api/v1/courses/:id`

### แบบฝึกหัดที่ 3: เพิ่มการรองรับ Query String

ปรับปรุง route `GET /api/v1/students` ให้รองรับการกรองข้อมูลตาม `major` ผ่าน query string เช่น

```
GET /api/v1/students?major=วิทยาการคอมพิวเตอร์
```

โดยหากมีการระบุ query string `major` ให้แสดงเฉพาะนิสิตที่มี `major` ตรงกับค่าที่ระบุเท่านั้น หากไม่ระบุ ให้แสดงข้อมูลทั้งหมดตามปกติ

### แบบฝึกหัดที่ 4: ปรับปรุงการตรวจสอบข้อมูล

ปรับปรุง route `POST /api/v1/students` ให้ตรวจสอบเพิ่มเติมว่า

- `name` ต้องเป็นข้อความที่มีความยาวอย่างน้อย 2 ตัวอักษร
- หากมีนิสิตชื่อซ้ำกับข้อมูลที่มีอยู่แล้ว ให้ตอบกลับด้วย Status Code `409` (Conflict) พร้อมข้อความแจ้งเตือน

### เกณฑ์การประเมินแบบฝึกหัดต่อยอด (สำหรับนิสิตใช้ตรวจสอบตนเอง)

| รายการ         | ผ่านเกณฑ์เมื่อ                                                                                              |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| แบบฝึกหัดที่ 1 | โค้ดใน `index.js` ไม่มีการนิยาม route ของ students โดยตรง และ API ยังทำงานได้ครบทุกเส้นทางเช่นเดิม          |
| แบบฝึกหัดที่ 2 | ทดสอบ CRUD ครบทั้ง 5 เส้นทางของ `courses` ผ่าน Postman ได้ผลลัพธ์ถูกต้องตาม Status Code ที่เหมาะสม          |
| แบบฝึกหัดที่ 3 | เมื่อระบุ query string `major` ผลลัพธ์ที่ได้กรองข้อมูลถูกต้อง และเมื่อไม่ระบุ ผลลัพธ์แสดงข้อมูลครบทุกรายการ |
| แบบฝึกหัดที่ 4 | ส่งชื่อซ้ำแล้วได้ Status Code `409` และส่งชื่อสั้นกว่า 2 ตัวอักษรแล้วได้ Status Code `400`                  |

หมายเหตุ: แบบฝึกหัดต่อยอดนี้เป็นการเตรียมความพร้อมสำหรับเนื้อหาสัปดาห์ที่ 2 (Web Services Standards) และสัปดาห์ที่ 3 (RESTful Design & URI Schema) ซึ่งจะกล่าวถึงหลักการออกแบบ API อย่างเป็นมาตรฐานโดยละเอียดต่อไป
