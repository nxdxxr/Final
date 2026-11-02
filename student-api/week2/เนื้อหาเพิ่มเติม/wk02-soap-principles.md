# สัปดาห์ที่ 2 (เสริม): SOAP (Simple Object Access Protocol) โดยละเอียด

เอกสารนี้ขยายความจากหัวข้อ 2. SOAP ในเอกสาร [wk02.md](wk02.md) โดยอธิบายหลักการทำงาน โครงสร้าง และแนวคิดสำคัญของ SOAP อย่างละเอียด พร้อมตัวอย่างโค้ดฝั่ง Backend (Node.js/Express) และฝั่ง Frontend (JavaScript, Fetch API) ประกอบ เพื่อให้เห็นภาพการนำไปใช้งานจริงตั้งแต่การสร้างบริการที่ตอบสนองด้วย SOAP message จนถึงการเรียกใช้จาก client

---

## 1. ความเป็นมาและแนวคิดหลัก

SOAP (Simple Object Access Protocol) เป็นโพรโทคอลสำหรับแลกเปลี่ยนข้อมูลเชิงโครงสร้างระหว่างระบบ ถูกเสนอขึ้นครั้งแรกในปี ค.ศ. 1998 โดยความร่วมมือระหว่าง Microsoft และ UserLand Software จากนั้นข้อกำหนด SOAP 1.1 ถูกนำเสนอต่อองค์กร W3C (World Wide Web Consortium) ในปี ค.ศ. 2000 โดยได้รับการสนับสนุนเพิ่มเติมจากบริษัทอื่น เช่น IBM และ Lotus จนกลายเป็นมาตรฐานที่ใช้งานแพร่หลาย แรงจูงใจหลักในการพัฒนาคือความต้องการมาตรฐานกลางที่ทำให้ระบบซอฟต์แวร์ต่างแพลตฟอร์มและต่างภาษาโปรแกรมมิ่งสามารถสื่อสารกันได้อย่างน่าเชื่อถือ โดยไม่ขึ้นกับผู้ผลิตซอฟต์แวร์รายใดรายหนึ่ง

ต่างจาก REST และ GraphQL ที่เป็นรูปแบบสถาปัตยกรรมหรือภาษา query ตามลำดับ **SOAP เป็นโพรโทคอล (protocol)** อย่างแท้จริง กล่าวคือมีข้อกำหนดที่ตายตัวและเข้มงวดเกี่ยวกับรูปแบบข้อความ วิธีการประมวลผล และการจัดการข้อผิดพลาด ทำให้ SOAP เหมาะสมกับระบบที่ต้องการความน่าเชื่อถือและความปลอดภัยสูง เช่น ระบบธุรกรรมทางการเงินระหว่างธนาคาร หรือระบบแลกเปลี่ยนข้อมูลของหน่วยงานภาครัฐ

ข้อความ SOAP ทุกฉบับใช้รูปแบบ **XML (Extensible Markup Language)** เป็นรูปแบบข้อมูลหลักเพียงรูปแบบเดียว แตกต่างจาก REST ที่นิยมใช้ JSON

---

## 2. WSDL (Web Services Description Language)

SOAP มักทำงานร่วมกับ **WSDL** ซึ่งเป็นเอกสาร XML ที่อธิบายรายละเอียดของเว็บเซอร์วิสอย่างเป็นทางการ ประกอบด้วย

- เซอร์วิสมีฟังก์ชัน (operation) ใดบ้าง
- แต่ละฟังก์ชันรับพารามิเตอร์ชนิดใด และคืนค่าชนิดใด
- ที่อยู่ (endpoint URL) ที่ใช้เรียกเซอร์วิส

WSDL ทำหน้าที่คล้ายกับ "สัญญา" (contract) ระหว่าง client และ server เช่นเดียวกับที่ schema ทำหน้าที่ใน GraphQL แต่มีความเข้มงวดกว่า เนื่องจากเครื่องมือพัฒนาซอฟต์แวร์จำนวนมากสามารถอ่านไฟล์ WSDL แล้วสร้างโค้ดสำหรับเรียกใช้เซอร์วิส (client stub) ได้โดยอัตโนมัติ

