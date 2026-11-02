# คู่มืออ้างอิง Axios (Quick Reference)

เอกสารนี้สรุปคำสั่ง Axios ที่ใช้บ่อยสำหรับเปิดดูระหว่างเขียนโค้ด ไม่ใช่เนื้อหาสอน — หลักการ (เหตุผลที่เลือก Axios, Retry/Backoff/Jitter, Timeout, Fallback) อยู่ใน [wk11.md](wk11.md) หัวข้อ 2-5 ให้กลับไปอ่านที่นั่นหากยังไม่เข้าใจที่มาของรูปแบบโค้ดด้านล่าง

## สารบัญ

1. [ติดตั้ง](#1-ติดตั้ง)
2. [เรียก GET/POST/PUT/DELETE](#2-เรียก-getpostputdelete)
3. [ตั้งค่าที่ใช้บ่อย (timeout, headers)](#3-ตั้งค่าที่ใช้บ่อย-timeout-headers)
4. [สร้าง Axios Instance (ใช้ base URL ซ้ำ)](#4-สร้าง-axios-instance-ใช้-base-url-ซ้ำ)
5. [จัดการ Error](#5-จัดการ-error)
6. [Interceptor](#6-interceptor)
7. [แนบ JWT Token อัตโนมัติด้วย Interceptor](#7-แนบ-jwt-token-อัตโนมัติด้วย-interceptor)
8. [Retry/Timeout/Fallback แบบย่อ](#8-retrytimeoutfallback-แบบย่อ)
9. [ข้อผิดพลาดที่พบบ่อย](#9-ข้อผิดพลาดที่พบบ่อย)
10. [ตัวเลือก/พารามิเตอร์เพิ่มเติม](#10-ตัวเลือกพารามิเตอร์เพิ่มเติม)
11. [ตัวอย่างโค้ดเพิ่มเติม](#11-ตัวอย่างโค้ดเพิ่มเติม)

---

## 1. ติดตั้ง

```bash
npm install axios
```

```javascript
const axios = require("axios");
```

---

## 2. เรียก GET/POST/PUT/DELETE

```javascript
// GET
const res = await axios.get("https://jsonplaceholder.typicode.com/posts/1");
console.log(res.data); // Axios แปลง JSON ให้อัตโนมัติ ไม่ต้องเรียก .json() เหมือน fetch

// POST
const res = await axios.post("https://jsonplaceholder.typicode.com/posts", {
  title: "หัวข้อ",
  body: "เนื้อหา",
});

// PUT
const res = await axios.put(`https://jsonplaceholder.typicode.com/posts/1`, {
  title: "หัวข้อใหม่",
});

// DELETE
const res = await axios.delete(`https://jsonplaceholder.typicode.com/posts/1`);
```

ทุก method คืนค่าเป็น Promise ต้องใช้ `await` หรือ `.then()` เสมอ และ**ต้องครอบด้วย `try/catch`** เพราะ Axios โยน exception อัตโนมัติเมื่อ HTTP status ไม่ใช่ 2xx (ดูหัวข้อ 5)

---

## 3. ตั้งค่าที่ใช้บ่อย (timeout, headers)

```javascript
const res = await axios.get(url, {
  timeout: 3000, // หน่วยเป็น milliseconds — ถ้าไม่ตอบใน 3 วินาทีจะ throw error ECONNABORTED
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  params: { page: 1, limit: 10 }, // ต่อท้าย URL เป็น ?page=1&limit=10 อัตโนมัติ
});
```

---

## 4. สร้าง Axios Instance (ใช้ base URL ซ้ำ)

เมื่อต้องเรียก API เดียวกันหลาย endpoint ไม่ต้องพิมพ์ URL เต็มซ้ำทุกครั้ง

```javascript
// services/external-api.js
const apiClient = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 3000,
  headers: { "Content-Type": "application/json" },
});

// เรียกใช้แค่ path ที่เหลือ
const res = await apiClient.get("/posts/1");
```

---

## 5. จัดการ Error

Axios แยก error ออกเป็น 3 แบบ ต้องเช็คให้ถูกเพราะแต่ละแบบมีความหมายต่างกัน (รายละเอียดเหตุผลอยู่ใน [wk11.md](wk11.md) หัวข้อ 2.3)

```javascript
try {
  const res = await axios.get(url, { timeout: 3000 });
  return res.data;
} catch (error) {
  if (error.response) {
    // เซิร์ฟเวอร์ตอบกลับมาแล้ว แต่ status ไม่ใช่ 2xx (เช่น 404, 500)
    console.error(error.response.status, error.response.data);
  } else if (error.code === "ECONNABORTED") {
    // timeout ตามค่าที่กำหนดไว้
    console.error("Request timed out");
  } else {
    // ไม่มีการตอบกลับเลย เช่น DNS ผิด, เครือข่ายขาด, connection refused
    console.error(`Network error: ${error.message}`);
  }
  throw error;
}
```

| สิ่งที่ตรวจ | ความหมาย |
| --- | --- |
| `error.response` มีค่า | เซิร์ฟเวอร์ตอบกลับจริง แต่ status code ผิดพลาด (4xx/5xx) |
| `error.code === "ECONNABORTED"` | เกิด timeout |
| ไม่เข้าทั้งสองเงื่อนไขบน | ปัญหาเครือข่าย (DNS, connection refused, ฯลฯ) |

---

## 6. Interceptor

ดักจับทุก request/response ก่อนถึงปลายทาง ใช้บ่อยสำหรับ logging หรือแนบ header ซ้ำ ๆ

```javascript
// ดักทุก request ก่อนส่งออกไปจริง
apiClient.interceptors.request.use((config) => {
  console.log(`Sending ${config.method.toUpperCase()} ${config.url}`);
  return config;
});

// ดักทุก response ก่อนถึงโค้ดที่เรียกใช้
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error(`Request failed: ${error.message}`);
    return Promise.reject(error); // ต้อง reject ต่อ ไม่งั้น error จะหายไปเงียบ ๆ
  },
);
```

---

## 7. แนบ JWT Token อัตโนมัติด้วย Interceptor

รูปแบบที่ใช้บ่อยเมื่อ backend ของเราต้องเรียก API ภายนอกที่ต้องยืนยันตัวตนด้วย token ของเราเอง (ไม่ใช่ token ของผู้ใช้ปลายทางที่เรียก frontend — ดู [wk15-frontend.md](wk15-frontend.md) หากต้องการแนบ JWT จาก frontend)

```javascript
apiClient.interceptors.request.use((config) => {
  config.headers.Authorization = `Bearer ${process.env.EXTERNAL_API_TOKEN}`;
  return config;
});
```

---

## 8. Retry/Timeout/Fallback แบบย่อ

โครงสร้างแบบเต็มพร้อมคำอธิบาย Exponential Backoff และ Jitter อยู่ใน [wk11.md](wk11.md) หัวข้อ 3-5 — นี่คือโครงย่อไว้เปิดดูเวลาเขียนโค้ด

```javascript
function isRetryable(error) {
  if (!error.response) return true; // network error หรือ timeout
  const status = error.response.status;
  return status === 429 || (status >= 500 && status < 600);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(url, timeoutMs = 3000, maxRetries = 2) {
  let attempt = 0;

  while (true) {
    try {
      const response = await axios.get(url, { timeout: timeoutMs });
      return response.data;
    } catch (error) {
      attempt += 1;
      const canRetry = attempt <= maxRetries && isRetryable(error);
      if (!canRetry) {
        // Fallback: คืนค่า default แทนที่จะปล่อยให้ระบบ crash หรือค้าง
        return { source: "fallback", message: "บริการภายนอกไม่พร้อมใช้งานในขณะนี้" };
      }

      const baseBackoffMs = 2 ** (attempt - 1) * 1000;
      const backoffMs = baseBackoffMs / 2 + Math.random() * (baseBackoffMs / 2);
      await delay(backoffMs);
    }
  }
}
```

---

## 9. ข้อผิดพลาดที่พบบ่อย

- **ไม่ครอบ `try/catch`** — Axios throw exception ทุกครั้งที่ status ไม่ใช่ 2xx ต่างจาก `fetch` ที่ต้องเช็ค `res.ok` เอง ถ้าไม่ครอบ `try/catch` โปรแกรมจะ crash ทันที
- **ลืมกำหนด `timeout`** — ค่า default ของ Axios คือไม่มี timeout เลย (รอไม่มีกำหนด) ต้องระบุเองทุกครั้งที่เรียก API ภายนอก
- **เข้าใจผิดว่า `error.response` คือ response ปกติ** — `error.response` มีค่าเฉพาะตอน error เท่านั้น (status ไม่ใช่ 2xx) ไม่ใช่ response ที่สำเร็จ
- **Retry ทุก error โดยไม่แยกประเภท** — error อย่าง `400`/`401`/`404` เป็นปัญหาฝั่งเราเอง retry ซ้ำแล้วผลลัพธ์จะผิดเหมือนเดิมทุกครั้ง ไม่ควร retry (ดูตารางในหัวข้อ 3.1 ของ [wk11.md](wk11.md))
- **ใส่ Exponential Backoff โดยไม่มี Jitter** — ทำให้เกิด thundering herd เมื่อ client หลายตัวพร้อมกัน retry ที่ time offset เดียวกันพอดี (รายละเอียดใน [wk11.md](wk11.md) หัวข้อ 3.3)
- **ลืมเรียก `return Promise.reject(error)` ใน response interceptor** — ถ้าลืม error จะถูกกลืนหายไปเงียบ ๆ โค้ดที่เรียกใช้จะไม่รู้ว่า request ล้มเหลว
- **ตั้ง `timeout` ไว้ที่ instance แต่ override ด้วยการเรียกไม่ส่ง config ที่ call ใด call หนึ่ง** เช่น เรียก `apiClient.get(url, { headers: {...} })` โดยลืมว่าการส่ง object config ใหม่เข้าไปจะ merge กับ default ของ instance อยู่แล้ว (ไม่ใช่ทับทั้งหมด) แต่บางครั้งนิสิตเข้าใจผิดว่าต้องส่ง `timeout` ซ้ำทุกครั้งแล้วลืมจนกลายเป็นไม่มี timeout ใน call นั้น ควรตรวจสอบว่า `axios.create()` ตั้งค่าที่ต้องใช้ซ้ำไว้ครบจริงหรือยัง
- **เข้าใจผิดว่า `axios.all()`/`Promise.all()` กับหลาย request จะ fail แยกกันเป็นรายตัว** — ถ้าใช้ `Promise.all([req1, req2, req3])` แล้ว request ใดตัวหนึ่ง reject ทั้งชุดจะ reject ทันที (fail-fast) ถึงแม้ request อื่นจะสำเร็จ ถ้าต้องการรู้ผลลัพธ์ของทุก request แม้บางตัว fail ต้องใช้ `Promise.allSettled()` แทน
- **ไม่ได้ตรวจสอบ `error.response` เป็น `undefined` ก่อนเข้าถึง `.status`** — เมื่อ error เกิดจาก network/timeout (ไม่มี `error.response`) การเขียน `error.response.status` ตรง ๆ โดยไม่เช็คก่อนจะทำให้เกิด `TypeError: Cannot read properties of undefined` ซ้อนขึ้นมาอีกชั้น กลบ error จริงที่อยากเห็น
- **ลืมว่า Axios แปลง response ที่ status เป็น `204 No Content` ให้ `res.data` เป็น empty string ไม่ใช่ `null`/`undefined`** — ถ้าเขียนโค้ดคาดว่า `res.data` จะเป็น `null` เสมอเมื่อไม่มี body จะพบว่าเงื่อนไข `if (!res.data)` ยังทำงานถูก (empty string เป็น falsy) แต่ถ้าเขียนเช็คแบบ `res.data === null` จะพลาดเพราะจริง ๆ แล้วเป็น `""`
- **เรียก External API ซ้ำหลายครั้งในฟังก์ชันเดียวโดยไม่มี timeout รวม (aggregate timeout)** — ถ้าแต่ละ call ตั้ง `timeout: 3000` แยกกัน แต่ฟังก์ชันเรียกต่อกันหลาย call (เช่น call แรก fail แล้ว retry อีก 2 ครั้ง) เวลารวมที่ผู้ใช้ปลายทางต้องรออาจนานกว่าที่ตั้งใจมาก ควรคิดเวลารวมสูงสุดที่ยอมรับได้ทั้ง flow ไม่ใช่แค่ต่อ call เดียว

---

## 10. ตัวเลือก/พารามิเตอร์เพิ่มเติม

| ตัวเลือก | ความหมาย |
| --- | --- |
| `validateStatus` | ฟังก์ชันกำหนดเองว่า status code ใดถือว่า "สำเร็จ" (ไม่ throw) ค่า default ถือว่า 2xx คือสำเร็จ ใช้เมื่อต้องการให้ Axios ไม่ throw แม้ status เป็น 404 (เช่น endpoint ที่ใช้ 404 แทนค่า "ไม่พบ" แบบปกติ) |
| `maxRedirects` | จำนวนครั้งสูงสุดที่ยอม follow HTTP redirect (default 5) ตั้งเป็น 0 เพื่อปิดการ follow redirect ไปเลย |
| `responseType` | รูปแบบข้อมูลที่คาดหวังจาก response เช่น `"json"` (default), `"blob"`, `"arraybuffer"`, `"stream"` ใช้ `"stream"`/`"arraybuffer"` เมื่อดาวน์โหลดไฟล์ |
| `maxContentLength` / `maxBodyLength` | จำกัดขนาดสูงสุด (ไบต์) ของ response/request body ที่ยอมรับ ป้องกัน response ขนาดใหญ่ผิดปกติทำให้ memory พุ่ง |
| `signal` (AbortController) | ใช้ยกเลิก request ระหว่างทาง เช่น ยกเลิกเมื่อผู้ใช้ปิดหน้าเว็บก่อน response กลับมา |
| `withCredentials` | ถ้าตั้งเป็น `true` จะส่ง cookie ข้าม origin ไปด้วย (เกี่ยวข้องกับ CORS ที่เรียนในสัปดาห์ที่ 4) |
| `transformRequest` / `transformResponse` | ฟังก์ชันแปลงข้อมูลก่อนส่ง/หลังรับ สามารถกำหนดเองแทน behavior default (เช่น JSON.stringify อัตโนมัติ) |
| `paramsSerializer` | กำหนดวิธีแปลง object ใน `params` เป็น query string เอง เช่น เมื่อต้องการ array เป็น `?id=1&id=2` แทน default ของ Axios |
| `axios.isAxiosError(error)` | ฟังก์ชัน type guard ตรวจสอบว่า error ที่จับได้มาจาก Axios จริงหรือไม่ มีประโยชน์เมื่อ catch block อาจเจอ error จากหลายแหล่ง |
| `axios.CancelToken` (รูปแบบเก่า) | วิธียกเลิก request แบบเดิมก่อนมี `AbortController` ปัจจุบันแนะนำให้ใช้ `signal` แทน |

---

## 11. ตัวอย่างโค้ดเพิ่มเติม

### 11.1 ยกเลิก Request ด้วย AbortController เมื่อเกิน timeout ที่กำหนดเอง (ยกเลิกจริง ไม่ใช่แค่รอ)

```javascript
async function fetchWithAbort(url, timeoutMs = 3000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await axios.get(url, { signal: controller.signal });
    return response.data;
  } catch (error) {
    if (axios.isCancel(error) || error.code === "ERR_CANCELED") {
      console.error("Request ถูกยกเลิกเพราะเกินเวลาที่กำหนด");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

### 11.2 เรียกหลาย External API พร้อมกันและรู้ผลลัพธ์ของทุกตัวแม้บางตัวล้มเหลว

```javascript
async function fetchDashboardData(studentId) {
  const results = await Promise.allSettled([
    apiClient.get(`/students/${studentId}/grades`),
    apiClient.get(`/students/${studentId}/attendance`),
    apiClient.get(`/students/${studentId}/announcements`),
  ]);

  return {
    grades: results[0].status === "fulfilled" ? results[0].value.data : null,
    attendance: results[1].status === "fulfilled" ? results[1].value.data : null,
    announcements: results[2].status === "fulfilled" ? results[2].value.data : [],
  };
}
```

วิธีนี้ทำให้หน้า dashboard ยังแสดงข้อมูลบางส่วนได้ แม้ service หนึ่งในสามล่ม (graceful degradation) ต่างจาก `Promise.all()` ที่จะทำให้ทั้งฟังก์ชัน reject ทันทีที่ตัวใดตัวหนึ่ง fail

### 11.3 ตรวจสอบ error ด้วย `axios.isAxiosError()` เมื่อ catch block อาจมี error จากหลายแหล่ง

```javascript
async function callExternalApi(url) {
  try {
    const response = await apiClient.get(url);
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      if (error.response) {
        console.error(`External API ตอบ ${error.response.status}:`, error.response.data);
      } else {
        console.error(`เรียก External API ไม่สำเร็จ: ${error.message}`);
      }
    } else {
      // error ที่ไม่ได้มาจาก Axios เช่น JSON.parse error ใน interceptor
      console.error("เกิดข้อผิดพลาดที่ไม่คาดคิด:", error);
    }
    throw error;
  }
}
```

### 11.4 จำกัดขนาด response ที่ยอมรับเพื่อป้องกัน memory พุ่งจาก External API ที่ไม่น่าเชื่อถือ

```javascript
const apiClient = axios.create({
  baseURL: process.env.EXTERNAL_API_BASE_URL,
  timeout: 3000,
  maxContentLength: 5 * 1024 * 1024, // ไม่รับ response เกิน 5MB
  maxBodyLength: 1 * 1024 * 1024, // ไม่ส่ง request body เกิน 1MB
});
```

## เอกสารอ้างอิงประกอบ

- Axios Documentation: https://axios-http.com/docs/intro
- เนื้อหาสอนเต็ม (หลักการ Retry/Timeout/Fallback): [wk11.md](wk11.md)
- ปฏิบัติการ: [wk11-lab.md](wk11-lab.md)
