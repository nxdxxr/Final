# คู่มือเริ่มต้น GraphQL (Intro to GraphQL)

คู่มือนี้ใช้โปรเจกต์ [student-api](student-api/) ในโฟลเดอร์นี้เป็นตัวอย่างจริง เพื่อสอนแนวคิด GraphQL ตั้งแต่พื้นฐานจนเรียก API ได้จริง

## 1. GraphQL คืออะไร

GraphQL คือ **query language สำหรับ API** ที่ให้ client กำหนดเองได้ว่าต้องการข้อมูล field ใดบ้าง ต่างจาก REST ที่ endpoint หนึ่งคืนข้อมูลตายตัวตามที่ server กำหนด

เปรียบเทียบกับโปรเจกต์นี้:

- REST: `GET /api/v1/students/1/full` คืนข้อมูลนิสิตทุก field รวม courses มาให้เสมอ
- GraphQL: ส่ง query เดียวที่ `/graphql` แล้วเลือกได้ว่าจะรับเฉพาะ `name` หรือจะรับ `courses` ด้วย โดยไม่ต้องสร้าง endpoint ใหม่

## 2. สามส่วนหลักของ GraphQL server

โปรเจกต์นี้แบ่งเป็น 3 ไฟล์ตามหน้าที่:

| ไฟล์                                     | หน้าที่                                                    |
| ---------------------------------------- | ---------------------------------------------------------- |
| [schema.js](student-api/schema.js)       | นิยาม **type** และ **query** ที่ client เรียกได้           |
| [resolvers.js](student-api/resolvers.js) | ฟังก์ชันที่ดึงข้อมูลจริงมาตอบแต่ละ query                   |
| [index.js](student-api/index.js)         | นำ schema + resolver มาผูกกับ Express ที่ path `/graphql`  |

## 3. Schema — นิยามรูปร่างข้อมูล

### 3.1 ไวยากรณ์พื้นฐาน

```graphql
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
```

### 3.2 ความหมายของสัญลักษณ์

| สัญลักษณ์          | ความหมาย                                           | ตัวอย่าง                            |
| ------------------ | -------------------------------------------------- | ----------------------------------- |
| `ID!`              | ข้อมูล ID ที่ห้าม null                             | `id: ID!` — ต้องมีค่าเสมอ           |
| `String!`          | ข้อความที่ห้าม null                                | `name: String!` — ไม่ยอมเป็น null   |
| `Int!`             | เลขจำนวนเต็มที่ห้าม null                           | `credit: Int!`                      |
| `String` (ไม่มี !) | ข้อความที่ยอมเป็น null                             | `middle_name: String` — อาจไม่มีค่า |
| `[Course!]!`       | Array ของ Course ที่ห้าม null ทั้ง array และสมาชิก | ต้องเป็น array เสมอ และสมาชิกทุกตัวห้ามเป็น null |
| `(id: ID!)`        | argument ที่ต้องส่งเข้ามา                          | `student(id: ID!)` — ต้องบอก id     |

### 3.3 จุดสำคัญ

- `type Query` คือ "ประตูเข้า" ทั้งหมดที่ client อ่านข้อมูลได้ (เทียบเท่า GET routes ใน REST)
- `!` แปลว่าห้ามเป็น `null` เช่น `name: String!` ต้องมีค่าเสมอ
- `[Course!]!` แปลว่า array ของ `Course` ที่ตัว array เองก็ห้าม null และสมาชิกในนั้นก็ห้าม null
- `Student.courses` เป็น field ที่เชื่อมโยงไปยังอีก type หนึ่งได้ — นี่คือจุดต่างจาก REST ที่ทำได้ยากกว่า

## 4. Resolver — ฟังก์ชันที่ไปหาข้อมูลจริง

### 4.1 ความหมาย

Resolver คือ **ฟังก์ชันที่เชื่อมโยง schema กับข้อมูลจริง** — เมื่อ client ส่ง query มา GraphQL จะเรียก resolver ที่ชื่อตรงกับชื่อ field ใน Query แล้วรอ resolver ส่งข้อมูลกลับมา