ตัวอย่างโครงสร้าง WSDL อย่างง่าย (แสดงเฉพาะส่วนสำคัญเพื่อความเข้าใจ)

```xml
<?xml version="1.0"?>
<definitions name="StudentService"
  targetNamespace="http://example.com/student"
  xmlns="http://schemas.xmlsoap.org/wsdl/"
  xmlns:soap="http://schemas.xmlsoap.org/wsdl/soap/"
  xmlns:xsd="http://www.w3.org/2001/XMLSchema">

  <message name="GetStudentRequest">
    <part name="studentId" type="xsd:int" />
  </message>

  <message name="GetStudentResponse">
    <part name="name" type="xsd:string" />
    <part name="major" type="xsd:string" />
  </message>

  <portType name="StudentPortType">
    <operation name="GetStudent">
      <input message="GetStudentRequest" />
      <output message="GetStudentResponse" />
    </operation>
  </portType>

  <binding name="StudentBinding" type="StudentPortType">
    <soap:binding transport="http://schemas.xmlsoap.org/soap/http" />
    <operation name="GetStudent">
      <soap:operation soapAction="http://example.com/student/GetStudent" />
    </operation>
  </binding>

  <service name="StudentService">
    <port name="StudentPort" binding="StudentBinding">
      <soap:address location="http://localhost:3000/soap/student" />
    </port>
  </service>
</definitions>
```

---

## 3. โครงสร้างของ SOAP Message

ข้อความ SOAP ทุกฉบับจะห่อหุ้ม (envelope) ด้วยโครงสร้าง XML ที่มีรูปแบบตายตัว ประกอบด้วย 3 ส่วนหลัก

### 3.1 Envelope

**Envelope** คือส่วนนอกสุดที่ห่อหุ้มข้อความ SOAP ทั้งหมดไว้ ทำหน้าที่ระบุว่าเอกสาร XML นี้เป็นข้อความ SOAP และระบุ namespace ของมาตรฐาน SOAP ที่ใช้ (เช่น SOAP 1.1 หรือ SOAP 1.2)

### 3.2 Header (ส่วนเสริม)

**Header** เป็นส่วนที่ไม่บังคับต้องมี ใช้เก็บข้อมูลเสริมที่ไม่ใช่เนื้อหาหลักของคำขอ เช่น ข้อมูลการยืนยันตัวตน (authentication), หมายเลขธุรกรรม (transaction ID), หรือข้อมูลที่เกี่ยวกับมาตรฐานความปลอดภัย WS-Security

### 3.3 Body

**Body** คือส่วนที่บรรจุเนื้อหาหลักของคำขอหรือคำตอบ เช่น ชื่อฟังก์ชันที่ต้องการเรียก พารามิเตอร์ที่ส่งไป หรือผลลัพธ์ที่ได้รับกลับ

```xml
<?xml version="1.0"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
  </soap:Header>
  <soap:Body>
    <GetStudentRequest>
      <StudentId>1</StudentId>
    </GetStudentRequest>
  </soap:Body>
</soap:Envelope>
```

### 3.4 ตัวอย่าง SOAP Request และ Response แบบสมบูรณ์

**คำขอ (Request)** — เรียกฟังก์ชัน `GetStudent` พร้อมส่ง `StudentId` เท่ากับ 1

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Header>
    <AuthToken>eyJhbGciOiJIUzI1NiIs...</AuthToken>
  </soap:Header>
  <soap:Body>
    <GetStudentRequest xmlns="http://example.com/student">
      <StudentId>1</StudentId>
    </GetStudentRequest>
  </soap:Body>
</soap:Envelope>
```

**คำตอบ (Response)** — คืนค่าข้อมูลนิสิตที่ค้นพบ

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetStudentResponse xmlns="http://example.com/student">
      <Name>สมชาย ใจดี</Name>
      <Major>วิทยาการคอมพิวเตอร์</Major>
    </GetStudentResponse>
  </soap:Body>
</soap:Envelope>
```

### 3.5 การจัดการข้อผิดพลาดด้วย SOAP Fault

