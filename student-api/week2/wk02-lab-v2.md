# ปฏิบัติการสัปดาห์ที่ 2 : เปรียบเทียบ REST และ GraphQL พร้อมตัวอย่าง CRUD

## วัตถุประสงค์ของปฏิบัติการ

เมื่อทำปฏิบัติการนี้เสร็จสิ้น นิสิตจะสามารถ

1. สร้าง endpoint แบบ REST และแบบ GraphQL สำหรับข้อมูลชุดเดียวกันได้
2. เปรียบเทียบจำนวนคำขอ (request) และปริมาณข้อมูลที่ได้รับกลับระหว่าง REST และ GraphQL ได้ด้วยตนเอง
3. เขียน GraphQL Query เพื่อเลือกเฉพาะฟิลด์ข้อมูลที่ต้องการได้
4. อธิบายปัญหา over-fetching และ under-fetching จากผลการทดลองจริงที่ตนเองสร้างขึ้น
5. เขียน GraphQL Query ที่มีการกรอง (filter), การเรียงลำดับ (sort), อาร์กิวเมนต์ (argument) และการดึงข้อมูลแบบซ้อน (nested query) ได้หลากหลายรูปแบบ
6. เขียน GraphQL Mutation เพื่อสร้าง แก้ไข และลบข้อมูลได้ครบตามหลักการ CRUD

ปฏิบัติการนี้ต่อยอดจากเนื้อหาบรรยายในเอกสาร `wk02.md` และต่อเนื่องจากโครงสร้างโปรเจกต์ `student-api` ที่สร้างไว้ในปฏิบัติการสัปดาห์ที่ 1 (`wk01-lab.md`) เป็นส่วนหนึ่งของการประเมินผล CLO1 (ใบงานส่งสัปดาห์ที่ 2) ตามที่กำหนดไว้ใน `course_plan.md`

## เวลาที่ใช้

| ช่วงเวลา     | กิจกรรม                                                       |
| ------------ | ------------------------------------------------------------- |
| 0-15 นาที    | ทบทวนเนื้อหาสัปดาห์ที่ 1 (Review W1)                          |
| 15-90 นาที   | เปรียบเทียบ REST กับ GraphQL ด้วยตัวอย่างจริง                 |
| 90-120 นาที  | ทดลองสร้าง Query แบบ GraphQL เทียบกับ REST endpoint           |
| 120-150 นาที | ฝึกใช้งาน GraphQL แบบ CRUD ให้ครบถ้วน (เน้น Query หลายรูปแบบ) |

## เครื่องมือที่ต้องใช้

1. โปรเจกต์ `student-api` จากปฏิบัติการสัปดาห์ที่ 1
2. Node.js และ npm
3. Postman
4. ไลบรารี `express-graphql` และ `graphql`

---

## ส่วนที่ 1: ทบทวนเนื้อหาสัปดาห์ที่ 1 (0-15 นาที)

### ขั้นตอนที่ 1.1 ตรวจสอบโปรเจกต์เดิม

เปิดโฟลเดอร์ `student-api` ที่สร้างไว้ในสัปดาห์ที่แล้ว และตรวจสอบว่ายังสามารถรันเซิร์ฟเวอร์ได้ปกติ

```bash
cd student-api
npm run dev
```

ทดสอบเรียก `GET http://localhost:3000/api/v1/students` ด้วย Postman เพื่อยืนยันว่า route เดิมยังทำงานถูกต้อง

### ขั้นตอนที่ 1.2 ทบทวนแนวคิดสำคัญ

ก่อนเริ่มปฏิบัติการ ให้ทบทวนหัวข้อต่อไปนี้จากเอกสารบรรยาย `wk02.md` ร่วมกัน

1. REST คืออะไร และมีข้อจำกัดใดบ้างเมื่อ client ต้องการข้อมูลที่ซับซ้อน
2. GraphQL แก้ปัญหา over-fetching และ under-fetching ได้อย่างไร
3. โครงสร้างของ GraphQL Schema ประกอบด้วยอะไรบ้าง

### จุดตรวจสอบที่ 1

- เซิร์ฟเวอร์จากสัปดาห์ที่ 1 รันได้โดยไม่มีข้อผิดพลาด
- สามารถอธิบายความแตกต่างระหว่าง REST และ GraphQL ได้อย่างน้อย 2 ประเด็นก่อนเริ่มลงมือปฏิบัติ

---

## ส่วนที่ 2: เปรียบเทียบ REST กับ GraphQL ด้วยตัวอย่างจริง (15-90 นาที)

### ขั้นตอนที่ 2.1 ขยายข้อมูลจำลองให้มีความสัมพันธ์ระหว่างข้อมูล

แก้ไขไฟล์ `index.js` ในส่วนข้อมูลจำลอง ให้เพิ่มข้อมูลรายวิชาและเชื่อมโยงกับนิสิต เพื่อจำลองสถานการณ์ที่ข้อมูลมีความสัมพันธ์กัน (nested data) ซึ่งเป็นกรณีที่มักเกิดปัญหา under-fetching ใน REST

