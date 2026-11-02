# สัปดาห์ที่ 2 (เสริม): GraphQL โดยละเอียด

เอกสารนี้ขยายความจากหัวข้อ 4. GraphQL ในเอกสาร [wk02.md](wk02.md) โดยอธิบายหลักการทำงาน โครงสร้าง และแนวคิดสำคัญของ GraphQL อย่างละเอียด พร้อมตัวอย่างโค้ดฝั่ง Backend (Node.js/Express + Apollo Server) และฝั่ง Frontend (JavaScript, Fetch API) ประกอบ เพื่อให้เห็นภาพการนำไปใช้งานจริงตั้งแต่การนิยาม schema จนถึงการเรียกใช้จาก client

---

## 1. ความเป็นมาและแนวคิดหลัก

GraphQL เป็นภาษา query (query language) และ runtime สำหรับ API ที่พัฒนาโดย Facebook (ปัจจุบันคือ Meta) เริ่มใช้งานภายในองค์กรตั้งแต่ปี ค.ศ. 2012 และเปิดเผยเป็นโอเพนซอร์สในปี ค.ศ. 2015 แรงจูงใจหลักในการพัฒนาคือปัญหาที่ REST API เผชิญเมื่อต้องรองรับแอปพลิเคชันมือถือที่มีข้อจำกัดด้านแบนด์วิดท์และหน้าจอที่แสดงข้อมูลแตกต่างกันในแต่ละหน้า

แนวคิดหลักของ GraphQL คือ **ให้ client เป็นผู้กำหนดโครงสร้างของข้อมูลที่ต้องการรับกลับได้เอง** ผ่าน endpoint เดียว (โดยทั่วไปคือ `/graphql`) แทนที่จะมีหลาย endpoint ตามจำนวน resource เหมือนใน REST ทุกคำขอจะถูกส่งด้วย HTTP Method `POST` ไปยัง endpoint เดียวกัน โดยเนื้อหาของคำขอ (query) จะเป็นตัวกำหนดว่าต้องการข้อมูลใดบ้าง

---

## 2. โครงสร้างของ GraphQL

GraphQL มี 3 ส่วนประกอบหลัก

### 2.1 Schema

Schema คือเอกสารนิยามชนิดข้อมูล (type) ทั้งหมดในระบบ รวมถึงความสัมพันธ์ระหว่างชนิดข้อมูล และกำหนดว่า client สามารถ query หรือ mutate อะไรได้บ้าง Schema ทำหน้าที่เป็น "สัญญา" (contract) ระหว่าง client และ server เขียนด้วยภาษาเฉพาะเรียกว่า **SDL (Schema Definition Language)**

ชนิดข้อมูลพื้นฐาน (scalar type) ที่ GraphQL มีให้ในตัวคือ `Int`, `Float`, `String`, `Boolean`, `ID` ส่วนเครื่องหมาย `!` ท้ายชนิดข้อมูลหมายถึงฟิลด์นั้นห้ามเป็นค่าว่าง (non-nullable)

### 2.2 Query

Query คือคำขอสำหรับ**อ่านข้อมูล** มีลักษณะการทำงานคล้ายกับ HTTP Method `GET` ใน REST โดย client จะระบุเฉพาะฟิลด์ที่ต้องการในคำขอ และ server จะตอบกลับเฉพาะฟิลด์เหล่านั้นเท่านั้น

### 2.3 Mutation

Mutation คือคำขอสำหรับ**เปลี่ยนแปลงข้อมูล** เช่น การสร้าง (create) แก้ไข (update) หรือลบ (delete) ข้อมูล มีลักษณะการทำงานคล้ายกับ HTTP Method `POST`, `PUT`, `PATCH`, `DELETE` ใน REST รวมไว้ในกลไกเดียว โดยแต่ละ mutation จะถูกประมวลผลตามลำดับที่ระบุไว้ในคำขอเสมอ (ต่างจาก query ที่ server อาจประมวลผลแบบขนานกันได้)