หากเกิดข้อผิดพลาดระหว่างการประมวลผล SOAP จะตอบกลับด้วยโครงสร้างมาตรฐานที่เรียกว่า **Fault** ซึ่งอยู่ภายในส่วน `Body` เช่นกัน แทนการใช้ HTTP Status Code เป็นหลักในการบ่งบอกข้อผิดพลาดแบบที่ REST ใช้

```xml
<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope
  xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>soap:Client</faultcode>
      <faultstring>ไม่พบข้อมูลนิสิตที่ระบุ</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>
```

โดยทั่วไป เมื่อเกิด SOAP Fault เซิร์ฟเวอร์จะยังคงตอบกลับด้วย HTTP Status Code `500 Internal Server Error` เพื่อบ่งชี้ว่าคำขอไม่สามารถประมวลผลได้สำเร็จ แม้ตัวข้อความ SOAP เองจะมีโครงสร้างที่ถูกต้องสมบูรณ์ก็ตาม

---

## 4. Backend: การสร้าง SOAP-style Endpoint ด้วย Node.js และ Express

แม้ในทางปฏิบัติของอุตสาหกรรม ระบบ SOAP มักถูกสร้างด้วยภาษาและเฟรมเวิร์กที่มีเครื่องมือรองรับ WSDL อย่างสมบูรณ์ (เช่น Java กับ Apache CXF หรือ .NET) แต่หลักการเบื้องหลัง SOAP (การรับ-ส่ง XML envelope ผ่าน HTTP `POST`) สามารถจำลองด้วย Node.js และ Express ได้เพื่อความเข้าใจ โดยใช้ไลบรารีแยกวิเคราะห์ (parse) และสร้าง (build) เอกสาร XML

### 4.1 การติดตั้ง

```bash
npm install express xml2js
```

`xml2js` เป็นไลบรารีสำหรับแปลง XML เป็น JavaScript object (parse) และแปลงกลับ (build) ซึ่งช่วยให้ประมวลผลเนื้อหาภายใน SOAP Body ได้สะดวกขึ้น

### 4.2 การรับและตอบกลับ SOAP Message

```javascript
// server.js
const express = require("express");
const { parseStringPromise, Builder } = require("xml2js");

const app = express();

// SOAP ส่งข้อมูลเป็น XML จึงต้องอ่าน body แบบข้อความดิบ (raw text)
// แทนการใช้ express.json() ที่ใช้กับ REST
app.use(express.text({ type: "text/xml" }));

const students = [{ id: 1, name: "สมชาย ใจดี", major: "วิทยาการคอมพิวเตอร์" }];

// endpoint เดียวรับคำขอ SOAP ทุกประเภท เช่นเดียวกับแนวคิดของ GraphQL
// แต่ SOAP จะแยกความแตกต่างของฟังก์ชันที่เรียกจากชื่อ element ภายใน Body แทน
app.post("/soap/student", async (req, res) => {
  const xmlBody = req.body;

  // แยกวิเคราะห์ XML ที่ client ส่งมาให้เป็น JavaScript object
  const parsed = await parseStringPromise(xmlBody, { explicitArray: false });
  const envelope = parsed["soap:Envelope"];
  const body = envelope["soap:Body"];
  const request = body["GetStudentRequest"];

  const studentId = Number(request["StudentId"]);
  const student = students.find((s) => s.id === studentId);

  const builder = new Builder({ headless: true });

  if (!student) {
    // กรณีไม่พบข้อมูล ตอบกลับด้วยโครงสร้าง SOAP Fault ตามมาตรฐาน
    const faultXml = builder.buildObject({
      "soap:Envelope": {
        $: { "xmlns:soap": "http://schemas.xmlsoap.org/soap/envelope/" },
        "soap:Body": {
          "soap:Fault": {
            faultcode: "soap:Client",
            faultstring: "ไม่พบข้อมูลนิสิตที่ระบุ",
          },
        },
      },
    });
    res.status(500).type("text/xml").send(faultXml);
    return;
  }

  // กรณีพบข้อมูล ห่อหุ้มผลลัพธ์ด้วย SOAP Envelope แล้วส่งกลับ
  const responseXml = builder.buildObject({
    "soap:Envelope": {
      $: { "xmlns:soap": "http://schemas.xmlsoap.org/soap/envelope/" },
      "soap:Body": {
        GetStudentResponse: {
          Name: student.name,
          Major: student.major,
        },
      },
    },
  });

  res.status(200).type("text/xml").send(responseXml);
});

app.listen(3000, () => console.log("SOAP-style server running on port 3000"));
```

