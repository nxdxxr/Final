# คู่มือการย้ายเครื่อง (Git Clone) และวิธีแก้ปัญหาเมื่อ `npm run seed` พัง
**เอกสารเตรียมความพร้อมก่อนเข้าห้องสอบ วิชา 88736065 API for Back-End Development**

---

## ❓ ทำไมอัปขึ้น Git แล้ว พอ Clone ลงเครื่องอื่นยังต้องเทสต์?

แม้โค้ดบน Git จะถูกต้อง 100% แต่เมื่อย้ายเครื่อง **จำเป็นต้องทดสอบเสมอ** ด้วย 4 เหตุผลสำคัญ:
1. **ไฟล์ `.env` ไม่ได้ตามมาด้วย**: ไฟล์ `.env` มักถูกละเว้นใน `.gitignore` ทำให้เครื่องใหม่ไม่มีการตั้งค่าเชื่อมต่อฐานข้อมูล
2. **ฐานข้อมูล (MySQL Data) ไม่ได้ขึ้น Git**: ข้อมูลในตารางและ Container อยู่ในเครื่องเดิม เมื่อย้ายเครื่องต้องสร้างใหม่ทั้งหมด
3. **โฟลเดอร์ `node_modules` ไม่ได้ขึ้น Git**: ต้องรัน `npm install` ใหม่บนเครื่องใหม่ ซึ่งอาจเกิดปัญหาดาวน์โหลดไม่สมบูรณ์
4. **สภาพแวดล้อมต่างกัน**: เครื่องใหม่อาจยังไม่ได้เปิด Docker Desktop หรือพอร์ต `3309` อาจชนกับโปรแกรมอื่น

---

## ⚡ ลำดับขั้นตอน 5 นาที เมื่อ Clone ลงเครื่องใหม่

เมื่อดาวน์โหลดโค้ดลงเครื่องสอบ ให้เปิด Terminal ในโฟลเดอร์โปรเจกต์แล้วทำตาม 5 ขั้นตอนนี้ตามลำดับ:

```bash
# 1. ติดตั้ง Library ทั้งหมด
npm install

# 2. สร้างไฟล์ .env จาก .env.example (สำคัญมาก!)
copy .env.example .env      # สำหรับ Windows CMD
# หรือ cp .env.example .env  # สำหรับ Git Bash / Mac / Linux

# 3. เปิด MySQL Container ด้วย Docker
docker compose up -d

# 4. รอประมาณ 15-20 วินาที เพื่อให้ MySQL เปิดระบบเสร็จสิ้น จากนั้นใส่ข้อมูลตั้งต้น
npm run seed

# 5. ตรวจสอบการเชื่อมต่อและรันเทสต์ยืนยันความพร้อม
npm run check
npm test
```

---

## 🛠️ รวมวิธีแก้ Error เมื่อรัน `npm run seed` ไม่ผ่าน

รวบรวม Error ยอดฮิตที่มักเจอในห้องสอบ พร้อมวิธีแก้แบบทันที:

---

### 🔴 เคสที่ 1: `connect ECONNREFUSED 127.0.0.1:3306`
* **อาการ:** Terminal แจ้งว่า `seed ไม่สำเร็จ: connect ECONNREFUSED 127.0.0.1:3306`
* **สาเหตุ:** **ลืมสร้างไฟล์ `.env`** ทำให้โค้ดตัดไปใช้พอร์ตเริ่มต้น `3306` แทนที่จะเป็น `3309`
* **วิธีแก้:**
  1. สั่งก๊อปปี้ไฟล์ตัวอย่าง:
     ```bash
     copy .env.example .env
     ```
  2. เปิดดูไฟล์ `.env` ตรวจสอบว่ามีบรรทัดนี้หรือไม่:
     ```env
     DB_HOST=127.0.0.1
     DB_PORT=3309
     DB_USER=root
     DB_PASSWORD=root
     DB_NAME=exam_db
     ```
  3. สั่ง `npm run seed` ใหม่อีกครั้ง

---

### 🔴 เคสที่ 2: `connect ECONNREFUSED 127.0.0.1:3309`
* **อาการ:** ชี้ไปที่พอร์ต `3309` แล้ว แต่ยังขึ้น `ECONNREFUSED`
* **สาเหตุ:**
  1. MySQL Container ยังไม่ได้เปิด
  2. หรือเพิ่งกดรัน `docker compose up -d` แล้วรีบกด seed ทันทีขณะที่ MySQL กำลังเริ่มระบบ (Container ยัง Initialize ไม่เสร็จ)
* **วิธีแก้:**
  1. สั่งเปิด Container:
     ```bash
     docker compose up -d
     ```
  2. สั่งเช็กว่า Container ทำงานอยู่จริงหรือไม่:
     ```bash
     docker ps
     ```
     *(ต้องเห็นชื่อ `final-exam-setup-mysql-1` หรือคล้ายกัน มีสถานะ `Up ...`)*
  3. **รอประมาณ 15 วินาที** แล้วสั่ง `npm run seed` ใหม่อีกครั้ง

---