```javascript
let students = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    email: "somchai@example.com",
    phone: "080-000-0001",
    courseIds: [101, 102],
  },
  {
    id: 2,
    name: "สมหญิง รักเรียน",
    major: "เทคโนโลยีสารสนเทศ",
    email: "somying@example.com",
    phone: "080-000-0002",
    courseIds: [102],
  },
];

let courses = [
  { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
  { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];
```

### ขั้นตอนที่ 2.2 สร้าง REST Endpoint สำหรับข้อมูลที่มีความสัมพันธ์กัน

เพิ่ม route ต่อไปนี้ในไฟล์ `index.js` เพื่อคืนข้อมูลนิสิตพร้อมรายวิชาที่ลงทะเบียน

```javascript
app.get("/api/v1/students/:id/full", (req, res) => {
  const id = Number(req.params.id);
  const student = students.find((s) => s.id === id);

  if (!student) {
    return res.status(404).json({ message: "ไม่พบข้อมูลนิสิต" });
  }

  const studentCourses = courses.filter((c) =>
    student.courseIds.includes(c.id),
  );

  res.status(200).json({
    message: "สำเร็จ",
    data: { ...student, courses: studentCourses },
  });
});
```

### ขั้นตอนที่ 2.3 ทดสอบและสังเกตปัญหา Over-fetching ด้วย Postman

ทดสอบ `GET http://localhost:3000/api/v1/students/1/full` ด้วย Postman แล้วสังเกตผลลัพธ์

```json
{
  "message": "สำเร็จ",
  "data": {
    "id": 1,
    "name": "สมชาย ใจดี",
    "major": "วิทยาการคอมพิวเตอร์",
    "email": "somchai@example.com",
    "phone": "080-000-0001",
    "courseIds": [101, 102],
    "courses": [
      { "id": 101, "courseName": "การเขียนโปรแกรมเบื้องต้น", "credit": 3 },
      { "id": 102, "courseName": "โครงสร้างข้อมูล", "credit": 3 }
    ]
  }
}
```

**ข้อสังเกต (Over-fetching):** สมมติว่าหน้าจอที่ต้องการแสดงผลต้องการเพียง `name` และรายชื่อ `courseName` เท่านั้น แต่ระบบ REST ข้างต้นคืนค่าฟิลด์อื่นที่ไม่จำเป็น เช่น `email`, `phone`, `courseIds` มาด้วยทุกครั้ง นี่คือปัญหา over-fetching ที่กล่าวถึงในเอกสารบรรยาย

### ขั้นตอนที่ 2.4 สังเกตปัญหา Under-fetching

ทดลองใช้ endpoint เดิมจากสัปดาห์ที่ 1 คือ `GET /api/v1/students/1` (ที่ยังไม่มีข้อมูลรายวิชาผูกมาด้วย) และสังเกตว่าหากต้องการทราบชื่อรายวิชาที่นิสิตคนนี้ลงทะเบียน จะต้องเรียกคำขอเพิ่มเติมไปที่ `GET /api/v1/courses/101` และ `GET /api/v1/courses/102` แยกต่างหาก รวมเป็น 3 คำขอ เพื่อให้ได้ข้อมูลครบตามที่ต้องการ นี่คือปัญหา under-fetching

**บันทึกผลการสังเกต:** ให้จดจำนวนคำขอ (request) ที่ต้องใช้ในแต่ละแนวทาง เพื่อนำไปเปรียบเทียบกับ GraphQL ในส่วนถัดไป

### จุดตรวจสอบที่ 2

- ทดสอบ endpoint `/api/v1/students/:id/full` สำเร็จ และได้ผลลัพธ์ครบตามโครงสร้างที่กำหนด
- สามารถระบุฟิลด์ที่เป็นตัวอย่างของ over-fetching ได้อย่างน้อย 2 ฟิลด์
- สามารถอธิบายจำนวนคำขอที่ต้องใช้เพื่อให้ได้ข้อมูลครบถ้วนในกรณี under-fetching

---

## ส่วนที่ 3: ทดลองสร้าง Query แบบ GraphQL เทียบกับ REST Endpoint (90-120 นาที)

### ขั้นตอนที่ 3.1 ติดตั้งไลบรารีที่จำเป็น

```bash
npm install express-graphql graphql
```

### ขั้นตอนที่ 3.2 สร้าง GraphQL Schema

สร้างไฟล์ใหม่ชื่อ `schema.js`

```javascript
const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Course {
    id: ID!
    courseName: String!
    credit: Int!
  }

  type Student {
    id: ID!
    name: String!
    major: String!
    email: String!
    phone: String!
    courses: [Course!]!
  }

  type Query {
    student(id: ID!): Student
    students: [Student!]!
  }
`);