ข้อสังเกตสำคัญที่ต่างจาก REST: ทุกคำขอไปยัง SOAP endpoint ใช้ HTTP Method `POST` เพียงอย่างเดียว และ Content-Type เป็น `text/xml` (หรือ `application/soap+xml` สำหรับ SOAP 1.2) แทนที่จะเป็น `application/json` และการแยกแยะว่า client ต้องการเรียกฟังก์ชันใดต้องอาศัยการอ่านชื่อ element ภายใน Body (เช่น `GetStudentRequest`) แทนการอาศัย URL หรือ HTTP Method ที่แตกต่างกันแบบ REST

---

## 5. Frontend: การเรียกใช้ SOAP Service ด้วย JavaScript

เนื่องจาก SOAP ทำงานผ่าน HTTP `POST` เช่นเดียวกับ GraphQL จึงสามารถเรียกใช้ได้ด้วย Fetch API มาตรฐาน โดยต้องสร้างข้อความ SOAP Envelope เป็น string เอง แล้วกำหนด Header `Content-Type` เป็น `text/xml`

### 5.1 การสร้างและส่ง SOAP Request

```javascript
// client.js
async function getStudent(studentId) {
  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
      <soap:Body>
        <GetStudentRequest xmlns="http://example.com/student">
          <StudentId>${studentId}</StudentId>
        </GetStudentRequest>
      </soap:Body>
    </soap:Envelope>`;

  const res = await fetch("http://localhost:3000/soap/student", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: "http://example.com/student/GetStudent",
    },
    body: soapEnvelope,
  });

  const xmlText = await res.text();

  if (!res.ok) {
    console.error("เกิดข้อผิดพลาดจากฝั่งเซิร์ฟเวอร์:", xmlText);
    return null;
  }

  return parseStudentResponse(xmlText);
}
```

ข้อสังเกต: Header `SOAPAction` เป็นคุณลักษณะเฉพาะของ SOAP 1.1 ที่ใช้ระบุว่า client ต้องการเรียกฟังก์ชันใด ช่วยให้ตัวกลางเครือข่าย (เช่น firewall หรือ proxy) สามารถกำหนดเส้นทางคำขอได้โดยไม่ต้องแกะเนื้อหา XML ทั้งหมด

### 5.2 การแยกวิเคราะห์ผลลัพธ์ SOAP Response

เนื่องจาก JavaScript ในเบราว์เซอร์มี `DOMParser` เป็นเครื่องมือมาตรฐานในตัวสำหรับแยกวิเคราะห์เอกสาร XML จึงไม่จำเป็นต้องพึ่งพาไลบรารีภายนอกฝั่ง frontend

```javascript
function parseStudentResponse(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const nameElement = xmlDoc.getElementsByTagName("Name")[0];
  const majorElement = xmlDoc.getElementsByTagName("Major")[0];

  if (!nameElement || !majorElement) {
    console.error("รูปแบบผลลัพธ์ไม่ถูกต้องหรือพบ SOAP Fault");
    return null;
  }

  return {
    name: nameElement.textContent,
    major: majorElement.textContent,
  };
}