### 🔴 เคสที่ 3: `port is already allocated` หรือพอร์ต 3309 ชนกับโปรแกรมอื่น
* **อาการ:** ตอนสั่ง `docker compose up -d` มีข้อความสีแดงขึ้นว่า:
  `Bind for 0.0.0.0:3309 failed: port is already allocated`
* **สาเหตุ:** เครื่องนั้นมี Docker เก่าหรือโปรแกรมอื่นจองพอร์ต `3309` ไว้อยู่แล้ว
* **วิธีแก้ (เลือกวิธีใดวิธีหนึ่ง):**
  * **วิธีที่ 1 (ปิด Container เก่าที่ค้างอยู่):**
    ```bash
    docker stop $(docker ps -q)
    docker compose up -d
    ```
  * **วิธีที่ 2 (เปลี่ยนพอร์ตหนีไปใช้ 3310):**
    1. เปิดไฟล์ `docker-compose.yml` แก้ไขจาก `"3309:3306"` เป็น:
       ```yaml
       ports:
         - "3310:3306"
       ```
    2. เปิดไฟล์ `.env` แก้ไขค่าพอร์ตให้ตรงกัน:
       ```env
       DB_PORT=3310
       ```
    3. สั่งรันใหม่:
       ```bash
       docker compose up -d
       npm run seed
       ```

---

### 🔴 เคสที่ 4: `Cannot connect to the Docker daemon`
* **อาการ:** สั่งคำสั่ง docker แล้วขึ้นว่า `docker: Cannot connect to the Docker daemon at unix:///var/run/docker.sock` หรือ `Is the docker daemon running?`
* **สาเหตุ:** **ยังไม่ได้เปิดโปรแกรม Docker Desktop** บนคอมพิวเตอร์
* **วิธีแก้:**
  1. ไปที่เมนู Start ใน Windows แล้วพิมพ์ค้นหาและเปิดโปรแกรม **"Docker Desktop"**
  2. รอจนกระทั่งมุมซ้ายล่างของหน้าต่าง Docker Desktop ขึ้นไอคอนสีเขียวว่า **"Engine running"**
  3. กลับมาที่ Terminal แล้วรัน `docker compose up -d` อีกครั้ง

---

### 🔴 เคสที่ 5: `Access denied for user 'root'@'...' (using password: YES)`
* **อาการ:** ขึ้นข้อความว่ารหัสผ่านไม่ถูกต้อง (Error 1045)
* **สาเหตุ:** รหัสผ่านในไฟล์ `.env` ไม่ตรงกับที่กำหนดไว้ใน `docker-compose.yml`
* **วิธีแก้:**
  1. ตรวจสอบใน `docker-compose.yml` จะเห็นว่าอาจารย์ตั้งไว้คือ:
     `MYSQL_ROOT_PASSWORD: root`
  2. เปิดไฟล์ `.env` และแก้ให้เป็น:
     ```env
     DB_USER=root
     DB_PASSWORD=root
     ```
  3. สั่ง `npm run seed` ใหม่

---

### 🔴 เคสที่ 6: ฐานข้อมูลเละ หรืออยากล้างข้อมูลเริ่มต้นใหม่หมด (Hard Reset)
* **อาการ:** ลองเทสต์หลายรอบแล้วข้อมูลซ้ำ หรือตารางพัง ต้องการ Reset กลับไปเป็นเหมือนตอนเพิ่งแตกไฟล์ zip ใหม่เอี่ยม
* **วิธีแก้:**
  ```bash
  # 1. สั่งลบ Container พร้อม Volume ข้อมูลทั้งหมดทิ้ง
  docker compose down -v

  # 2. เปิด Container ใหม่แบบสะอาด 100%
  docker compose up -d

  # 3. รอ 15 วินาที แล้วใส่ข้อมูลตัวอย่างใหม่
  npm run seed

  # 4. ตรวจสอบผล
  npm run check
  ```
  *(เมื่อสำเร็จจะขึ้น: `เชื่อมต่อฐานข้อมูลได้ พบเมนู 22 รายการ`)*

---

## 🎯 สรุปผลลัพธ์ที่ถูกต้อง (Gold Standard)

เมื่อคุณทำตามขั้นตอนข้างต้นถูกต้อง ทั้งหมดต้องแสดงผลลัพธ์ดังนี้:

1. **เมื่อรัน `npm run check`:**
   ```text
   > node scripts/check-env.js
   เชื่อมต่อฐานข้อมูลได้ พบเมนู 22 รายการ
   ```
2. **เมื่อรัน `npm test`:**
   ```text
   PASS tests/environment.test.js
     ตรวจสภาพแวดล้อม
       √ เชื่อมต่อฐานข้อมูลได้และมีข้อมูลเมนู
       √ Express และ Supertest ทำงานได้
       √ สร้างและตรวจ JWT ได้

   Test Suites: 1 passed, 1 total
   Tests:       3 passed, 3 total
   ```
หากได้ผลลัพธ์ตามนี้ แสดงว่าเครื่องใหม่พร้อมสอบ 100% ลุยข้อสอบปฏิบัติได้ทันทีครับ!