module.exports = schema;
```

### ขั้นตอนที่ 3.3 สร้าง Resolver

Resolver คือฟังก์ชันที่กำหนดวิธีการดึงข้อมูลจริงเมื่อมีการเรียก Query แต่ละประเภท สร้างไฟล์ `resolvers.js`

```javascript
let students = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    email: "somchai@example.com",
    phone: "080-000-0001",
    courseIds: [101, 102],
  },
  {
    id: 2,
    name: "สมหญิง รักเรียน",
    major: "เทคโนโลยีสารสนเทศ",
    email: "somying@example.com",
    phone: "080-000-0002",
    courseIds: [102],
  },
];

let courses = [
  { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
  { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];

function resolveStudent(student) {
  return {
    ...student,
    courses: courses.filter((c) => student.courseIds.includes(c.id)),
  };
}

const root = {
  student: ({ id }) => {
    const student = students.find((s) => s.id === Number(id));
    return student ? resolveStudent(student) : null;
  },
  students: () => students.map(resolveStudent),
};

module.exports = root;
```

### ขั้นตอนที่ 3.4 เชื่อมต่อ GraphQL เข้ากับ Express

แก้ไขไฟล์ `index.js` เพิ่มส่วนต่อไปนี้

```javascript
const { graphqlHTTP } = require("express-graphql");
const schema = require("./schema");
const root = require("./resolvers");

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true, // เปิดใช้งานหน้าทดสอบ GraphiQL ผ่านเบราว์เซอร์
  }),
);
```

รันเซิร์ฟเวอร์ใหม่ แล้วเปิดเบราว์เซอร์ไปที่ `http://localhost:3000/graphql` จะพบหน้าเครื่องมือ GraphiQL สำหรับทดลองเขียนและรัน Query ได้ทันที

### ขั้นตอนที่ 3.5 เรียกใช้งาน GraphQL ผ่าน Postman

นอกจาก GraphiQL แล้ว ยังสามารถทดสอบ GraphQL API ผ่าน Postman ได้เช่นเดียวกับที่ใช้ทดสอบ REST endpoint ในสัปดาห์ที่ 1 โดยมีขั้นตอนดังนี้

1. สร้าง request ใหม่ใน Postman แล้วตั้ง method เป็น `POST` และ URL เป็น `http://localhost:3000/graphql`
2. ไปที่แท็บ **Body** แล้วเลือกชนิดเป็น **GraphQL** (Postman มีตัวเลือกนี้แยกจาก raw และ JSON โดยเฉพาะ)
3. Postman จะแบ่งพื้นที่กรอกข้อมูลเป็น 2 ช่อง
   - ช่องบน (**Query**) สำหรับพิมพ์ query หรือ mutation
   - ช่องล่าง (**GraphQL Variables**) สำหรับกรอกค่าตัวแปรแบบ JSON เมื่อ query มีการใช้ `$variable`
4. ทดลองพิมพ์ query ต่อไปนี้ในช่อง Query

```graphql
query {
  student(id: 1) {
    name
    major
  }
}
```

5. กด **Send** แล้วตรวจสอบผลลัพธ์ในแท็บ response ว่าตรงกับที่คาดไว้

**ข้อสังเกต:** ไม่ว่าจะเป็น query หรือ mutation ก็ใช้ method `POST` และ URL เดียวกันเสมอ (`/graphql`) ต่างจาก REST ที่ต้องเปลี่ยน method และ URL ตามชนิดของการกระทำ (GET, POST, PUT, DELETE) โดย Postman จะห่อเนื้อหาในช่อง Query และ Variables เป็น JSON รูปแบบ `{ "query": "...", "variables": {...} }` แล้วส่งไปให้อัตโนมัติ

### ขั้นตอนที่ 3.6 ทดลองเขียน Query เพื่อแก้ปัญหา Over-fetching

ในหน้า GraphiQL ทดลองพิมพ์ Query ต่อไปนี้ เพื่อขอเฉพาะ `name` และชื่อรายวิชา โดยไม่ขอฟิลด์อื่นที่ไม่จำเป็น

```graphql
query {
  student(id: 1) {
    name
    courses {
      courseName
    }
  }
}
```

ผลลัพธ์ที่ได้รับกลับ

```json
{
  "data": {
    "student": {
      "name": "สมชาย ใจดี",
      "courses": [
        { "courseName": "การเขียนโปรแกรมเบื้องต้น" },
        { "courseName": "โครงสร้างข้อมูล" }
      ]
    }
  }
}
```

**เปรียบเทียบกับขั้นตอนที่ 2.3:** สังเกตว่าผลลัพธ์จาก GraphQL ไม่มีฟิลด์ `email`, `phone` หรือ `courseIds` ติดมาด้วยเหมือนกรณี REST เนื่องจากผู้เรียกเป็นผู้กำหนดฟิลด์ที่ต้องการเองตั้งแต่ต้น