getStudent(1).then((student) => {
  if (student) {
    document.getElementById("student-name").textContent = student.name;
  }
});
```

### 5.3 ผลลัพธ์ที่ได้รับกลับ

เมื่อเรียก `getStudent(1)` ตามตัวอย่างข้างต้น และพบข้อมูลนิสิต ผลลัพธ์ที่ได้จาก `parseStudentResponse` จะเป็น JavaScript object ดังนี้

```javascript
{
  name: "สมชาย ใจดี",
  major: "วิทยาการคอมพิวเตอร์"
}
```

จะเห็นได้ว่า แม้ SOAP จะสื่อสารด้วยรูปแบบ XML ที่มีโครงสร้างซับซ้อนกว่า JSON แต่ท้ายที่สุดฝั่ง client ยังคงต้องแปลงผลลัพธ์กลับมาเป็นรูปแบบข้อมูลที่ใช้งานได้สะดวกในโค้ด JavaScript ซึ่งเป็นภาระเพิ่มเติมที่ REST และ GraphQL ไม่มี เนื่องจากทั้งสองใช้ JSON เป็นหลัก ซึ่งเป็นรูปแบบข้อมูลที่ JavaScript อ่านได้โดยตรง

---

## 6. WS-Security: มาตรฐานความปลอดภัยระดับข้อความ

จุดเด่นสำคัญประการหนึ่งของ SOAP คือการรองรับ **WS-Security** ซึ่งเป็นมาตรฐานความปลอดภัยที่ทำงานในระดับข้อความ (message-level security) ไม่ใช่เพียงระดับการเชื่อมต่อ (transport-level security) แบบที่ HTTPS ให้ได้เพียงอย่างเดียว

ความแตกต่างสำคัญคือ HTTPS เข้ารหัสข้อมูลเฉพาะระหว่างการรับส่งผ่านเครือข่าย (in transit) เท่านั้น แต่ WS-Security สามารถเข้ารหัสหรือลงลายเซ็นดิจิทัล (digital signature) เฉพาะบางส่วนของข้อความ SOAP ได้ ทำให้ข้อความยังคงปลอดภัยแม้จะถูกส่งต่อผ่านตัวกลางหลายทอด (เช่น กรณีที่ข้อความต้องผ่านหลายระบบก่อนถึงปลายทางสุดท้าย) ซึ่งเป็นคุณสมบัติที่ REST และ GraphQL ไม่มีมาตรฐานกลางที่เทียบเท่า

```xml
<soap:Header>
  <wsse:Security xmlns:wsse="http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd">
    <wsse:UsernameToken>
      <wsse:Username>student_api_client</wsse:Username>
      <wsse:Password Type="...PasswordDigest">********</wsse:Password>
    </wsse:UsernameToken>
  </wsse:Security>