นอกจากนี้ยังมี **Subscription** ซึ่งเป็นกลไกเสริมสำหรับรับข้อมูลแบบ real-time ผ่าน WebSocket เมื่อข้อมูลบน server มีการเปลี่ยนแปลง แต่ไม่ได้เป็นส่วนประกอบหลักที่กล่าวถึงในเนื้อหาสัปดาห์นี้

---

## 3. ตัวอย่าง GraphQL Schema

```graphql
type Student {
  id: ID!
  name: String!
  major: String!
  courses: [Course!]!
}

type Course {
  id: ID!
  courseName: String!
}

type Query {
  student(id: ID!): Student
  students: [Student!]!
}

type Mutation {
  createStudent(name: String!, major: String!): Student!
  updateStudent(id: ID!, name: String, major: String): Student!
  deleteStudent(id: ID!): Boolean!
}
```

จาก schema ข้างต้น จะเห็นได้ว่า

- `Student` มีความสัมพันธ์กับ `Course` แบบหนึ่งต่อกลุ่ม (`courses: [Course!]!`)
- `Query` กำหนดว่า client สามารถขอข้อมูลนิสิตรายคน (`student`) หรือทั้งหมด (`students`) ได้
- `Mutation` กำหนดว่า client สามารถสร้าง แก้ไข หรือลบข้อมูลนิสิตได้

---

## 4. Backend: การสร้าง GraphQL Server ด้วย Node.js และ Apollo Server

GraphQL ไม่ผูกกับภาษาโปรแกรมมิ่งหรือ framework ใดโดยเฉพาะ ในระบบนิเวศของ Node.js เครื่องมือที่นิยมใช้สร้าง GraphQL server คือ **Apollo Server** ซึ่งสามารถทำงานร่วมกับ Express ได้

### 4.1 การติดตั้ง

```bash
npm install @apollo/server graphql express cors body-parser
```

### 4.2 การกำหนด Schema และ Resolver

Resolver คือฟังก์ชันที่ทำหน้าที่ดึงข้อมูลจริงมาตอบสนองแต่ละฟิลด์ใน schema โดยชื่อของ resolver จะต้องตรงกับชื่อฟิลด์ใน type นั้น ๆ

```javascript
// schema.js
const typeDefs = `#graphql
  type Student {
    id: ID!
    name: String!
    major: String!
    courses: [Course!]!
  }

  type Course {
    id: ID!
    courseName: String!
  }

  type Query {
    student(id: ID!): Student
    students: [Student!]!
  }

  type Mutation {
    createStudent(name: String!, major: String!): Student!
  }
`;

module.exports = typeDefs;
```

```javascript
// data.js — จำลองฐานข้อมูลด้วยตัวแปรในหน่วยความจำ
let students = [
  {
    id: "1",
    name: "สมชาย ใจดี",
    major: "วิทยาการคอมพิวเตอร์",
    courseIds: ["1", "2"],
  },
];

let courses = [
  { id: "1", courseName: "การเขียนโปรแกรมเบื้องต้น" },
  { id: "2", courseName: "โครงสร้างข้อมูล" },
];

module.exports = { students, courses };
```

```javascript
// resolvers.js
const { students, courses } = require("./data");

const resolvers = {
  Query: {
    // resolver สำหรับ Query.student(id: ID!)
    student: (parent, args) => students.find((s) => s.id === args.id),

    // resolver สำหรับ Query.students
    students: () => students,
  },

  Mutation: {
    // resolver สำหรับ Mutation.createStudent(...)
    createStudent: (parent, args) => {
      const newStudent = {
        id: String(students.length + 1),
        name: args.name,
        major: args.major,
        courseIds: [],
      };
      students.push(newStudent);
      return newStudent;
    },
  },

  // resolver เฉพาะฟิลด์: เมื่อ client ขอฟิลด์ courses ของ Student
  // GraphQL จะเรียก resolver นี้โดยอัตโนมัติ โดยรับ Student object เป็น parent
  Student: {
    courses: (parent) => courses.filter((c) => parent.courseIds.includes(c.id)),
  },
};

module.exports = resolvers;
```