### ขั้นตอนที่ 3.7 ทดลองเขียน Query เพื่อแก้ปัญหา Under-fetching

ทดลอง Query ที่รวมข้อมูลจากหลาย resource ไว้ในคำขอเดียว

```graphql
query {
  students {
    name
    major
    courses {
      courseName
      credit
    }
  }
}
```

**เปรียบเทียบกับขั้นตอนที่ 2.4:** สังเกตว่า Query เดียวนี้ให้ข้อมูลนิสิตทุกคนพร้อมรายวิชาที่ลงทะเบียนครบถ้วน โดยใช้เพียง 1 คำขอ ในขณะที่แนวทาง REST เดิมต้องใช้หลายคำขอเพื่อให้ได้ข้อมูลชุดเดียวกัน

### ขั้นตอนที่ 3.8 บันทึกผลการเปรียบเทียบ

จัดทำตารางสรุปผลการทดลองของตนเอง โดยใช้รูปแบบต่อไปนี้เป็นแนวทาง

| หัวข้อเปรียบเทียบ                                 | REST (`/students/:id/full`)               | GraphQL                          |
| ------------------------------------------------- | ----------------------------------------- | -------------------------------- |
| จำนวนคำขอที่ใช้เพื่อดูชื่อและรายวิชาของนิสิต 1 คน | 1 คำขอ (แต่ได้ฟิลด์เกินความจำเป็น)        | 1 คำขอ (ได้เฉพาะฟิลด์ที่ต้องการ) |
| จำนวนคำขอที่ใช้เพื่อดูชื่อและรายวิชาของนิสิตทุกคน | มากกว่า 1 คำขอ หากต้องแยกดึงข้อมูลรายวิชา | 1 คำขอ                           |
| ฟิลด์ที่ได้รับเกินความจำเป็น (over-fetching)      | มี เช่น `email`, `phone`, `courseIds`     | ไม่มี                            |

### จุดตรวจสอบที่ 3

- ติดตั้งและเชื่อมต่อ GraphQL เข้ากับ Express สำเร็จ สามารถเปิดหน้า GraphiQL ได้
- เรียก GraphQL query ผ่าน Postman สำเร็จ (ขั้นตอนที่ 3.5) และได้ผลลัพธ์ตรงกับที่ทดสอบผ่าน GraphiQL
- ทดลอง Query ทั้ง 2 แบบในขั้นตอนที่ 3.6 และ 3.7 ได้ผลลัพธ์ถูกต้องตามที่คาดหวัง
- จัดทำตารางเปรียบเทียบผลการทดลองของตนเองได้ครบถ้วน

---

## ส่วนที่ 4: ฝึกใช้งาน GraphQL แบบ CRUD ให้ครบถ้วน (120-150 นาที)

ในส่วนที่ 3 นิสิตได้ทดลองใช้งาน Query พื้นฐานไปแล้ว ส่วนนี้จะขยาย Schema และ Resolver เดิมให้รองรับการทำงานแบบ CRUD ครบทั้ง 4 รูปแบบ คือ Create, Read, Update และ Delete โดยจะเน้นตัวอย่างฝั่ง Read (Query) หลายรูปแบบเป็นพิเศษ เนื่องจากในการใช้งานจริงคำขออ่านข้อมูลมีสัดส่วนสูงที่สุด และเป็นจุดแข็งที่ทำให้ GraphQL ถูกเลือกใช้บ่อยกว่า REST ในสถานการณ์ที่ client ต้องการความยืดหยุ่นในการดึงข้อมูล

### ขั้นตอนที่ 4.1 ปรับปรุง Schema ให้รองรับ CRUD ครบถ้วน

แก้ไขไฟล์ `schema.js` ให้เพิ่มอาร์กิวเมนต์สำหรับการกรองและเรียงลำดับใน Query รวมถึงเพิ่ม `Mutation` สำหรับ Create, Update และ Delete

```javascript
const { buildSchema } = require("graphql");

const schema = buildSchema(`
  type Course {
    id: ID!
    courseName: String!
    credit: Int!
  }

  type Student {
    id: ID!
    name: String!
    major: String!
    email: String!
    phone: String!
    courses: [Course!]!
  }

  type Query {
    student(id: ID!): Student
    students(major: String, sortBy: String): [Student!]!
    studentCount: Int!
    course(id: ID!): Course
    courses(minCredit: Int): [Course!]!
    searchStudents(keyword: String!): [Student!]!
  }

  input CreateStudentInput {
    name: String!
    major: String!
    email: String!
    phone: String!
    courseIds: [ID!]
  }

  input UpdateStudentInput {
    name: String
    major: String
    email: String
    phone: String
    courseIds: [ID!]
  }

  type DeleteResult {
    success: Boolean!
    message: String!
  }

  type Mutation {
    createStudent(input: CreateStudentInput!): Student!
    updateStudent(id: ID!, input: UpdateStudentInput!): Student
    deleteStudent(id: ID!): DeleteResult!
  }