### 4.2 โครงสร้าง Resolver

```js
const root = {
  // Key ต้องตรงกับชื่อ Query ใน schema
  students: () => {
    // ไม่มี argument เพราะ schema บอก: students: [Student!]!
    return students.map(resolveStudent); // ส่ง array กลับ
  },

  student: ({ id }) => {
    // รับ argument ที่ client ส่งมา { id }
    const student = students.find((s) => s.id === Number(id));
    return student ? resolveStudent(student) : null;
  },
};

module.exports = root;
```

### 4.3 จุดสำคัญ

- แต่ละ key ใน `root` ต้องชื่อตรงกับ field ใน `type Query` ของ schema
- resolver รับ argument ตัวแรกเป็น object ของ arguments ที่ query ส่งมา (เช่น `{ id }`)
- resolver รับ argument ที่สองเป็น context ที่ server ส่งมา (ไม่จำเป็นต้องใช้ในตัวอย่างนี้)
- `resolveStudent()` ทำหน้าที่ join ข้อมูล `courseIds` กับ array `courses` เพื่อเติม field `courses` ให้ — จำลอง relational join อย่างง่ายด้วย JavaScript

### 4.4 ขั้นตอนการทำงานของ Query

เมื่อ client ส่ง query นี้:

```graphql
{
  student(id: 1) {
    name
    email
    courses {
      courseName
      credit
    }
  }
}
```

GraphQL server จะทำงานตามขั้นตอนต่อไปนี้:

#### ขั้นที่ 1: ตรวจสอบกับ Schema

```
Query request: "student(id: 1) { name email courses { ... } }"
                         ↓
        ตรวจสอบกับ schema.js
                         ↓
Query ต้องมี:
  ✓ field "student" อยู่ใน type Query ใช่ไหม?
  ✓ argument "id: 1" ตรงกับ "id: ID!" ใช่ไหม?
  ✓ ขอ field "name" อยู่ใน Student ใช่ไหม? ✓
  ✓ ขอ field "email" อยู่ใน Student ใช่ไหม? ✓
  ✓ ขอ field "courses" อยู่ใน Student ใช่ไหม? ✓
  ✓ ขอ field "courseName" อยู่ใน Course ใช่ไหม? ✓
  ✓ ขอ field "credit" อยู่ใน Course ใช่ไหม? ✓
                         ↓
            ✅ Query ผ่านการตรวจสอบ
```

#### ขั้นที่ 2: เรียก Resolver

```javascript
// GraphQL เรียก resolver ที่ชื่อตรงกับ Query
root.student({ id: 1 });
```

#### ขั้นที่ 3: Resolver หาข้อมูล

```javascript
const root = {
  student: ({ id }) => {
    // Step 3.1: ได้ argument { id: 1 } จาก client
    console.log("Resolver ได้รับ:", { id: 1 });

    // Step 3.2: ไปหา student ที่ id=1 ในฐานข้อมูล (array students)
    const student = students.find((s) => s.id === Number(id));
    // → student = {
    //     id: 1,
    //     name: "สมชาย",
    //     major: "IT",
    //     email: "somchai@...",
    //     phone: "090-...",
    //     courseIds: [101, 102]
    //   }

    // Step 3.3: เรียก resolveStudent() เพื่อแปลง courseIds เป็น courses
    return student ? resolveStudent(student) : null;
  },
};

// ฟังก์ชันแปลง courseIds เป็น courses object array
function resolveStudent(student) {
  return {
    ...student,
    courses: student.courseIds.map((cid) => courses.find((c) => c.id === cid)),
  };
  // → ผลลัพธ์:
  // {
  //   id: 1,
  //   name: "สมชาย",
  //   major: "IT",
  //   email: "somchai@...",
  //   phone: "090-...",
  //   courseIds: [101, 102],
  //   courses: [
  //     { id: 101, courseName: "API Design", credit: 3 },
  //     { id: 102, courseName: "Database", credit: 3 }
  //   ]
  // }
}
```