</soap:Header>
```

---

## 7. ข้อดีและข้อจำกัดของ SOAP

**ข้อดี**

- มีมาตรฐานที่เข้มงวดและชัดเจน เหมาะกับระบบที่ต้องการความน่าเชื่อถือสูง เช่น ระบบธนาคารหรือระบบประกันภัย
- รองรับ WS-Security ซึ่งเป็นมาตรฐานความปลอดภัยระดับสูงสำหรับข้อความ (message-level security) ที่ปลอดภัยกว่าการพึ่งพา transport-level security เพียงอย่างเดียว
- ทำงานได้กับหลายโพรโทคอลขนส่ง (transport protocol) ไม่จำกัดเฉพาะ HTTP เช่น สามารถทำงานผ่าน SMTP หรือ TCP ได้
- มี WSDL เป็นสัญญาที่ชัดเจน ทำให้เครื่องมือพัฒนาซอฟต์แวร์สามารถสร้างโค้ดสำหรับเรียกใช้เซอร์วิส (client stub) ได้โดยอัตโนมัติ ลดความผิดพลาดจากการเขียนโค้ดเรียกใช้ด้วยมือ

**ข้อจำกัด**

- ข้อมูลในรูปแบบ XML มีขนาดใหญ่กว่ารูปแบบอื่น ทำให้สิ้นเปลืองแบนด์วิดท์ เมื่อเทียบกับ JSON ที่ใช้ใน REST และ GraphQL
- โครงสร้างซับซ้อนและมีขั้นตอนการพัฒนาที่ใช้เวลานานกว่ามาตรฐานอื่น ทั้งการเขียน WSDL และการแยกวิเคราะห์ XML
- ไม่เหมาะกับแอปพลิเคชันสมัยใหม่ที่ต้องการความเร็วและความยืดหยุ่นสูง เช่น แอปพลิเคชันมือถือที่มีข้อจำกัดด้านแบนด์วิดท์และทรัพยากรเครื่อง
- การทำแคช (caching) ทำได้ยาก เนื่องจากทุกคำขอใช้ HTTP Method `POST` เพียงอย่างเดียว ไม่สามารถใช้กลไก HTTP caching มาตรฐานที่อาศัย URL และ Method `GET` ได้เหมือน REST
- ฝั่ง frontend ต้องมีขั้นตอนแปลง XML กลับเป็นโครงสร้างข้อมูลที่ใช้งานได้ (เช่นด้วย `DOMParser`) เพิ่มความซับซ้อนของโค้ดฝั่ง client เมื่อเทียบกับ JSON ที่ใช้งานได้ทันที

---

## 8. เปรียบเทียบแนวคิดโดยสรุป

| ประเด็น                    | SOAP                  | REST                                    | GraphQL                                |
| -------------------------- | --------------------- | --------------------------------------- | -------------------------------------- |
| ประเภท                     | โพรโทคอล (Protocol)   | รูปแบบสถาปัตยกรรม (Architectural Style) | ภาษา Query (Query Language)            |
| รูปแบบข้อมูล               | XML เท่านั้น          | นิยม JSON                               | JSON                                   |
| HTTP Method ที่ใช้         | POST เพียงอย่างเดียว  | หลากหลายตามการกระทำ                     | ส่วนใหญ่ใช้ POST เพียงอย่างเดียว       |
| สัญญาระหว่าง client-server | WSDL                  | เอกสารประกอบภายนอก เช่น OpenAPI/Swagger | Schema ในตัว                           |
| การจัดการข้อผิดพลาด        | SOAP Fault ภายใน Body | HTTP Status Code                        | ฟิลด์ `errors` ในผลลัพธ์               |
| ความปลอดภัยระดับข้อความ    | รองรับ WS-Security    | ไม่มีมาตรฐานกลาง อาศัย HTTPS/OAuth/JWT  | ไม่มีมาตรฐานกลาง อาศัย HTTPS/OAuth/JWT |
| การทำแคช                   | ทำได้ยาก              | ทำได้ง่ายด้วย HTTP caching มาตรฐาน      | ทำได้ยากกว่า REST                      |

---

## สรุปเนื้อหาสำคัญ

1. SOAP เป็นโพรโทคอลที่ใช้ XML เป็นรูปแบบข้อมูลหลัก มีข้อกำหนดเข้มงวดและชัดเจนกว่ามาตรฐานเว็บเซอร์วิสอื่น
2. ข้อความ SOAP ทุกฉบับห่อหุ้มด้วยโครงสร้าง Envelope ซึ่งประกอบด้วย Header (ส่วนเสริม) และ Body (เนื้อหาหลัก)
3. WSDL ทำหน้าที่เป็นสัญญาที่อธิบายฟังก์ชัน พารามิเตอร์ และที่อยู่ของเซอร์วิสอย่างเป็นทางการ
4. เมื่อเกิดข้อผิดพลาด SOAP จะตอบกลับด้วยโครงสร้าง Fault ภายใน Body แทนการอาศัย HTTP Status Code เป็นหลักแบบ REST
5. SOAP รองรับ WS-Security ซึ่งเป็นมาตรฐานความปลอดภัยระดับข้อความที่ REST และ GraphQL ไม่มีมาตรฐานกลางเทียบเท่า
6. ฝั่ง Backend และ Frontend ด้วย JavaScript สามารถจำลองการทำงานของ SOAP ได้ผ่านการรับ-ส่งข้อความ XML ด้วย HTTP POST แม้ในทางปฏิบัติจริงมักใช้ภาษาที่มีเครื่องมือรองรับ WSDL โดยเฉพาะ
7. ข้อจำกัดหลักของ SOAP คือขนาดข้อมูลที่ใหญ่ ความซับซ้อนในการพัฒนา และการทำแคชที่ยากกว่า REST

---

## เอกสารอ้างอิง (Reference)

1. W3C. _SOAP Version 1.2 Specification_. สืบค้นจาก https://www.w3.org/TR/soap12/
2. W3C. _Web Services Description Language (WSDL) 1.1_. สืบค้นจาก https://www.w3.org/TR/wsdl
3. OASIS. _Web Services Security (WS-Security)_. สืบค้นจาก https://www.oasis-open.org/committees/wss
4. MDN Web Docs. _XML Introduction_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/XML/XML_introduction
5. MDN Web Docs. _DOMParser_. สืบค้นจาก https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
6. npm. _xml2js_. สืบค้นจาก https://www.npmjs.com/package/xml2js