### 4.3 การประกอบเป็น Server ด้วย Express

```javascript
// server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { ApolloServer } = require("@apollo/server");
const { expressMiddleware } = require("@apollo/server/express4");

const typeDefs = require("./schema");
const resolvers = require("./resolvers");

async function startServer() {
  const app = express();

  const apolloServer = new ApolloServer({ typeDefs, resolvers });
  await apolloServer.start();

  // GraphQL ทำงานผ่าน endpoint เดียวคือ /graphql เท่านั้น
  app.use(
    "/graphql",
    cors(),
    bodyParser.json(),
    expressMiddleware(apolloServer),
  );

  app.listen(4000, () => {
    console.log("GraphQL server running at http://localhost:4000/graphql");
  });
}

startServer();
```

จากตัวอย่างข้างต้น จะเห็นได้ว่าต่างจาก REST ที่ต้องประกาศหลาย route (`app.get('/students')`, `app.get('/students/:id')`, `app.post('/students')` ฯลฯ) GraphQL server ประกาศเพียง route เดียวคือ `/graphql` และปล่อยให้ query ที่ client ส่งมาเป็นตัวกำหนดว่าต้องการข้อมูลอะไร

---

## 5. Frontend: การเรียกใช้ GraphQL API ด้วย JavaScript

เนื่องจาก GraphQL ทำงานผ่าน HTTP `POST` ไปยัง endpoint เดียว จึงสามารถเรียกใช้ได้โดยตรงด้วย Fetch API มาตรฐานของ JavaScript โดยไม่จำเป็นต้องพึ่งพาไลบรารีเพิ่มเติม (แม้ในทางปฏิบัติมักใช้ไลบรารีอย่าง Apollo Client เพื่อจัดการ caching และ state เพิ่มเติม)

### 5.1 การเรียก Query

```javascript
// client.js
async function getStudent(id) {
  const query = `
    query GetStudent($id: ID!) {
      student(id: $id) {
        name
        major
        courses {
          courseName
        }
      }
    }
  `;

  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      variables: { id }, // ส่งค่าตัวแปรแยกจากตัว query เพื่อป้องกัน injection และนำ query กลับมาใช้ซ้ำได้
    }),
  });

  const { data, errors } = await res.json();
  if (errors) {
    console.error("เกิดข้อผิดพลาด:", errors);
    return null;
  }
  return data.student;
}

getStudent("1").then((student) => {
  document.getElementById("student-name").textContent = student.name;
});
```

### 5.2 การเรียก Mutation

```javascript
async function createStudent(name, major) {
  const mutation = `
    mutation CreateStudent($name: String!, $major: String!) {
      createStudent(name: $name, major: $major) {
        id
        name
        major
      }
    }
  `;

  const res = await fetch("http://localhost:4000/graphql", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: mutation,
      variables: { name, major },
    }),
  });

  const { data, errors } = await res.json();
  if (errors) {
    console.error("เกิดข้อผิดพลาด:", errors);
    return null;
  }
  return data.createStudent;
}

createStudent("สมหญิง มีสุข", "เทคโนโลยีสารสนเทศ");
```

### 5.3 ผลลัพธ์ที่ได้รับกลับ

เมื่อเรียก `getStudent('1')` ตามตัวอย่างในข้อ 5.1 ผลลัพธ์ที่ได้จะมีเฉพาะฟิลด์ที่ระบุไว้ในคำขอเท่านั้น

```json
{
  "data": {
    "student": {
      "name": "สมชาย ใจดี",
      "major": "วิทยาการคอมพิวเตอร์",
      "courses": [
        { "courseName": "การเขียนโปรแกรมเบื้องต้น" },
        { "courseName": "โครงสร้างข้อมูล" }
      ]
    }
  }
}
```