`);

module.exports = schema;
```

**หมายเหตุเกี่ยวกับ Schema:** การใช้ `input` แยกต่างหาก (เช่น `CreateStudentInput`) แทนการระบุอาร์กิวเมนต์เดี่ยว ๆ จำนวนมาก เป็นแนวปฏิบัติที่แนะนำใน GraphQL เพราะช่วยให้ Mutation อ่านง่ายขึ้นเมื่อมีฟิลด์จำนวนมาก และรองรับการขยายในอนาคตได้สะดวกกว่า

### ขั้นตอนที่ 4.2 ปรับปรุง Resolver ให้รองรับ CRUD ครบถ้วน

แก้ไขไฟล์ `resolvers.js` ให้ครบตามที่ประกาศไว้ใน Schema

```javascript
let students = [
  {
    id: 1,
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    email: "somchai@example.com",
    phone: "080-000-0001",
    courseIds: [101, 102],
  },
  {
    id: 2,
    name: "สมหญิง รักเรียน",
    major: "เทคโนโลยีสารสนเทศ",
    email: "somying@example.com",
    phone: "080-000-0002",
    courseIds: [102],
  },
];

let courses = [
  { id: 101, courseName: "การเขียนโปรแกรมเบื้องต้น", credit: 3 },
  { id: 102, courseName: "โครงสร้างข้อมูล", credit: 3 },
];

let nextStudentId = 3;

function resolveStudent(student) {
  return {
    ...student,
    courses: courses.filter((c) => student.courseIds.includes(c.id)),
  };
}

const root = {
  // ----- Read -----
  student: ({ id }) => {
    const student = students.find((s) => s.id === Number(id));
    return student ? resolveStudent(student) : null;
  },

  students: ({ major, sortBy }) => {
    let result = students;

    if (major) {
      result = result.filter((s) => s.major === major);
    }

    if (sortBy === "name") {
      result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    }

    return result.map(resolveStudent);
  },

  studentCount: () => students.length,

  course: ({ id }) => courses.find((c) => c.id === Number(id)) || null,

  courses: ({ minCredit }) => {
    if (minCredit === undefined || minCredit === null) {
      return courses;
    }
    return courses.filter((c) => c.credit >= minCredit);
  },

  searchStudents: ({ keyword }) => {
    const lowerKeyword = keyword.toLowerCase();
    return students
      .filter(
        (s) =>
          s.name.toLowerCase().includes(lowerKeyword) ||
          s.major.toLowerCase().includes(lowerKeyword),
      )
      .map(resolveStudent);
  },

  // ----- Create -----
  createStudent: ({ input }) => {
    const newStudent = {
      id: nextStudentId++,
      name: input.name,
      major: input.major,
      email: input.email,
      phone: input.phone,
      courseIds: (input.courseIds || []).map(Number),
    };
    students.push(newStudent);
    return resolveStudent(newStudent);
  },

  // ----- Update -----
  updateStudent: ({ id, input }) => {
    const student = students.find((s) => s.id === Number(id));

    if (!student) {
      return null;
    }

    if (input.name !== undefined) student.name = input.name;
    if (input.major !== undefined) student.major = input.major;
    if (input.email !== undefined) student.email = input.email;
    if (input.phone !== undefined) student.phone = input.phone;
    if (input.courseIds !== undefined) {
      student.courseIds = input.courseIds.map(Number);
    }

    return resolveStudent(student);
  },

  // ----- Delete -----
  deleteStudent: ({ id }) => {
    const index = students.findIndex((s) => s.id === Number(id));

    if (index === -1) {
      return { success: false, message: "ไม่พบข้อมูลนิสิตที่ต้องการลบ" };
    }

    students.splice(index, 1);
    return { success: true, message: "ลบข้อมูลนิสิตสำเร็จ" };
  },
};

module.exports = root;
```

รันเซิร์ฟเวอร์ใหม่อีกครั้งหลังแก้ไขไฟล์ทั้งสอง แล้วเปิดหน้า GraphiQL ที่ `http://localhost:3000/graphql` เพื่อทดลอง Query และ Mutation ในหัวข้อถัดไป

### ขั้นตอนที่ 4.3 ตัวอย่างการอ่านข้อมูล (Read) หลากหลายรูปแบบ

ส่วนนี้เป็นแกนหลักของปฏิบัติการ ให้ทดลองรันตัวอย่าง Query ต่อไปนี้ทีละตัวอย่างในหน้า GraphiQL แล้วสังเกตผลลัพธ์

**ตัวอย่างที่ 1: อ่านข้อมูลนิสิตคนเดียวแบบระบุฟิลด์บางส่วน**

```graphql
query {
  student(id: 2) {
    name
    major
  }
}
```

