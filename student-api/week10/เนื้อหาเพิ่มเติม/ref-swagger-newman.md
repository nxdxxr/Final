# คู่มืออ้างอิง Swagger UI & Newman (Quick Reference)

เอกสารนี้สรุปคำสั่ง Swagger UI (แสดงผล OpenAPI) และ Newman (รัน Postman Collection ผ่าน CLI) ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (OpenAPI Specification, Developer Experience, API-First Design) อยู่ใน [wk10.md](wk10.md) ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [โครงไฟล์ OpenAPI (openapi.yaml)](#1-โครงไฟล์-openapi-openapiyaml)
2. [ติดตั้งและ mount Swagger UI](#2-ติดตั้งและ-mount-swagger-ui)
3. [ป้องกัน /api-docs ใน Production](#3-ป้องกัน-api-docs-ใน-production)
4. [Postman: Environment Variable และ Test Script](#4-postman-environment-variable-และ-test-script)
5. [Export Collection/Environment](#5-export-collectionenvironment)
6. [Newman: รัน Collection ผ่าน CLI](#6-newman-รัน-collection-ผ่าน-cli)
7. [ข้อผิดพลาดที่พบบ่อย](#7-ข้อผิดพลาดที่พบบ่อย)
8. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#8-ตัวเลือกพารามิเตอร์เพิ่มเติม)
9. [ตัวอย่างโค้ดเพิ่มเติม](#9-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. โครงไฟล์ OpenAPI (openapi.yaml)

```yaml
openapi: 3.0.3
info:
  title: Student API
  version: 1.0.0
servers:
  - url: http://localhost:3000/api/v1
paths:
  /students:
    get:
      summary: ดึงรายการนิสิตทั้งหมด
      parameters:
        - name: page
          in: query
          schema: { type: integer, default: 1 }
      responses:
        "200":
          description: สำเร็จ คืนรายการนิสิตทั้งหมด
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/StudentListResponse"
    post:
      security:
        - bearerAuth: [] # endpoint ที่ต้องยืนยันตัวตน
      requestBody:
        required: true
        content:
          application/json:
            schema: { $ref: "#/components/schemas/StudentInput" }
      responses:
        "201": { description: สร้างสำเร็จ, content: { application/json: { schema: { $ref: "#/components/schemas/StudentResponse" } } } }
        "400": { description: ข้อมูลไม่ผ่านการตรวจสอบ, content: { application/json: { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
components:
  securitySchemes:
    bearerAuth: { type: http, scheme: bearer, bearerFormat: JWT }
  schemas:
    Student:
      type: object
      properties:
        id: { type: integer }
        name: { type: string }
    StudentInput:
      type: object
      required: [name, major, email]
      properties:
        name: { type: string }
    StudentResponse:
      type: object
      properties:
        data: { $ref: "#/components/schemas/Student" }
    StudentListResponse:
      type: object
      properties:
        data: { type: array, items: { $ref: "#/components/schemas/Student" } }
    ErrorResponse:
      type: object
      properties:
        error:
          type: object
          properties:
            code: { type: string }
            message: { type: string }
```

| ส่วน | หน้าที่ |
| --- | --- |
| `info` | ชื่อ คำอธิบาย เวอร์ชันของ API |
| `servers` | URL ที่ใช้เรียก API จริง |
| `paths` | endpoint ทั้งหมด พร้อม method/parameter/response |
| `components.schemas` | data model ที่ใช้ซ้ำผ่าน `$ref` |
| `components.securitySchemes` | วิธียืนยันตัวตน เช่น JWT Bearer |

ต้องระบุ response ทุกกรณีที่เป็นไปได้ ไม่ใช่แค่ `200`/`201` — รวม `400`, `401`, `403`, `404`, `409` ตามความเหมาะสมของแต่ละ endpoint

---

## 2. ติดตั้งและ mount Swagger UI

```bash
npm install swagger-ui-express js-yaml
```

```javascript
// app.js
const swaggerUi = require("swagger-ui-express");
const YAML = require("js-yaml");
const fs = require("fs");
const path = require("path");

const openapiDocument = YAML.load(fs.readFileSync(path.join(__dirname, "openapi.yaml"), "utf8"));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
```

เปิด `http://localhost:3000/api-docs` เพื่อดูหน้าเอกสารแบบโต้ตอบได้ (ปุ่ม **Try it out** ยิง request ไปยัง server จริง)

---

## 3. ป้องกัน /api-docs ใน Production

```javascript
if (process.env.NODE_ENV !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));
}
```

ห้าม expose หน้าเอกสาร API แบบเปิดสาธารณะใน production เพราะเปิดเผยโครงสร้าง endpoint ทั้งหมดให้ผู้ไม่หวังดี ทางเลือกอื่นคือใส่ authentication middleware ปกป้อง route นี้

---

## 4. Postman: Environment Variable และ Test Script

```javascript
// Tests tab ของ request POST /auth/login — บันทึก token ลงตัวแปรอัตโนมัติ
const response = pm.response.json();
pm.environment.set("authToken", response.token);
```

```javascript
// Tests tab ของ request อื่น ๆ — ตรวจสอบ response อัตโนมัติ
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

pm.test("Response has pagination info", function () {
  const body = pm.response.json();
  pm.expect(body).to.have.property("pagination");
});
```

| ตัวแปร | ใช้ทำอะไร |
| --- | --- |
| `{{baseUrl}}` | สลับ environment (dev/staging) โดยไม่ต้องแก้ทุก request |
| `{{authToken}}` | ใช้ซ้ำใน header `Authorization: Bearer {{authToken}}` ของทุก request ที่ต้อง login |

---

## 5. Export Collection/Environment

```
Collection > ... > Export > Collection v2.1 (recommended) → postman_collection.json
Environment > ... > Export → environment.json
```

ต้อง export ทั้งสองไฟล์คู่กันเสมอ — `postman_collection.json` เก็บแค่ request/test script ส่วนค่าตัวแปร (`{{baseUrl}}` ฯลฯ) อยู่ใน `environment.json` แยกต่างหาก

---

## 6. Newman: รัน Collection ผ่าน CLI

```bash
npm install -g newman
newman run postman_collection.json -e environment.json
```

```bash
# สร้างรายงาน HTML แทนการแสดงผลเฉพาะ terminal
npm install -g newman-reporter-htmlextra
newman run postman_collection.json -e environment.json -r htmlextra
```

Newman ทำหน้าที่คล้าย Supertest แต่ทำงานที่ระดับ HTTP จริงผ่าน Collection ไม่ผูกภาษาโปรแกรม เหมาะกับ black-box testing และนำไปรันอัตโนมัติกับ CI/CD ได้

---

## 7. ข้อผิดพลาดที่พบบ่อย

- **เขียน schema ซ้ำในทุก endpoint แทนใช้ `$ref`** — แก้ schema ครั้งเดียวไม่สะท้อนไปทุกจุด เสี่ยงเอกสารไม่ตรงกันเอง
- **ระบุเฉพาะ response กรณีสำเร็จ** — เอกสารไม่ครบ client ไม่รู้ว่า endpoint นี้คืน error แบบไหนได้บ้าง
- **ไม่อัปเดต `openapi.yaml` พร้อมกับแก้ route จริง** — เอกสารล้าสมัย (stale documentation) ไม่ตรงกับพฤติกรรมจริงของระบบ
- **เปิด `/api-docs` แบบไม่มีการป้องกันใน production** — เปิดเผยโครงสร้าง endpoint ทั้งหมดให้ผู้ไม่หวังดีศึกษาช่องโหว่
- **ส่งแค่ไฟล์ Collection โดยไม่ส่ง Environment** — ผู้ที่ import จะเรียก request ไม่ได้เพราะไม่มีค่าตัวแปรให้แทนที่
- **Collection มีแต่กรณีสำเร็จ ไม่มี test ครอบคลุมกรณีผิดพลาด** — ไม่ได้ทดสอบว่า endpoint ตอบ `404`/`400` ถูกต้องเมื่อข้อมูลผิด
- **เขียน YAML ผิด indentation แล้ว Swagger UI ขึ้นหน้าว่างโดยไม่มี error ชัดเจน** — YAML ใช้ space บังคับ (ห้ามใช้ tab) และการเยื้องผิดระดับแม้เพียง 1 ช่องจะทำให้โครงสร้างข้อมูลผิดทั้ง block โดย `YAML.load()` อาจไม่ throw error ชัดเจนเสมอไป ควรตรวจสอบด้วย YAML linter หรือ validator ของ Swagger Editor ก่อน mount จริง
- **ใส่ environment variable ที่เป็นข้อมูลจริง (เช่น token/password จริง) ลงในไฟล์ environment ที่ commit เข้า git** — ไฟล์ `environment.json` ที่ export จาก Postman อาจมีค่าที่ตั้งไว้ระหว่างทดสอบติดไปด้วย (เช่น token ที่ login ไว้) ต้องตรวจสอบและล้างค่าอ่อนไหวก่อน commit หรือใส่ไฟล์นี้ใน `.gitignore` แทน
- **เขียน Postman test script ที่อ้าง field จาก response ผิดโครงสร้าง** เช่น `pm.expect(body.id)` ทั้งที่ API ตอบในรูป `{ data: { id } }` — ทำให้ test ล้มเหลวเพราะเข้าใจ response shape ผิด ไม่ใช่เพราะ API มีบั๊กจริง ควรตรวจ response จริงก่อนเขียน assertion เสมอ
- **รัน Newman ใน CI โดยไม่ตรวจค่า exit code** — Newman คืน exit code ที่ไม่เป็น 0 เมื่อมี test ล้มเหลว แต่ถ้า CI script ไม่เช็ค exit code (เช่นปล่อยให้ step ถัดไปรันต่อเสมอ) จะไม่รู้ว่า API พังอยู่ ต้องให้ CI ล้มทันทีเมื่อ `newman run` คืน exit code ที่ไม่เป็นศูนย์
- **ลืมว่า Postman Collection Runner/Newman รันแต่ละ request ตามลำดับที่ปรากฏใน Collection เท่านั้น ไม่ได้รันแบบ parallel** — ถ้า request ที่สองพึ่งพาตัวแปรที่ request แรกต้อง set ไว้ก่อน (เช่น `authToken`) การจัดเรียงลำดับ request ใน Collection ให้ถูกต้องจึงสำคัญมาก สลับลำดับผิดจะทำให้ test พังทั้ง chain

---

## 8. ตัวเลือก/พารามิเตอร์เพิ่มเติม

### OpenAPI schema fields เพิ่มเติม

| field | ความหมาย |
| --- | --- |
| `example`/`examples` (ใน schema หรือ response) | แสดงตัวอย่างค่าจริงในหน้า Swagger UI ช่วยให้ผู้ใช้เอกสารเข้าใจ format ที่คาดหวังได้ไวกว่าดู type เดียว |
| `deprecated: true` | ระบุว่า endpoint หรือ field นี้เลิกใช้แล้ว Swagger UI จะขึ้นเส้นขีดทับให้เห็นชัด โดยไม่ต้องลบออกจากเอกสารทันที |
| `enum` (ใน schema ของ parameter/property) | จำกัดค่าที่ยอมรับให้เป็นหนึ่งใน list ที่กำหนด เช่น `enum: [local, international]` ตรงกับ `z.enum()` ฝั่ง Zod |
| `nullable: true` | ระบุว่า field นี้ยอมรับค่า `null` ได้ (OpenAPI 3.0) |
| `oneOf` / `anyOf` | กำหนดว่า schema ต้องตรงกับหนึ่งใน schema ที่ระบุ (`oneOf`) หรือตรงกับอย่างน้อยหนึ่ง (`anyOf`) ใช้กับ field ที่รับได้หลายรูปแบบ |
| `parameters[].required` | ระบุว่า query/path parameter นี้บังคับต้องส่งมาหรือไม่ (path parameter ต้องเป็น `true` เสมอตามสเปก) |

### `swaggerUi.setup()` options

| ตัวเลือก | ความหมาย |
| --- | --- |
| `customSiteTitle` | เปลี่ยนชื่อ title ของ tab browser จาก "Swagger UI" ค่าเริ่มต้นเป็นชื่อโปรเจกต์ |
| `customCss` | แทรก CSS ของตัวเองเพื่อปรับแต่งหน้า Swagger UI เช่น ซ่อนปุ่ม Topbar |
| `swaggerOptions.persistAuthorization` | ถ้าตั้งเป็น `true` จะจำค่า token ที่กรอกผ่านปุ่ม Authorize ไว้แม้ reload หน้า (เก็บใน browser storage) สะดวกตอน dev/demo |

### Newman CLI flags เพิ่มเติม

| flag | ความหมาย |
| --- | --- |
| `--bail` | หยุดรันทันทีเมื่อพบ request แรกที่ test ล้มเหลว แทนที่จะรันต่อจนครบทุก request |
| `--delay-request <ms>` | หน่วงเวลาระหว่างแต่ละ request เพื่อไม่ยิง request ถี่เกินไป (มีประโยชน์เมื่อ Collection มี rate-limited endpoint อยู่) |
| `--iteration-count <n>` | รัน Collection ซ้ำกี่รอบ เหมาะกับการจำลองโหลดซ้ำ ๆ แบบง่าย (คล้าย Collection Runner ที่ตั้ง Iterations) |
| `--env-var "key=value"` | กำหนด/override ค่า environment variable ผ่าน command line โดยไม่ต้องแก้ไฟล์ environment.json เช่น ใช้ส่ง secret ผ่าน CI environment variable |
| `-x` / `--suppress-exit-code` | บังคับให้ Newman คืน exit code 0 เสมอแม้ test ล้มเหลว **ไม่ควรใช้ใน CI** เพราะจะทำให้ pipeline มองไม่เห็นว่า test พัง |

---

## 9. ตัวอย่างโค้ดเพิ่มเติม

### 9.1 เพิ่ม `example` ใน OpenAPI schema ให้ Swagger UI แสดงตัวอย่างค่าจริง

```yaml
StudentInput:
  type: object
  required: [name, major, email]
  properties:
    name: { type: string, example: "สมชาย ใจดี" }
    major: { type: string, enum: [CS, IT, SE], example: "CS" }
    email: { type: string, format: email, example: "somchai@buu.ac.th" }
```

### 9.2 Postman pre-request script เพื่อ login อัตโนมัติก่อนยิง request อื่นในสภาวะ token หมดอายุ

```javascript
// Pre-request Script tab ของ request ที่ต้องใช้ authToken
if (!pm.environment.get("authToken")) {
  pm.sendRequest(
    {
      url: pm.environment.get("baseUrl") + "/auth/login",
      method: "POST",
      header: { "Content-Type": "application/json" },
      body: {
        mode: "raw",
        raw: JSON.stringify({ email: "admin@example.com", password: "Passw0rd!" }),
      },
    },
    function (err, response) {
      if (!err) {
        pm.environment.set("authToken", response.json().token);
      }
    },
  );
}
```

### 9.3 Newman ใน GitHub Actions ที่ fail pipeline เมื่อ test ไม่ผ่าน

```yaml
# .github/workflows/api-test.yml (ส่วนที่เกี่ยวกับ Newman)
- name: Run Postman Collection ด้วย Newman
  run: |
    npm install -g newman newman-reporter-htmlextra
    newman run postman_collection.json -e environment.json -r cli,htmlextra --bail
  # exit code ที่ไม่เป็น 0 จาก newman run จะทำให้ step นี้ fail และ pipeline หยุดทันที
```

### 9.4 ตรวจสอบ response schema ด้วย `pm.response.to.have.jsonSchema()` แทนเช็ค field ทีละตัว

```javascript
// Tests tab — ตรวจว่า response ตรงกับ schema ที่กำหนด ไม่ใช่เช็คทีละ field
const schema = {
  type: "object",
  required: ["data"],
  properties: {
    data: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "email"],
        properties: {
          id: { type: "number" },
          name: { type: "string" },
          email: { type: "string" },
        },
      },
    },
  },
};

pm.test("Response ตรงกับ schema ที่กำหนด", function () {
  pm.response.to.have.jsonSchema(schema);
});
```

## เอกสารอ้างอิงประกอบ

- OpenAPI Specification v3.0.3: https://swagger.io/specification
- Swagger UI: https://swagger.io/tools/swagger-ui
- Postman Learning Center: https://learning.postman.com
- Newman (GitHub): https://github.com/postmanlabs/newman
- เนื้อหาสอนเต็ม (OpenAPI, DX, Postman Collection): [wk10.md](wk10.md)
- ปฏิบัติการ: [wk10-lab.md](wk10-lab.md)

วิธีนี้เหมาะกับ endpoint ที่คืนข้อมูลจำนวนมาก (เช่น array ของนิสิตหลายคน) เพราะตรวจทุก item พร้อมกันในครั้งเดียว แทนการวน loop เช็คทีละ field ด้วยมือ