จะสังเกตได้ว่าฟิลด์ `id` ของ `Student` ไม่ปรากฏในผลลัพธ์ เนื่องจาก client ไม่ได้ระบุฟิลด์นี้ไว้ใน query แสดงให้เห็นหลักการที่ client เป็นผู้ควบคุมโครงสร้างข้อมูลที่ต้องการได้เอง

หากคำขอมีข้อผิดพลาด เช่น ระบุ `id` ที่ไม่มีอยู่จริง หรือ argument ไม่ครบตามที่ schema กำหนด GraphQL จะตอบกลับด้วยฟิลด์ `errors` แทนที่จะใช้ HTTP status code เป็นตัวบ่งบอกข้อผิดพลาดเหมือน REST (โดยทั่วไป GraphQL server จะตอบกลับด้วย HTTP status `200 OK` แม้ query จะมีข้อผิดพลาดเชิงตรรกะก็ตาม เนื่องจากคำขอไปถึง server และถูกประมวลผลสำเร็จในระดับ HTTP)

```json
{
  "errors": [
    {
      "message": "Cannot return null for non-nullable field Student.name",
      "path": ["student", "name"]
    }
  ],
  "data": null
}
```

---

## 6. การแก้ปัญหา Over-fetching และ Under-fetching

ปัญหาสำคัญสองประการที่พบใน REST API คือ

- **Over-fetching** — endpoint คืนค่าทุกฟิลด์ของ resource แม้ client ต้องการเพียงบางฟิลด์ เช่น หน้าจอที่ต้องการแสดงเฉพาะชื่อนิสิต แต่ endpoint `/students/1` คืนค่าทุกฟิลด์รวมถึงข้อมูลที่ไม่จำเป็น
- **Under-fetching** — endpoint เดียวให้ข้อมูลไม่เพียงพอ ต้องเรียกหลาย endpoint ต่อกัน เช่น ต้องเรียก `/students/1` แล้วเรียก `/students/1/courses` ต่อ เพื่อให้ได้ข้อมูลนิสิตพร้อมรายวิชาที่ลงทะเบียน

GraphQL แก้ปัญหาทั้งสองนี้พร้อมกันได้ในคำขอเดียว เนื่องจาก client เป็นผู้ระบุโครงสร้างข้อมูลที่ต้องการเองทั้งหมด รวมถึงข้อมูลจากความสัมพันธ์ (เช่น `courses` ของ `Student`) ไว้ใน query เดียว โดยไม่ได้รับฟิลด์ส่วนเกินและไม่ต้องเรียกคำขอซ้ำหลายครั้ง ดังตัวอย่างในหัวข้อ 5.1 ที่ได้ข้อมูลนิสิตพร้อมรายวิชาครบถ้วนในคำขอเดียว

---

## 7. ข้อดีและข้อจำกัดของ GraphQL

**ข้อดี**

- ลดปัญหา over-fetching และ under-fetching เนื่องจาก client ควบคุมโครงสร้างข้อมูลที่ต้องการได้เอง
- ใช้ endpoint เดียวสำหรับทุกการดำเนินการ ลดความซับซ้อนในการจัดการ routing ฝั่ง client
- มีระบบ Schema ที่ชัดเจน ทำให้ตรวจสอบชนิดข้อมูล (type-checking) ได้ตั้งแต่ตอนพัฒนา และสามารถสร้างเอกสารประกอบ (documentation) ได้อัตโนมัติจาก schema
- รองรับการรวมข้อมูลจากหลาย resource ที่มีความสัมพันธ์กันไว้ในคำขอเดียว ลดจำนวน round-trip ระหว่าง client และ server

**ข้อจำกัด**