**ตัวอย่างที่ 2: อ่านข้อมูลนิสิตทั้งหมด พร้อมกรองด้วย major**

```graphql
query {
  students(major: "เทคโนโลยีสารสนเทศ") {
    name
    email
  }
}
```

**ตัวอย่างที่ 3: อ่านข้อมูลนิสิตทั้งหมด พร้อมเรียงลำดับตามชื่อ**

```graphql
query {
  students(sortBy: "name") {
    id
    name
  }
}
```

**ตัวอย่างที่ 4: อ่านจำนวนนิสิตทั้งหมด (aggregate field)**

```graphql
query {
  studentCount
}
```

**ตัวอย่างที่ 5: อ่านข้อมูลรายวิชาที่มีหน่วยกิตตั้งแต่ค่าที่กำหนด**

```graphql
query {
  courses(minCredit: 3) {
    courseName
    credit
  }
}
```

**ตัวอย่างที่ 6: ค้นหานิสิตด้วยคำค้น (keyword search)**

```graphql
query {
  searchStudents(keyword: "สม") {
    name
    major
  }
}
```

**ตัวอย่างที่ 7: อ่านข้อมูลแบบซ้อนหลายชั้น (nested read) ในคำขอเดียว**

```graphql
query {
  students {
    name
    courses {
      courseName
      credit
    }
  }
}
```

**ตัวอย่างที่ 8: อ่านข้อมูลหลาย field พร้อมกันในคำขอเดียว โดยใช้ alias**

Alias ใช้เพื่อเรียก field เดียวกันหลายครั้งด้วยเงื่อนไขต่างกัน หรือเพื่อกำหนดชื่อผลลัพธ์ใหม่ให้อ่านง่ายขึ้น

```graphql
query {
  csStudents: students(major: "วิทยาการคอมพิวเตอร์") {
    name
  }
  itStudents: students(major: "เทคโนโลยีสารสนเทศ") {
    name
  }
}
```

**ตัวอย่างที่ 9: อ่านข้อมูลด้วย Query Variables**

การใช้ตัวแปร (variables) แทนการฝังค่าคงที่ลงใน Query โดยตรง ช่วยให้ Query นำกลับมาใช้ซ้ำได้ และเป็นแนวทางที่ Postman และไลบรารีฝั่ง client (เช่น Apollo Client) ใช้เป็นมาตรฐาน

Query:

```graphql
query GetStudentById($studentId: ID!) {
  student(id: $studentId) {
    name
    major
    courses {
      courseName
    }
  }
}
```

Variables (กรอกในช่อง Query Variables ของ GraphiQL):

```json
{
  "studentId": 1
}
```

**ตัวอย่างที่ 10: อ่านข้อมูลโดยใช้ Fragment เพื่อลดการเขียนฟิลด์ซ้ำ**

Fragment ใช้เมื่อต้องการฟิลด์ชุดเดียวกันในหลายจุดของ Query เดียวกัน

```graphql
query {
  csStudents: students(major: "วิทยาการคอมพิวเตอร์") {
    ...StudentBasicInfo
  }
  itStudents: students(major: "เทคโนโลยีสารสนเทศ") {
    ...StudentBasicInfo
  }
}

fragment StudentBasicInfo on Student {
  id
  name
  major
}
```

### จุดตรวจสอบที่ 4.1

- ทดลอง Query ตามตัวอย่างที่ 1 ถึง 10 ได้ผลลัพธ์ถูกต้องครบทุกตัวอย่าง
- สามารถอธิบายความแตกต่างระหว่างการใช้อาร์กิวเมนต์ (argument) กับการใช้ Query Variables ได้
- สามารถอธิบายประโยชน์ของการใช้ Fragment เมื่อ Query มีความซับซ้อนมากขึ้นได้

### ขั้นตอนที่ 4.4 ตัวอย่างการสร้างข้อมูล (Create)

ทดลองสร้างนิสิตใหม่ โดยส่ง `input` ตามที่กำหนดไว้ใน Schema

```graphql
mutation {
  createStudent(
    input: {
      name: "วิชัย ตั้งใจเรียน"
      major: "วิศวกรรมซอฟต์แวร์"
      email: "wichai@example.com"
      phone: "080-000-0003"
      courseIds: [101]
    }
  ) {
    id
    name
    courses {
      courseName
    }
  }
}
```

หลังจากรัน Mutation ข้างต้นสำเร็จ ให้ทดลองรัน Query `students` อีกครั้งเพื่อยืนยันว่ามีนิสิตใหม่เพิ่มขึ้นจริง

### ขั้นตอนที่ 4.5 ตัวอย่างการแก้ไขข้อมูล (Update)

ทดลองแก้ไขข้อมูลนิสิตที่มีอยู่แล้ว โดยระบุเฉพาะฟิลด์ที่ต้องการเปลี่ยนแปลง (ฟิลด์ที่ไม่ระบุจะไม่ถูกแก้ไข เนื่องจากทุกฟิลด์ใน `UpdateStudentInput` เป็น optional)

