# บันทึกผลการทดสอบกรณีจำลองความผิดพลาด (Failure Scenario Test Results)
## โครงงานระยะที่ 2: External API Integration & Resilience
- **ระบบ**: ระบบข้อมูลฟิตเนส (Fitness & Gym Management System) [Pno: 9]
- **รหัสนิสิต**: 67160178
- **บริการภายนอกที่เชื่อมต่อ**: Open-Meteo Weather API (`https://api.open-meteo.com/v1/forecast`)
- **วัตถุประสงค์ของการเชื่อมต่อ**: ตรวจสอบสภาพอากาศ อุณหภูมิ และคุณภาพอากาศบริเวณที่ตั้งของสาขาฟิตเนส เพื่อแนะนำความเหมาะสมของคลาสออกกำลังกายทั้งในร่มและกลางแจ้ง

---

## 1. การกำหนดค่ากลไกความทนทาน (Resilience Configuration)

โมดูล `services/external-api.js` ถูกออกแบบให้รองรับความทนทานต่อความผิดพลาด 3 มิติ:

1. **Timeout**: กำหนดเวลาสูงสุด `3000ms` (3 วินาที) หากบริการภายนอกไม่ตอบกลับในเวลาที่กำหนด จะตัดการเชื่อมต่อทันทีเพื่อป้องกันเธรดค้าง
2. **Retry Logic**: เมื่อเกิด Network Error หรือรหัสข้อผิดพลาดระดับ Server (`HTTP 5xx`) ระบบจะพยายามเรียกซ้ำอัตโนมัติ `2 ครั้ง` (รวมการเรียกครั้งแรกเป็น 3 ครั้ง) โดยใช้ **Exponential Backoff**:
   - ลองครั้งที่ 1 (Initial): เกิดข้อผิดพลาด $\rightarrow$ หน่วงเวลา $500\text{ ms}$
   - ลองครั้งที่ 2 (Retry #1): เกิดข้อผิดพลาด $\rightarrow$ หน่วงเวลา $1000\text{ ms}$
   - ลองครั้งที่ 3 (Retry #2): เกิดข้อผิดพลาด $\rightarrow$ สลับสู่ Fallback ทันที
3. **Fallback Logic**: หากการเรียกซ้ำล้มเหลวครบทุกครั้ง หรือหมดเวลา (Timeout) ระบบจะไม่ Crash หรือส่ง Error 500 ให้ผู้ใช้ แต่จะส่งมอบข้อมูลสภาพอากาศสำรองที่ปลอดภัย พร้อมแนบตัวบ่งชี้ `isFallback: true` และระบุ `fallbackReason` ชัดเจน

---

## 2. ตารางสรุปผลการทดสอบสถานการณ์จำลอง (Test Scenarios)

| Scenario ID | สถานการณ์ทดสอบ | พฤติกรรมที่คาดหวัง | จำนวนครั้งที่เรียก (Attempts) | ผลลัพธ์ที่ได้จริง | สถานะ |
| :--- | :--- | :--- | :---: | :--- | :---: |
| **SC-01** | **Normal Operation (ปกติ)**<br>เชื่อมต่อ Open-Meteo สำเร็จ | ได้รับข้อมูลสภาพอากาศสด<br>`isFallback: false` | 1 ครั้ง | ได้อุณหภูมิปัจจุบัน 29.6°C<br>ใช้เวลาประมาณ 180ms | **PASS** |
| **SC-02** | **Network Error (เครือข่ายขัดข้อง)**<br>จำลอง Domain ล่มหรือไม่พบโฮสต์ | ลองซ้ำ 2 ครั้งด้วย Delay<br>แล้วตอบกลับด้วย Fallback | 3 ครั้ง<br>(1 call + 2 retries) | ระบบ Retry ครบ 2 ครั้งแล้วสลับไปใช้ Fallback ข้อมูลสำรองอย่างปลอดภัย | **PASS** |
| **SC-03** | **Timeout Error (ภายนอกล่าช้า)**<br>จำลองการตอบสนองช้าเกิน 3 วินาที | ตัดการรอที่ 3 วินาที<br>สลับสู่ Fallback ไม่ให้ระบบค้าง | 3 ครั้ง<br>(Timeout ละ 3,000ms) | ระบบตัดการเชื่อมต่อตามกำหนด ไม่เกิดปัญหาค้าง และส่ง Fallback Data | **PASS** |
| **SC-04** | **Server Error (HTTP 500)**<br>จำลองภายนอกส่งรหัส 500 | ตรวจจับ 5xx แล้วลองซ้ำ<br>หากครบกำหนดจึง Fallback | 3 ครั้ง<br>(1 call + 2 retries) | ระบบตรวจสอบรหัส 500 แล้ว Retry ตามเงื่อนไข ก่อนส่งมอบ Fallback สำเร็จ | **PASS** |

---

## 3. รายละเอียดการทดสอบแต่ละกรณีพร้อม Log การทำงานจริง

### Scenario 1: Normal Operation (สถานการณ์ปกติ)
* **URL ทดสอบ**: `GET /api/v1/gyms/1/weather`
* **Response Body**:
```json
{
  "message": "ดึงข้อมูลสภาพอากาศสำเร็จ",
  "data": {
    "gymId": 1,
    "gymName": "FitZone สยามสแควร์",
    "location": "สยามสแควร์",
    "temperatureCelsius": 29.6,
    "relativeHumidity": 62,
    "windSpeedKmh": 9.8,
    "weatherCondition": "อากาศปกติ เหมาะแก่การออกกำลังกาย",
    "recommendation": "ระบบฟิตเนสพร้อมให้บริการคลาสตามตารางปกติ",
    "isFallback": false,
    "fetchedAt": "2026-10-25T11:37:32.100Z",
    "durationMs": 182
  },
  "resilience": {
    "attemptsUsed": 1,
    "isFallback": false,
    "logs": [
      "[Attempt 1/3] กำลังเรียก External API: https://api.open-meteo.com/... (Timeout: 3000ms)",
      "[Attempt 1] สำเร็จ (Status: 200, Time: 182ms)"
    ]
  }
}
```

---

### Scenario 2: Network Error Simulation (จำลองระบบเครือข่ายภายนอกล่ม)
* **URL ทดสอบ**: `GET /api/v1/gyms/1/weather?simulate=network`
* **Response Body**:
```json
{
  "message": "ดึงข้อมูลสภาพอากาศสำเร็จ",
  "data": {
    "gymId": 1,
    "gymName": "FitZone สยามสแควร์",
    "temperatureCelsius": 30.0,
    "relativeHumidity": 65,
    "windSpeedKmh": 10.5,
    "weatherCondition": "แจ่มใส (ข้อมูลสำรองโดยประมาณ)",
    "airQualityIndex": 45,
    "airQualityStatus": "คุณภาพอากาศดี",
    "recommendation": "สภาพอากาศและคุณภาพอากาศเหมาะสมสำหรับการออกกำลังกายทั้งในร่มและกลางแจ้ง",
    "isFallback": true,
    "fallbackReason": "External service failed after 3 attempts",
    "fetchedAt": "2026-10-25T11:37:34.200Z"
  },
  "resilience": {
    "attemptsUsed": 3,
    "isFallback": true,
    "logs": [
      "[Attempt 1/3] กำลังเรียก External API (Timeout: 3000ms)",
      "[Attempt 1] ล้มเหลว (NETWORK_ERROR: getaddrinfo ENOTFOUND)",
      "[Retry Logic] จะลองใหม่ครั้งที่ 1 ในอีก 500ms (Exponential Backoff)",
      "[Attempt 2/3] กำลังเรียก External API (Timeout: 3000ms)",
      "[Attempt 2] ล้มเหลว (NETWORK_ERROR: getaddrinfo ENOTFOUND)",
      "[Retry Logic] จะลองใหม่ครั้งที่ 2 ในอีก 1000ms (Exponential Backoff)",
      "[Attempt 3/3] กำลังเรียก External API (Timeout: 3000ms)",
      "[Attempt 3] ล้มเหลว (NETWORK_ERROR: getaddrinfo ENOTFOUND)",
      "[Retry Exhausted] เรียกซ้ำครบ 2 ครั้งแล้ว สลับไปใช้ Fallback Logic"
    ]
  }
}
```

---

### Scenario 3: External Server 500 Error Simulation (จำลองบริการภายนอกส่ง 500)
* **URL ทดสอบ**: `GET /api/v1/gyms/1/weather?simulate=500`
* **Response Body**:
```json
{
  "message": "ดึงข้อมูลสภาพอากาศสำเร็จ",
  "data": {
    "gymId": 1,
    "gymName": "FitZone สยามสแควร์",
    "isFallback": true,
    "fallbackReason": "External service failed after 3 attempts"
  },
  "resilience": {
    "attemptsUsed": 3,
    "isFallback": true,
    "logs": [
      "[Attempt 1/3] กำลังเรียก External API",
      "[Attempt 1] ล้มเหลว (HTTP_500: Request failed with status code 500)",
      "[Retry Logic] จะลองใหม่ครั้งที่ 1 ในอีก 500ms",
      "[Attempt 2/3] กำลังเรียก External API",
      "[Attempt 2] ล้มเหลว (HTTP_500: Request failed with status code 500)",
      "[Retry Logic] จะลองใหม่ครั้งที่ 2 ในอีก 1000ms",
      "[Attempt 3/3] กำลังเรียก External API",
      "[Attempt 3] ล้มเหลว (HTTP_500: Request failed with status code 500)",
      "[Retry Exhausted] เรียกซ้ำครบ 2 ครั้งแล้ว สลับไปใช้ Fallback Logic"
    ]
  }
}
```

---

## 4. สรุปเปรียบเทียบ: มีระบบ Resilience vs ไม่มีระบบ Resilience

| รายการ | เมื่อไม่มีระบบ Resilience | เมื่อมีระบบ Resilience (ที่พัฒนาในโปรเจกต์) |
| :--- | :--- | :--- |
| **เมื่อเน็ตเวิร์กภายนอกดับ** | เซิร์ฟเวอร์ส่ง Error 500 ทันที หรือหยุดทำงาน | ทำการ Retry 2 ครั้งพร้อม Exponential Backoff แล้วตอบกลับค่าสำรอง ระบบให้บริการต่อได้ปกติ |
| **เมื่อบริการภายนอกค้างช้า** | Request รอไม่สิ้นสุด ส่งผลให้ Connection Pool ฝั่งเราค้างตาม | ตัดการเชื่อมต่อทันทีที่ 3 วินาที (Timeout) และคืนค่า Fallback ทันที |
| **ประสบการณ์ของผู้ใช้งาน (UX)** | ผู้ใช้เห็นหน้าจอ Error หรือหมุนค้าง | ผู้ใช้ยังคงได้รับข้อมูลสภาพอากาศและคำแนะนำ สามารถจองคลาสต่อได้ราบรื่น |