- มีความซับซ้อนในการตั้งค่าเริ่มต้นมากกว่า REST โดยเฉพาะการออกแบบ schema และ resolver ที่ดี
- การทำแคช (caching) ทำได้ยากกว่า REST เนื่องจาก REST อาศัย URL เป็นตัวระบุ cache key ได้โดยตรง ในขณะที่ GraphQL ใช้ endpoint เดียวกันทุกคำขอ (`/graphql`) ทำให้กลไก HTTP caching มาตรฐานใช้งานไม่ได้โดยตรง ต้องอาศัยเครื่องมือเพิ่มเติม เช่น การแคชระดับ field หรือการใช้ persisted query
- หากออกแบบไม่ดี อาจเปิดช่องให้ client ส่ง query ที่ซับซ้อนเกินไป (เช่น การ query ข้อมูลที่มีความสัมพันธ์ซ้อนกันหลายชั้น หรือ deeply nested query) จนกระทบประสิทธิภาพของเซิร์ฟเวอร์ ซึ่งในทางปฏิบัติต้องมีการจำกัดความลึกของ query (query depth limiting) เพื่อป้องกันปัญหานี้
- ทุกคำขอใช้ HTTP Method `POST` เพียงอย่างเดียว ทำให้ไม่สามารถใช้ประโยชน์จากคุณสมบัติของ HTTP Method อื่น (เช่น GET ที่ idempotent และแคชได้ง่ายโดยธรรมชาติ) ได้เหมือน REST

---

## 8. เปรียบเทียบแนวคิดโดยสรุป

| ประเด็น                          | REST                                              | GraphQL                                 |
| -------------------------------- | ------------------------------------------------- | --------------------------------------- |
| จำนวน endpoint                   | หลาย endpoint ตาม resource                        | endpoint เดียว (`/graphql`)             |
| HTTP Method ที่ใช้               | หลากหลายตามการกระทำ (GET, POST, PUT, DELETE)      | ส่วนใหญ่ใช้ POST เพียงอย่างเดียว        |
| การกำหนดโครงสร้างข้อมูลที่ได้รับ | server เป็นผู้กำหนด                               | client เป็นผู้กำหนด                     |
| ปัญหา over/under-fetching        | พบได้บ่อย                                         | แก้ไขได้โดยตรง                          |
| การทำแคช                         | ทำได้ง่ายด้วย HTTP caching มาตรฐาน                | ทำได้ยากกว่า ต้องใช้เครื่องมือเพิ่มเติม |
| การตรวจสอบชนิดข้อมูล             | ขึ้นกับการออกแบบ (เช่น ใช้ OpenAPI/Swagger เสริม) | มีระบบ Schema และ type-checking ในตัว   |

---

## สรุปเนื้อหาสำคัญ

1. GraphQL เป็นภาษา query สำหรับ API ที่ให้ client กำหนดโครงสร้างข้อมูลที่ต้องการรับกลับได้เอง ผ่าน endpoint เดียว
2. โครงสร้างหลักของ GraphQL ประกอบด้วย Schema (นิยามชนิดข้อมูล), Query (อ่านข้อมูล), และ Mutation (เปลี่ยนแปลงข้อมูล)
3. ฝั่ง Backend สามารถสร้าง GraphQL server ด้วย Node.js ร่วมกับ Apollo Server โดยกำหนด typeDefs (schema) และ resolvers (ฟังก์ชันดึงข้อมูลจริง)
4. ฝั่ง Frontend เรียกใช้ GraphQL ได้ด้วย Fetch API มาตรฐาน โดยส่งคำขอแบบ HTTP POST พร้อม query และ variables ไปยัง endpoint เดียว
5. GraphQL แก้ปัญหา over-fetching และ under-fetching ของ REST ได้โดยตรง แต่มีข้อจำกัดด้านความซับซ้อนในการตั้งค่า การทำแคช และความเสี่ยงจาก query ที่ซับซ้อนเกินไป

---

## เอกสารอ้างอิง (Reference)

1. GraphQL Foundation. _Introduction to GraphQL_. สืบค้นจาก https://graphql.org/learn
2. Apollo GraphQL. _Apollo Server Documentation_. สืบค้นจาก https://www.apollographql.com/docs/apollo-server
3. MDN Web Docs. _Using the Fetch API_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
4. GraphQL Foundation. _GraphQL Specification — Response_. สืบค้นจาก https://spec.graphql.org/October2021/#sec-Response
