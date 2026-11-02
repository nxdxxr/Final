# คู่มืออ้างอิง Zod (Quick Reference)

เอกสารนี้สรุปคำสั่ง Zod ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (เหตุผลที่ต้องมี Cross-field/Conditional Validation, การจำกัดขนาด Payload) อยู่ใน [wk12.md](wk12.md) หัวข้อ 1-2 ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้ง](#1-ติดตั้ง)
2. [Schema พื้นฐาน](#2-schema-พื้นฐาน)
3. [Type ที่ใช้บ่อย](#3-type-ที่ใช้บ่อย)
4. [Cross-field Validation ด้วย `.refine()`](#4-cross-field-validation-ด้วย-refine)
5. [Conditional Validation ด้วย `.superRefine()`](#5-conditional-validation-ด้วย-superrefine)
6. [จำกัดขนาด Array/Payload](#6-จำกัดขนาด-arraypayload)
7. [Middleware ห่อ Zod ให้ใช้ซ้ำได้](#7-middleware-ห่อ-zod-ให้ใช้ซ้ำได้)
8. [อ่าน Error](#8-อ่าน-error)
9. [ข้อผิดพลาดที่พบบ่อย](#9-ข้อผิดพลาดที่พบบ่อย)
10. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#10-ตัวเลือกพารามิเตอร์เพิ่มเติม)
11. [ตัวอย่างโค้ดเพิ่มเติม](#11-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้ง

```bash
npm install zod
```

```javascript
const { z } = require("zod");
```

---

## 2. Schema พื้นฐาน

```javascript
const createStudentSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.email(),
  age: z.number().int().min(15).max(80),
});

const result = createStudentSchema.safeParse(req.body);
if (!result.success) {
  // result.error.issues คือ array ของปัญหาที่พบ (ดูหัวข้อ 8)
}
// result.data คือข้อมูลที่ผ่านการตรวจสอบแล้ว ใช้แทน req.body ได้ทันที
```

ใช้ `safeParse()` เสมอในโค้ด production เพราะคืนค่าเป็น `{ success, data }` หรือ `{ success: false, error }` ไม่ throw exception ต่างจาก `.parse()` ที่ throw ทันทีเมื่อข้อมูลไม่ผ่าน (ต้องครอบด้วย `try/catch` ถ้าเลี่ยงไม่ได้)

---

## 3. Type ที่ใช้บ่อย

```javascript
z.string().min(1).max(100); // string ที่ไม่ว่างและไม่เกิน 100 ตัวอักษร
z.email(); // ต้องเป็นรูปแบบอีเมล
z.iso.datetime(); // ต้องเป็น ISO 8601 เช่น "2026-01-01T00:00:00Z"
z.string().optional(); // ไม่บังคับมี field นี้ก็ได้
z.string().nullable(); // ยอมรับค่า null ได้

z.number().int().min(15).max(80); // จำนวนเต็ม 15-80
z.number().positive(); // ต้องมากกว่า 0

z.boolean();
z.enum(["local", "international"]); // ต้องเป็นหนึ่งในค่าที่กำหนดเท่านั้น

z.array(z.string()).min(1).max(50); // array ของ string ความยาว 1-50
z.object({ ... }); // nested object ซ้อนกันได้
```

---

## 4. Cross-field Validation ด้วย `.refine()`

ใช้เมื่อต้องเปรียบเทียบค่าระหว่าง field ภายใน object เดียวกัน และ error มีจุดเดียวพอ

```javascript
const enrollmentPeriodSchema = z
  .object({
    startDate: z.iso.datetime(),
    endDate: z.iso.datetime(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    error: "endDate ต้องมาหลัง startDate เสมอ",
    path: ["endDate"], // บอกว่า error นี้ผูกกับ field ไหน
  });
```

---

## 5. Conditional Validation ด้วย `.superRefine()`

ใช้เมื่อ field ที่จำเป็นเปลี่ยนไปตามค่าของ field อื่น หรือต้องเพิ่ม error ได้มากกว่า 1 จุดในการตรวจครั้งเดียว

```javascript
const registrationSchema = z
  .object({
    studentType: z.enum(["local", "international"]),
    passportNumber: z.string().optional(),
    nationalId: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.studentType === "international" && !data.passportNumber) {
      ctx.addIssue({
        code: "custom",
        message: "ต้องระบุ passportNumber สำหรับนิสิตต่างชาติ",
        path: ["passportNumber"],
      });
    }
    if (data.studentType === "local" && !data.nationalId) {
      ctx.addIssue({
        code: "custom",
        message: "ต้องระบุ nationalId สำหรับนิสิตไทย",
        path: ["nationalId"],
      });
    }
  });
```

| | `.refine()` | `.superRefine()` |
| --- | --- | --- |
| คืน error ได้กี่จุด | 1 จุดต่อการเรียก | หลายจุดในครั้งเดียว ผ่าน `ctx.addIssue()` |
| เหมาะกับ | เปรียบเทียบ field ตรงไปตรงมา | เงื่อนไขซับซ้อน/แตกสาขาตามค่า field อื่น |

---

## 6. จำกัดขนาด Array/Payload

```javascript
const bulkCreateSchema = z.object({
  students: z.array(createStudentSchema).min(1).max(50),
});
```

ใช้ร่วมกับการจำกัดขนาด body ที่ระดับ Express เสมอ (ป้องกันก่อนข้อมูลถึงชั้น parsing ด้วยซ้ำ)

```javascript
app.use(express.json({ limit: "100kb" }));
```

---

## 7. Middleware ห่อ Zod ให้ใช้ซ้ำได้

```javascript
// middlewares/validate.js
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "ข้อมูลที่ส่งมาไม่ถูกต้อง",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validate };
```

```javascript
router.post("/students", validate(createStudentSchema), createStudent);
```

---

## 8. อ่าน Error

```javascript
const result = schema.safeParse(req.body);
if (!result.success) {
  result.error.issues.forEach((issue) => {
    console.log(issue.path.join(".")); // ชื่อ field ที่ผิด เช่น "endDate" หรือ "students.0.email"
    console.log(issue.message); // ข้อความ error
  });
}
```

`issue.path` เป็น array เสมอ (รองรับ nested field/array index) ต้องใช้ `.join(".")` เพื่อแปลงเป็น string อ่านง่าย

---

## 9. ข้อผิดพลาดที่พบบ่อย

- **ใช้ `.parse()` แทน `.safeParse()` โดยไม่ครอบ `try/catch`** — `.parse()` throw exception ทันทีเมื่อข้อมูลไม่ผ่าน ถ้าไม่ครอบจะทำให้ request ตกไปที่ error-handling middleware แบบ 500 เสมอ ไม่ได้ควบคุม status code ที่ต้องการ (เช่น 400)
- **ลืมเขียน `path` ใน `.refine()`/`ctx.addIssue()`** — ทำให้ error ไม่รู้ว่าผูกกับ field ไหน ฝั่ง client แสดงข้อความแจ้งเตือนไม่ถูกตำแหน่ง
- **ใช้ `req.body` เดิมต่อหลัง validate แล้ว** — ต้องใช้ `result.data` (หรือ `req.body` ที่ middleware เขียนทับแล้วตามหัวข้อ 7) เพราะ Zod อาจแปลงชนิดข้อมูลให้ระหว่างตรวจสอบ (เช่น string ตัวเลขเป็น number) ถ้ายังอ้าง `req.body` ตัวเดิมอาจได้ชนิดข้อมูลที่ไม่ตรงกับที่ schema รับรอง
- **จำกัดแค่ที่ schema แต่ไม่จำกัดที่ `express.json({ limit })`** — ข้อมูลขนาดใหญ่ผิดปกติจะกิน memory ตอน parsing JSON ก่อนถึงชั้น Zod เสียอีก ต้องป้องกันทั้งสองชั้น (ดูหัวข้อ 6)
- **เขียน `.superRefine()` แต่ `return` ค่า boolean เหมือน `.refine()`** — `.superRefine()` ไม่ได้ดูค่าที่ return เลย ต้องเพิ่ม error ผ่าน `ctx.addIssue()` เท่านั้น การ `return false` เฉย ๆ จะไม่มีผลใด ๆ
- **ใช้ `z.object({...})` แล้วคาดว่า field ที่ไม่ได้ระบุไว้ใน schema จะถูกปฏิเสธโดยอัตโนมัติ** — ค่าเริ่มต้นของ `z.object()` คือโหมด "strip" ซึ่งจะตัด field ส่วนเกินทิ้งเงียบ ๆ ไม่ error เช่นถ้า client แนบ `{ "role": "admin" }` มาด้วยทั้งที่ schema ไม่มี field นี้ Zod จะไม่ throw error แต่จะตัด `role` ออกจาก `result.data` ให้เอง ถ้าต้องการให้ error ทันทีเมื่อมี field เกิน ต้องใช้ `.strict()` ต่อท้าย (ดูหัวข้อ 10)
- **ใช้ `z.coerce.number()` กับ query string โดยไม่ระวังค่าว่าง** — `req.query.page` ที่ไม่ถูกส่งมาเลยจะเป็น `undefined` ซึ่ง `z.coerce.number()` จะแปลงเป็น `NaN` แล้ว schema ที่มี `.int()` จะ error ว่า "Expected number" แทนที่จะแจ้งว่า "ค่าที่ให้มาไม่ใช่ตัวเลข" ทำให้ debug สับสน ควรตั้ง `.optional()` หรือ `.default()` ควบคู่เสมอเมื่อ field มาจาก query string
- **ตรวจสอบ `req.params.id` ด้วย `z.string()` เฉย ๆ โดยไม่ validate รูปแบบ** — `req.params` ทุกตัวเป็น string เสมอจาก Express จึงไม่มีทางถูก Zod ปฏิเสธด้วย type แต่ถ้า route คาดว่า `id` ต้องเป็นตัวเลข (เช่นใช้กับ MySQL `AUTO_INCREMENT`) ต้องเติม `.regex(/^\d+$/)` หรือ `z.coerce.number().int().positive()` ไม่เช่นนั้นค่าเช่น `"abc"` จะหลุดผ่าน validation ไปถึงชั้น query แล้วไปพังที่ MySQL แทน
- **แก้ schema แล้วลืมแก้ error message ที่ hardcode ไว้ใน `.refine()`** — เมื่อเปลี่ยนเงื่อนไข (เช่น ปรับช่วงวันที่ที่อนุญาต) แต่ไม่ได้แก้ `error`/`message` ที่ผูกไว้ ผู้ใช้จะได้รับข้อความ error ที่ไม่ตรงกับเงื่อนไขจริงที่ตรวจอยู่ ควรรีวิว message ทุกครั้งที่แก้ logic ภายใน `.refine()`/`.superRefine()`
- **ใช้ schema เดียวกันกับ create และ update โดยไม่ปรับ `.partial()`** — endpoint update (`PATCH`) มักอนุญาตให้ส่งมาแค่บาง field แต่ถ้านำ `createStudentSchema` (ที่ทุก field บังคับ) ไปใช้ตรง ๆ กับ `PATCH` จะทำให้ client ต้องส่งทุก field แม้ต้องการแก้แค่ field เดียว ควรสร้าง schema แยกด้วย `.partial()` (ดูหัวข้อ 10)

---

## 10. ตัวเลือก/พารามิเตอร์เพิ่มเติม

| ตัวเลือก | ใช้ทำอะไร | ตัวอย่างการใช้ |
| --- | --- | --- |
| `.strict()` | ทำให้ `z.object()` ปฏิเสธ (error) ทันทีถ้ามี field เกินจากที่ระบุไว้ใน schema แทนการตัดทิ้งเงียบ ๆ แบบค่าเริ่มต้น | `z.object({ name: z.string() }).strict()` — ป้องกัน mass assignment เช่น client แนบ `role: "admin"` มาด้วย |
| `.strip()` | พฤติกรรมเริ่มต้นของ `z.object()` — ตัด field ส่วนเกินออกจาก `result.data` โดยไม่ error (เรียกตรง ๆ ได้เมื่อต้องการยืนยันพฤติกรรมนี้ชัดเจน) | `z.object({...}).strip()` |
| `.passthrough()` | อนุญาตให้ field ส่วนเกินผ่านเข้า `result.data` ได้โดยไม่ตัดทิ้งและไม่ error | ใช้เมื่อต้องส่งข้อมูลที่ schema ยังไม่ครอบคลุมทั้งหมดต่อไปยังระบบอื่นแบบไม่สูญหาย |
| `.partial()` | ทำให้ทุก field ของ object เป็น optional ทั้งหมด (ยกเว้นระบุ field ที่ต้องการเฉพาะเจาะจงผ่าน argument) | `createStudentSchema.partial()` ใช้สร้าง schema สำหรับ `PATCH /students/:id` ที่ไม่บังคับทุก field |
| `.pick({ field: true })` / `.omit({ field: true })` | สร้าง schema ใหม่โดยเลือกหรือตัด field บางตัวออกจาก schema เดิม | `createStudentSchema.omit({ password: true })` ใช้ตอน response ไม่ต้องการส่ง field ลับกลับไป |
| `.default(value)` | กำหนดค่าเริ่มต้นให้ field เมื่อไม่ได้ส่งมา (field นั้นจะไม่ใช่ `undefined` ใน `result.data` อีกต่อไป) | `z.number().int().min(1).default(1)` สำหรับ `page` ใน query string |
| `.catch(value)` | คืนค่า fallback ที่กำหนดเมื่อ field นั้น validate ไม่ผ่าน แทนการทำให้ทั้ง parse ล้มเหลว | ใช้ระมัดระวัง เพราะจะซ่อน error ของ field นั้นไปเงียบ ๆ เหมาะกับ field ที่ไม่สำคัญต่อ business logic เท่านั้น |
| `z.coerce.number()` / `z.coerce.boolean()` / `z.coerce.date()` | แปลงชนิดข้อมูลให้ตรงก่อนตรวจสอบ เหมาะกับข้อมูลที่มาในรูป string เสมอ เช่น query string หรือ form field | `z.coerce.number().int().min(1)` สำหรับ `req.query.page` |
| `z.string().trim()` | ตัดช่องว่างหน้า-หลังออกก่อนตรวจสอบความยาว | `z.string().trim().min(1)` ป้องกัน string ที่มีแต่ space ผ่าน `.min(1)` ไปได้ |
| `z.string().toLowerCase()` | แปลง string เป็นตัวพิมพ์เล็กก่อนเก็บ/ตรวจสอบ | ใช้กับ `email` ก่อนบันทึกเพื่อป้องกันข้อมูลซ้ำที่ต่างกันแค่ตัวพิมพ์ |
| `.transform(fn)` | แปลงค่าหลัง validate ผ่านแล้ว คืนค่าใหม่ที่ไม่ใช่ชนิดเดิมก็ได้ | ใช้แปลง string วันที่เป็น `Date` object ก่อนส่งต่อให้ query layer |
| `z.object({...}).shape` | เข้าถึง schema ของแต่ละ field แยกจาก object หลัก เพื่อนำไปสร้าง schema ใหม่หรือ validate field เดี่ยว | `createStudentSchema.shape.email.safeParse(someEmail)` |
| `error.flatten()` | แปลง `ZodError` ให้อยู่ในรูป `{ formErrors, fieldErrors }` ที่จับคู่ field กับ error ได้ง่ายกว่าไล่ `issues` เอง | ใช้แทนการวน loop `issues` เมื่อต้องการ response แบบ `{ field: [messages] }` |
| `z.lazy(() => schema)` | อ้างอิง schema ของตัวเองหรือ schema ที่ยังไม่ประกาศ (recursive schema) | ใช้กับโครงสร้างข้อมูลที่ซ้อนตัวเองได้ เช่น comment ที่มี reply เป็น comment ย่อย |

---

## 11. ตัวอย่างโค้ดเพิ่มเติม

### 11.1 Schema สำหรับ Query String ของ Pagination (GET /students?page=2&limit=10)

```javascript
const listStudentsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().trim().max(100).optional(),
});

// ใช้กับ req.query แทน req.body
function validateQuery(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "query string ไม่ถูกต้อง",
          details: result.error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });
    }
    req.query = result.data;
    next();
  };
}

router.get("/students", validateQuery(listStudentsQuerySchema), listStudents);
```

### 11.2 Schema สำหรับ PATCH ที่ไม่บังคับทุก field

```javascript
const updateStudentSchema = createStudentSchema.partial();
// ทุก field เป็น optional แต่ยังต้องผ่านเงื่อนไขเดิม (เช่น email ต้องเป็นรูปแบบอีเมล) ถ้ามีการส่งมา

router.patch("/students/:id", validate(updateStudentSchema), updateStudent);
```

ถ้าต้องการบังคับว่าอย่างน้อยต้องมี 1 field ส่งมาใน body (ไม่ใช่ request ว่างเปล่า) ให้เพิ่ม `.refine()` ต่อท้าย

```javascript
const updateStudentSchemaStrict = createStudentSchema.partial().refine(
  (data) => Object.keys(data).length > 0,
  { error: "ต้องส่งข้อมูลอย่างน้อย 1 field เพื่ออัปเดต" }
);
```

### 11.3 ป้องกัน Mass Assignment ด้วย `.strict()`

```javascript
const createStudentSchemaSafe = z
  .object({
    name: z.string().min(1).max(100),
    email: z.email(),
    age: z.number().int().min(15).max(80),
  })
  .strict(); // ถ้า body แนบ role, isAdmin หรือ field อื่นมาด้วย จะ error ทันทีแทนการตัดทิ้งเงียบ ๆ
```

### 11.4 ใช้ `error.flatten()` เพื่อตอบ error แบบจับคู่กับ field โดยตรง

```javascript
const result = createStudentSchema.safeParse(req.body);
if (!result.success) {
  const { fieldErrors } = result.error.flatten();
  // fieldErrors = { email: ["Invalid email"], age: ["Number must be greater than or equal to 15"] }
  return res.status(400).json({ error: { code: "VALIDATION_ERROR", details: fieldErrors } });
}
```

### 11.5 Validate ค่า `id` ใน `req.params` ก่อนใช้ query ฐานข้อมูล

```javascript
const studentIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

router.get(
  "/students/:id",
  (req, res, next) => {
    const result = studentIdParamSchema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({ error: { code: "VALIDATION_ERROR", message: "id ไม่ถูกต้อง" } });
    }
    req.params = result.data; // id กลายเป็น number แล้ว ใช้กับ mysql2 ได้ตรง
    next();
  },
  getStudentById
);
```

## เอกสารอ้างอิงประกอบ

- Zod Documentation: https://zod.dev
- เนื้อหาสอนเต็ม (หลักการ Cross-field/Conditional Validation): [wk12.md](wk12.md)
- ปฏิบัติการ: [wk12-lab.md](wk12-lab.md)