```graphql
mutation {
  updateStudent(
    id: 2
    input: { major: "วิทยาการข้อมูล", phone: "080-999-9999" }
  ) {
    id
    name
    major
    phone
  }
}
```

### ขั้นตอนที่ 4.6 ตัวอย่างการลบข้อมูล (Delete)

ทดลองลบนิสิตที่สร้างไว้ในขั้นตอนที่ 4.4

```graphql
mutation {
  deleteStudent(id: 3) {
    success
    message
  }
}
```

ทดลองรัน Mutation เดิมซ้ำอีกครั้งด้วย `id` เดียวกัน เพื่อสังเกตว่าระบบตอบกลับอย่างไรเมื่อไม่พบข้อมูลที่ต้องการลบ แล้วเปรียบเทียบกับพฤติกรรมของ REST API ที่คืนสถานะ `404 Not Found` ในกรณีเดียวกัน

### ขั้นตอนที่ 4.7 ทดลอง Mutation และ Query ร่วมกันในคำขอเดียว

GraphQL อนุญาตให้ส่ง Mutation หลายตัวในคำขอเดียวได้ โดยแต่ละ Mutation จะถูกประมวลผลตามลำดับที่เขียนไว้ ทดลองสร้างนิสิตใหม่ 2 คนพร้อมกันในคำขอเดียว โดยใช้ alias แยกผลลัพธ์ของแต่ละ Mutation

```graphql
mutation {
  first: createStudent(
    input: {
      name: "มานี มีนา"
      major: "เทคโนโลยีสารสนเทศ"
      email: "manee@example.com"
      phone: "080-000-0004"
      courseIds: []
    }
  ) {
    id
    name
  }
  second: createStudent(
    input: {
      name: "ปิติ ยินดี"
      major: "วิทยาการคอมพิวเตอร์"
      email: "piti@example.com"
      phone: "080-000-0005"
      courseIds: [102]
    }
  ) {
    id
    name
  }
}
```

### จุดตรวจสอบที่ 4.2

- Mutation `createStudent`, `updateStudent`, `deleteStudent` ทำงานได้ถูกต้องครบทั้ง 3 รายการ
- ทดลองลบข้อมูลซ้ำแล้วระบบคืนค่า `success: false` พร้อมข้อความแจ้งเตือนที่เหมาะสม
- สามารถอธิบายได้ว่าเพราะเหตุใด GraphQL จึงนิยมรวมหลาย Mutation ไว้ในคำขอเดียว เมื่อเทียบกับการเรียก REST endpoint หลายครั้งแยกกัน

### ขั้นตอนที่ 4.8 สรุปการเปรียบเทียบ CRUD ระหว่าง REST และ GraphQL

| การทำงาน                     | REST                                                                                 | GraphQL                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| Create                       | `POST /api/v1/students`                                                              | `mutation { createStudent(input: ...) }`                                |
| Read (รายการเดียว)           | `GET /api/v1/students/:id`                                                           | `query { student(id: ...) }`                                            |
| Read (หลายรายการ พร้อมกรอง)  | ต้องเพิ่ม query string เช่น `?major=...` และเขียนโค้ดฝั่งเซิร์ฟเวอร์รองรับแยกต่างหาก | `query { students(major: ...) }` โดยกำหนดอาร์กิวเมนต์ไว้ใน Schema เดียว |
| Read (ข้อมูลซ้อนกันหลายชั้น) | ต้องเรียกหลาย endpoint หรือสร้าง endpoint เฉพาะ เช่น `/students/:id/full`            | เขียน nested query เดียว ได้ข้อมูลครบในคำขอเดียว                        |
| Update                       | `PUT /api/v1/students/:id` หรือ `PATCH /api/v1/students/:id`                         | `mutation { updateStudent(id: ..., input: ...) }`                       |
| Delete                       | `DELETE /api/v1/students/:id`                                                        | `mutation { deleteStudent(id: ...) }`                                   |

### จุดตรวจสอบที่ 4.3

- จัดทำตารางเปรียบเทียบ CRUD ของตนเองได้ครบถ้วน โดยอ้างอิงผลการทดลองจริงในส่วนที่ 4
- สามารถอธิบายได้ว่าเหตุใดฝั่ง Read ของ GraphQL จึงมีความยืดหยุ่นมากกว่าฝั่ง Create, Update และ Delete

---

## ส่วนต่อยอด: แบบฝึกหัดเพิ่มเติมด้วยตนเอง

### แบบฝึกหัดที่ 1: เพิ่ม Mutation ใน GraphQL

เพิ่ม Mutation สำหรับสร้างนิสิตใหม่ใน GraphQL Schema โดยให้มีลักษณะการทำงานเทียบเท่ากับ `POST /api/v1/students` ใน REST (หากทำตามขั้นตอนที่ 4.1 และ 4.2 แล้ว ถือว่าแบบฝึกหัดนี้เสร็จสมบูรณ์แล้ว)