#### ขั้นที่ 4: GraphQL กรองแค่ field ที่ Query ขอ

Query ขอ: `name`, `email`, `courses { courseName, credit }`

GraphQL จึง **ทิ้งข้อมูลอื่น** (id, major, phone, courseIds) ไป:

```json
{
  "name": "สมชาย",
  "email": "somchai@...",
  "courses": [
    { "courseName": "API Design", "credit": 3 },
    { "courseName": "Database", "credit": 3 }
  ]
}
```

#### ขั้นที่ 5: ส่ง Response กลับไปให้ Client

```json
{
  "data": {
    "student": {
      "name": "สมชาย",
      "email": "somchai@...",
      "courses": [
        {
          "courseName": "API Design",
          "credit": 3
        },
        {
          "courseName": "Database",
          "credit": 3
        }
      ]
    }
  }
}
```

**จุดเด่นของ GraphQL:**

- ส่ง field เฉพาะที่ร้องขอเท่านั้น ไม่ส่ง `phone`, `major`, `courseIds` ที่ไม่ได้ร้องขอ ทำให้ **ประหยัด bandwidth**
- ใช้ query เดียว ไม่ต้องเรียกหลาย endpoint ตามที่ REST ต้องทำ

## 5. ผูกเข้ากับ Express ด้วย express-graphql

```js
const { graphqlHTTP } = require("express-graphql");

app.use(
  "/graphql",
  graphqlHTTP({
    schema: schema,
    rootValue: root,
    graphiql: true,
  }),
);
```

`graphiql: true` เปิดหน้าเว็บทดสอบ query แบบ interactive ที่ `http://localhost:3000/graphql`

## 6. ทดลองรันจริง

```bash
cd student-api
npm install
npm run dev
```

เปิดเบราว์เซอร์ไปที่ `http://localhost:3000/graphql` แล้วทดลอง query เหล่านี้ใน GraphiQL:

**ดึงนิสิตทุกคน เฉพาะชื่อและสาขา**

```graphql
{
  students {
    name
    major
  }
}
```

**ดึงนิสิตคนเดียว พร้อมรายวิชาที่ลงทะเบียน**

```graphql
{
  student(id: 1) {
    name
    email
    courses {
      courseName
      credit
    }
  }
}
```

สังเกตว่า response จะมีเฉพาะ field ที่ query ร้องขอ ไม่มี field ส่วนเกินเช่น `phone` หรือ `courseIds`

**ดึงนิสิตหลายคนในคำขอเดียว ด้วย alias**

query ปกติเรียก field ซ้ำชื่อกันไม่ได้ (`student(id:1)` กับ `student(id:2)` ชนกัน) ต้องใช้ **alias** ตั้งชื่อผลลัพธ์แต่ละรายการแยกกัน:

```graphql
{
  first: student(id: 1) {
    name
  }
  second: student(id: 2) {
    name
  }
}
```

```json
{
  "data": {
    "first": { "name": "สมชาย ใจดี" },
    "second": { "name": "สมหญิง รักเรียน" }
  }
}
```

**ใช้ variables แทนการฝังค่าลงใน query โดยตรง**

ในการเขียนโปรแกรมจริง (เช่นฝั่ง frontend) ไม่ควรต่อสตริง query เอง ให้ประกาศ query แบบมีชื่อ (`GetStudent`) และส่งค่าผ่าน `variables`:

```graphql
query GetStudent($id: ID!) {
  student(id: $id) {
    name
    major
  }
}
```

variables:

```json
{ "id": "2" }
```

**ดึงข้อมูลข้ามหลายนิสิตพร้อมรายวิชา**

query เดียวดึงชื่อนิสิตทุกคน พร้อมชื่อวิชาที่แต่ละคนลงทะเบียน (ไม่มี field อื่นปนมา):

```graphql
{
  students {
    name
    courses {
      courseName
    }
  }
}
```

**ขอ id ที่ไม่มีในระบบ**

resolver คืน `null` ตามที่ schema กำหนด (`student(id: ID!): Student` ไม่มี `!` ต่อท้าย จึง null ได้) แทนที่จะ error:

```graphql
{
  student(id: 999) {
    name
  }
}
```

```json
{ "data": { "student": null } }
```

**ขอ field ที่ไม่มีอยู่จริง**

GraphQL ตรวจ field กับ schema ก่อนรันเสมอ หากพิมพ์ผิดหรือ field ไม่มีอยู่จริงจะได้ error กลับมาทันทีโดยไม่เรียก resolver:

```graphql
{
  students {
    nickname
  }
}
```

```json
{
  "errors": [
    {
      "message": "Cannot query field \"nickname\" on type \"Student\". Did you mean \"name\"?"
    }
  ]
}
```

## 7. GraphQL vs REST ในโปรเจกต์นี้

| เรื่อง                           | REST ([index.js](student-api/index.js))                            | GraphQL ([schema.js](student-api/schema.js) + [resolvers.js](student-api/resolvers.js)) |
| -------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| จำนวน endpoint                   | หลาย endpoint (`/students`, `/students/:id/full`, `/courses`, ...) | endpoint เดียว `/graphql`                                                               |
| เลือก field ที่ต้องการ           | ทำไม่ได้ ต้องรับทั้งชุดตามที่ route ส่งมา                          | เลือกได้อิสระต่อ query                                                                  |
| ข้อมูลเชื่อมโยงกัน (student → courses) | ต้องทำ route แยก (`/full`) หรือเรียกหลายครั้ง                 | ใช้ query เดียว                                                                          |
| Write (create/update/delete)     | มีให้แล้วครบใน REST (`POST/PUT/DELETE`)                            | schema ปัจจุบันมีเฉพาะ `Query` (read-only) — ยังไม่มี `Mutation`                        |

## 8. Mutation — เขียนข้อมูลผ่าน GraphQL

`Query` ใช้อ่านข้อมูล ส่วนการเพิ่ม/แก้/ลบต้องประกาศใน `type Mutation` แยกต่างหาก โปรเจกต์นี้มี `addStudent` ให้ใช้งานจริงแล้ว:

**schema.js**

```graphql
type Mutation {
  addStudent(
    name: String!
    major: String!
    email: String!
    phone: String!
  ): Student!
}
```

**resolvers.js**

```js
let nextId = 3;

const root = {
  // ...student, students เดิม
  addStudent: ({ name, major, email, phone }) => {
    const newStudent = {
      id: nextId++,
      name,
      major,
      email,
      phone,
      courseIds: [],
    };
    students.push(newStudent);
    return resolveStudent(newStudent);
  },
};
```

ต่างจาก `Query` ตรงที่ต้องเรียกผ่านคีย์เวิร์ด `mutation` ตอน query:

```graphql
mutation {
  addStudent(
    name: "ทดสอบ"
    major: "IT"
    email: "test@example.com"
    phone: "080-000-0003"
  ) {
    id
    name
    major
    courses {
      courseName
    }
  }
}
```

ทดลองเรียกผ่าน GraphiQL (`http://localhost:3000/graphql`) หรือ curl:

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { addStudent(name: \"ทดสอบ\", major: \"IT\", email: \"test@example.com\", phone: \"080-000-0003\") { id name major } }"}'
```

นิสิตที่เพิ่มใหม่จะปรากฏใน `query { students { name } }` ทันที เพราะ mutation กับ query ใช้ array `students` ใน memory ตัวเดียวกัน

**สิ่งที่ต้องทราบ**: `students`/`nextId` ใน `resolvers.js` เป็นคนละตัวแปรกับ `students`/`nextId` ใน `index.js` (ที่ฝั่ง REST routes ใช้) — ข้อมูลที่เพิ่มผ่าน GraphQL จะไม่ปรากฏใน REST endpoint และในทางกลับกัน เพราะเป็น in-memory data แยกชุดกัน หากต้องการรวมเป็นแหล่งข้อมูลเดียว ต้อง refactor ให้ทั้งสองฝั่ง import จากโมดูลเดียวกัน (หรือย้ายไปใช้ฐานข้อมูลจริง)