```graphql
mutation {
  createStudent(
    input: {
      name: "วิชัย ตั้งใจเรียน"
      major: "วิศวกรรมซอฟต์แวร์"
      email: "wichai@example.com"
      phone: "080-000-0003"
    }
  ) {
    id
    name
  }
}
```

### แบบฝึกหัดที่ 2: ทดลองวัดขนาดข้อมูล (Payload Size)

ใช้ Postman ทดสอบเรียก REST endpoint `/api/v1/students/1/full` และ GraphQL Query ที่ขอเฉพาะ `name` กับ `courses.courseName` จากนั้นเปรียบเทียบขนาดของ response body (สามารถดูได้จากแท็บ response ของ Postman) และบันทึกผลว่าแบบใดมีขนาดเล็กกว่า พร้อมอธิบายเหตุผล

### แบบฝึกหัดที่ 3: ออกแบบ Query ผสมหลาย Resource

เพิ่มชนิดข้อมูลใหม่ชื่อ `Instructor` (อาจารย์ผู้สอน) ที่มีฟิลด์ `id`, `name` และความสัมพันธ์กับ `Course` (อาจารย์หนึ่งคนสอนได้หลายวิชา) จากนั้นเขียน Query เดียวที่ดึงข้อมูลนิสิต รายวิชาที่ลงทะเบียน และชื่ออาจารย์ผู้สอนแต่ละวิชา พร้อมกันในคำขอเดียว

### แบบฝึกหัดที่ 4: วิเคราะห์ข้อจำกัดของ GraphQL

จากที่ได้ทดลองใช้งานจริงในปฏิบัติการนี้ ให้เขียนวิเคราะห์สั้น ๆ (ไม่เกิน 1 หน้ากระดาษ) ตอบคำถามต่อไปนี้

1. หากต้องทำระบบแคช (cache) ผลลัพธ์ของ Query จะพบความยากลำบากใดบ้าง เมื่อเทียบกับการทำแคช REST endpoint ด้วย URL
2. หากผู้ใช้งานภายนอกส่ง Query ที่ซ้อนกันหลายชั้น (nested query) เช่น ขอข้อมูลนิสิต แล้วขอรายวิชาของนิสิต แล้วขออาจารย์ของแต่ละรายวิชา จะส่งผลต่อประสิทธิภาพของเซิร์ฟเวอร์อย่างไร

### แบบฝึกหัดที่ 5: เพิ่มการกรองข้อมูลใน Read Query

เพิ่มอาร์กิวเมนต์ `hasCourse: ID` ใน Query `students` เพื่อกรองเฉพาะนิสิตที่ลงทะเบียนรายวิชาที่ระบุ แล้วทดลองเขียน Query ต่อไปนี้ให้ทำงานได้ถูกต้อง

```graphql
query {
  students(hasCourse: 102) {
    name
    major
  }
}
```

### เกณฑ์การประเมินแบบฝึกหัดต่อยอด (สำหรับนิสิตใช้ตรวจสอบตนเอง)

| รายการ         | ผ่านเกณฑ์เมื่อ                                                                                                         |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| แบบฝึกหัดที่ 1 | เรียก Mutation `createStudent` ผ่าน GraphiQL แล้วมีข้อมูลนิสิตใหม่เพิ่มขึ้นจริง และ query `students` แสดงข้อมูลใหม่นี้ |
| แบบฝึกหัดที่ 2 | มีตารางหรือบันทึกเปรียบเทียบขนาด payload พร้อมตัวเลขจริงจาก Postman และคำอธิบายเหตุผล                                  |
| แบบฝึกหัดที่ 3 | Query เดียวคืนข้อมูลนิสิต รายวิชา และชื่ออาจารย์ผู้สอนได้ครบถ้วนโดยไม่ error                                           |
| แบบฝึกหัดที่ 4 | มีคำตอบครบทั้ง 2 ข้อ พร้อมเหตุผลที่อ้างอิงจากผลการทดลองจริงของตนเอง ไม่ใช่การคัดลอกจากเอกสารบรรยาย                     |
| แบบฝึกหัดที่ 5 | Query `students(hasCourse: 102)` คืนเฉพาะนิสิตที่ลงทะเบียนรายวิชารหัส 102 เท่านั้น โดยไม่ error                        |

หมายเหตุ: แบบฝึกหัดต่อยอดนี้เป็นการเตรียมความพร้อมสำหรับเนื้อหาสัปดาห์ที่ 3 (RESTful Design & URI Schema) ซึ่งจะกลับมาเน้นการออกแบบ REST API ตามมาตรฐานอย่างละเอียด เนื่องจากรายวิชานี้กำหนดให้ใช้ REST เป็นมาตรฐานหลักในการพัฒนาโครงงานตลอดภาคการศึกษา
