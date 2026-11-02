// ========================================================
// FitZone Frontend Client Logic (Phase 3: CLO6)
// ========================================================

const API_BASE = window.location.origin.includes("3000")
  ? "/api/v1"
  : "http://localhost:3000/api/v1";

// State
let gymsData = [];
let classesData = [];
let membersData = [];

// DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  initNavigation();
  initEventListeners();
  loadAllData();
});

// ========================================================
// Navigation / Tabs
// ========================================================
function initNavigation() {
  const navLinks = document.querySelectorAll(".nav-link[data-tab]");
  navLinks.forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const targetTab = link.getAttribute("data-tab");

      navLinks.forEach((l) => l.classList.remove("active"));
      link.classList.add("active");

      document.querySelectorAll(".content-section").forEach((sec) => {
        sec.classList.remove("active");
      });

      const activeSection = document.getElementById(`${targetTab}-section`);
      if (activeSection) {
        activeSection.classList.add("active");
      }
    });
  });
}

function initEventListeners() {
  // Gym Filters
  document.getElementById("gym-search").addEventListener("input", applyGymFilters);
  document.getElementById("gym-fee-filter").addEventListener("change", applyGymFilters);
  document.getElementById("btn-refresh-gyms").addEventListener("click", loadGyms);
  document.getElementById("btn-refresh-classes").addEventListener("click", loadClasses);

  // My Bookings Events
  const myBookingsSelect = document.getElementById("my-bookings-member-select");
  if (myBookingsSelect) {
    myBookingsSelect.addEventListener("change", (e) => loadMyBookings(e.target.value));
  }
  const btnRefreshMyBookings = document.getElementById("btn-refresh-my-bookings");
  if (btnRefreshMyBookings) {
    btnRefreshMyBookings.addEventListener("click", () => {
      const select = document.getElementById("my-bookings-member-select");
      loadMyBookings(select ? select.value : null);
    });
  }

  // Member Registration Form
  document.getElementById("member-register-form").addEventListener("submit", handleMemberRegister);

  // Booking Modal Events
  document.getElementById("btn-close-modal").addEventListener("click", closeBookingModal);
  document.getElementById("btn-cancel-modal").addEventListener("click", closeBookingModal);
  document.getElementById("booking-form").addEventListener("submit", handleBookingSubmit);
  document.getElementById("booking-modal").addEventListener("click", (e) => {
    if (e.target.id === "booking-modal") closeBookingModal();
  });
}

// ========================================================
// Load All Data on Initial Load
// ========================================================
async function loadAllData() {
  await Promise.all([loadGyms(), loadClasses(), loadMembers()]);
  updateHeroStats();
}

function updateHeroStats() {
  document.getElementById("stat-gyms").textContent = gymsData.length;
  document.getElementById("stat-classes").textContent = classesData.length;
  document.getElementById("stat-members").textContent = membersData.length;
}

// ========================================================
// 1. Gyms & Weather API (GET /api/v1/gyms & /api/v1/gyms/:id/weather)
// ========================================================
async function loadGyms() {
  const loadingEl = document.getElementById("gyms-loading");
  const errorEl = document.getElementById("gyms-error");
  const gridEl = document.getElementById("gym-cards-grid");

  loadingEl.classList.remove("hidden");
  errorEl.classList.add("hidden");
  gridEl.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/gyms`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const json = await res.json();
    gymsData = json.data || [];

    renderGymCards(gymsData);
    populateGymSelectOptions(gymsData);
    document.getElementById("api-status").textContent = "API เชื่อมต่อปกติ";
  } catch (err) {
    console.error("Error loading gyms:", err);
    errorEl.classList.remove("hidden");
    document.getElementById("gyms-error-msg").textContent = `ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้: ${err.message}`;
    document.getElementById("api-status").textContent = "API ขัดข้อง";
    showToast("เกิดข้อผิดพลาดในการโหลดข้อมูลสาขา", "error");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function renderGymCards(gyms) {
  const gridEl = document.getElementById("gym-cards-grid");
  gridEl.innerHTML = "";

  if (gyms.length === 0) {
    gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">ไม่พบข้อมูลสาขาตามเงื่อนไขที่ค้นหา</div>`;
    return;
  }

  gyms.forEach((gym) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-header">
          <h3 class="card-title">${gym.name}</h3>
          <span class="card-badge badge-gym">สาขาที่ #${gym.id}</span>
        </div>
        <div class="card-body">
          <p>📍 <strong>ที่อยู่:</strong> ${gym.address}</p>
          <p>📞 <strong>เบอร์โทร:</strong> ${gym.phone}</p>
          <p>⏰ <strong>เวลาทำการ:</strong> ${gym.open_time.slice(0, 5)} - ${gym.close_time.slice(0, 5)} น.</p>
        </div>
        <!-- Real-time External Weather API Badge -->
        <div class="weather-box" id="weather-gym-${gym.id}">
          <div class="weather-header">
            <span>🌤️ สภาพอากาศสด (External API)</span>
            <span class="weather-spinner" style="font-size:0.75rem;">กำลังโหลด...</span>
          </div>
          <div class="weather-temp" id="temp-gym-${gym.id}">--°C</div>
          <div class="weather-desc" id="desc-gym-${gym.id}">กำลังดึงข้อมูลพิกัด...</div>
        </div>
      </div>
      <div class="card-footer">
        <span style="font-weight:700; color:var(--primary); font-size:1.15rem;">
          ฿${Number(gym.monthly_fee).toLocaleString()} <span style="font-size:0.8rem; color:var(--text-muted); font-weight:400;">/ เดือน</span>
        </span>
        <button class="btn btn-sm btn-secondary" onclick="viewGymClasses(${gym.id})">ดูคลาสสาขานี้</button>
      </div>
    `;
    gridEl.appendChild(card);

    // ดึงข้อมูลสภาพอากาศภายนอกแบบ Async สำหรับสาขานี้
    fetchGymWeather(gym.id);
  });
}

async function fetchGymWeather(gymId) {
  try {
    const res = await fetch(`${API_BASE}/gyms/${gymId}/weather`);
    if (!res.ok) throw new Error("Weather API error");
    const json = await res.json();
    const data = json.data;

    const weatherBox = document.getElementById(`weather-gym-${gymId}`);
    if (!weatherBox) return;

    weatherBox.querySelector(".weather-header").innerHTML = `
      <span>🌤️ สภาพอากาศสด ${data.isFallback ? '<span style="color:var(--warning-text);">(ข้อมูลสำรอง)</span>' : ''}</span>
      <span style="font-size:0.78rem; font-weight:600; color:${data.isFallback ? 'var(--warning-text)' : 'var(--success-text)'};">${data.location || 'กรุงเทพฯ'}</span>
    `;
    document.getElementById(`temp-gym-${gymId}`).textContent = `${data.temperatureCelsius}°C`;
    document.getElementById(`desc-gym-${gymId}`).textContent = `${data.weatherCondition} • ความชื้น ${data.relativeHumidity}%`;
  } catch (err) {
    const tempEl = document.getElementById(`temp-gym-${gymId}`);
    const descEl = document.getElementById(`desc-gym-${gymId}`);
    if (tempEl) tempEl.textContent = "30°C";
    if (descEl) descEl.textContent = "ข้อมูลสำรอง (External API ไม่พร้อมใช้งาน)";
  }
}

function applyGymFilters() {
  const searchTerm = document.getElementById("gym-search").value.toLowerCase().trim();
  const maxFee = document.getElementById("gym-fee-filter").value;

  const filtered = gymsData.filter((gym) => {
    const matchSearch =
      gym.name.toLowerCase().includes(searchTerm) ||
      gym.address.toLowerCase().includes(searchTerm);
    const matchFee = maxFee ? Number(gym.monthly_fee) <= Number(maxFee) : true;
    return matchSearch && matchFee;
  });

  renderGymCards(filtered);
}

function populateGymSelectOptions(gyms) {
  const select = document.getElementById("reg-gym");
  select.innerHTML = '<option value="">-- กรุณาเลือกสาขา --</option>';
  gyms.forEach((g) => {
    const opt = document.createElement("option");
    opt.value = g.id;
    opt.textContent = `${g.name} (฿${Number(g.monthly_fee).toLocaleString()}/เดือน)`;
    select.appendChild(opt);
  });
}

// ========================================================
// 2. Classes & Booking API (GET /api/v1/classes & POST /api/v1/classes/:id/bookings)
// ========================================================
async function loadClasses() {
  const loadingEl = document.getElementById("classes-loading");
  const gridEl = document.getElementById("class-cards-grid");

  loadingEl.classList.remove("hidden");
  gridEl.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/classes`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const json = await res.json();
    classesData = json.data || [];

    renderClassCards(classesData);
  } catch (err) {
    console.error("Error loading classes:", err);
    gridEl.innerHTML = `<div class="error-banner"><p>ไม่สามารถดึงข้อมูลคลาสออกกำลังกายได้: ${err.message}</p></div>`;
    showToast("เกิดข้อผิดพลาดในการโหลดคลาส", "error");
  } finally {
    loadingEl.classList.add("hidden");
  }
}

function renderClassCards(classes) {
  const gridEl = document.getElementById("class-cards-grid");
  gridEl.innerHTML = "";

  classes.forEach((cls) => {
    const isFull = cls.available_spots <= 0;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div>
        <div class="card-header">
          <h3 class="card-title">${cls.class_name}</h3>
          <span class="card-badge ${isFull ? 'badge-full' : 'badge-spots'}">
            ${isFull ? 'ที่นั่งเต็มแล้ว' : `ว่าง ${cls.available_spots}/${cls.max_spots} ที่`}
          </span>
        </div>
        <div class="card-body">
          <p>🏢 <strong>สาขา:</strong> ${cls.gym_name}</p>
          <p>🕒 <strong>วัน-เวลา:</strong> ${cls.schedule_time}</p>
          <p>🧑‍🏫 <strong>เทรนเนอร์:</strong> ${cls.trainer_name}</p>
        </div>
      </div>
      <div class="card-footer">
        <span style="font-size:0.85rem; color:var(--text-muted);">
          รหัสคลาส #${cls.id}
        </span>
        <button
          class="btn btn-sm ${isFull ? 'btn-secondary' : 'btn-primary'}"
          ${isFull ? 'disabled' : ''}
          onclick="openBookingModal(${cls.id}, '${cls.class_name}', '${cls.schedule_time}', ${cls.available_spots})"
        >
          ${isFull ? 'ที่นั่งเต็ม' : 'จองคลาสนี้ ⚡'}
        </button>
      </div>
    `;
    gridEl.appendChild(card);
  });
}

function viewGymClasses(gymId) {
  // สลับไปแท็บคลาส
  const classesTabLink = document.querySelector(".nav-link[data-tab='classes']");
  if (classesTabLink) classesTabLink.click();
}

// Modal Handling
function openBookingModal(classId, className, scheduleTime, spots) {
  document.getElementById("modal-class-id").value = classId;
  document.getElementById("modal-summary-name").textContent = className;
  document.getElementById("modal-summary-time").textContent = scheduleTime;
  document.getElementById("modal-summary-spots").textContent = `${spots} ที่นั่ง`;

  // เติมรายชื่อสมาชิกลงใน Dropdown
  const memberSelect = document.getElementById("booking-member-select");
  memberSelect.innerHTML = '<option value="">-- กรุณาเลือกสมาชิก --</option>';
  membersData.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `#${m.id} - ${m.name} (${m.phone})`;
    selectAppend(memberSelect, opt);
  });

  document.getElementById("err-booking-member").textContent = "";
  document.getElementById("booking-modal").classList.remove("hidden");
}

function selectAppend(parent, child) {
  parent.appendChild(child);
}

function closeBookingModal() {
  document.getElementById("booking-modal").classList.add("hidden");
  document.getElementById("booking-form").reset();
}

// Handle Booking Form Submit with Concurrency-safe POST
async function handleBookingSubmit(e) {
  e.preventDefault();
  const classId = document.getElementById("modal-class-id").value;
  const memberId = document.getElementById("booking-member-select").value;
  const errorEl = document.getElementById("err-booking-member");
  const submitBtn = document.getElementById("btn-confirm-booking");

  // Client-side validation
  if (!memberId) {
    errorEl.textContent = "กรุณาเลือกสมาชิกที่ต้องการจอง";
    return;
  }
  errorEl.textContent = "";

  // Loading state in button
  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "กำลังทำรายการ...";
  submitBtn.querySelector(".btn-spinner").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/classes/${classId}/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: Number(memberId) }),
    });

    const data = await res.json();

    if (res.status === 201) {
      showToast(`จองคลาสสำเร็จ! หมายเลขการจอง #${data.bookingId}`, "success");
      closeBookingModal();
      // รีโหลดคลาสเพื่ออัปเดตที่นั่งทันที
      await loadClasses();
      // อัปเดตรายการคลาสของฉันทันที
      const mySelect = document.getElementById("my-bookings-member-select");
      if (mySelect) {
        mySelect.value = String(memberId);
        await loadMyBookings(memberId);
      }
    } else if (res.status === 409) {
      showToast(data.error?.message || "ไม่สามารถจองได้ เนื่องจากเงื่อนไขระบบ", "error");
      errorEl.textContent = data.error?.message;
    } else {
      showToast(data.error?.message || "เกิดข้อผิดพลาดในการทำรายการ", "error");
      errorEl.textContent = data.error?.message;
    }
  } catch (err) {
    console.error("Booking error:", err);
    showToast(`เกิดข้อผิดพลาดเครือข่าย: ${err.message}`, "error");
    errorEl.textContent = "เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ กรุณาลองใหม่";
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "ยืนยันการจอง";
    submitBtn.querySelector(".btn-spinner").classList.add("hidden");
  }
}

// ========================================================
// 3. Members API (GET /api/v1/members & POST /api/v1/members)
// ========================================================
async function loadMembers() {
  try {
    const res = await fetch(`${API_BASE}/members`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const json = await res.json();
    membersData = json.data || [];

    renderMembersList(membersData);
    populateMyBookingsMemberSelect(membersData);
    document.getElementById("member-count-badge").textContent = `${membersData.length} คน`;
    document.getElementById("stat-members").textContent = membersData.length;
  } catch (err) {
    console.error("Error loading members:", err);
    document.getElementById("members-list-container").innerHTML = `
      <div style="color:var(--danger-text); font-size:0.85rem; padding:1rem;">
        ไม่สามารถดึงข้อมูลสมาชิกได้: ${err.message}
      </div>
    `;
  }
}

function renderMembersList(members) {
  const container = document.getElementById("members-list-container");
  container.innerHTML = "";

  if (members.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted); font-size:0.85rem; padding:1rem; text-align:center;">ยังไม่มีสมาชิกในระบบ</div>`;
    return;
  }

  members.forEach((m) => {
    const item = document.createElement("div");
    item.className = "member-item";
    item.innerHTML = `
      <div class="member-info">
        <h5>${m.name} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:normal;">#${m.id}</span></h5>
        <p>✉️ ${m.email} | 📞 ${m.phone}</p>
      </div>
      <span class="card-badge badge-gym">${m.gym_name || `สาขา #${m.gym_id}`}</span>
    `;
    container.appendChild(item);
  });
}

// Form Submission with Client-Side Validation
async function handleMemberRegister(e) {
  e.preventDefault();

  const nameInput = document.getElementById("reg-name");
  const emailInput = document.getElementById("reg-email");
  const phoneInput = document.getElementById("reg-phone");
  const gymInput = document.getElementById("reg-gym");
  const submitBtn = document.getElementById("btn-submit-member");

  // Reset errors
  document.getElementById("err-name").textContent = "";
  document.getElementById("err-email").textContent = "";
  document.getElementById("err-phone").textContent = "";
  document.getElementById("err-gym").textContent = "";

  let isValid = true;

  // Validation Rules
  const name = nameInput.value.trim();
  if (!name || name.length < 2) {
    document.getElementById("err-name").textContent = "กรุณากรอกชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร";
    isValid = false;
  }

  const email = emailInput.value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    document.getElementById("err-email").textContent = "รูปแบบอีเมลไม่ถูกต้อง (เช่น user@example.com)";
    isValid = false;
  }

  const phone = phoneInput.value.trim();
  if (!phone || phone.length < 9) {
    document.getElementById("err-phone").textContent = "กรุณาระบุเบอร์โทรศัพท์ที่ถูกต้องอย่างน้อย 9-10 หลัก";
    isValid = false;
  }

  const gymId = gymInput.value;
  if (!gymId) {
    document.getElementById("err-gym").textContent = "กรุณาเลือกสาขาฟิตเนสที่ต้องการสมัคร";
    isValid = false;
  }

  if (!isValid) return;

  // Loading state
  submitBtn.disabled = true;
  submitBtn.querySelector(".btn-text").textContent = "กำลังบันทึกข้อมูล...";
  submitBtn.querySelector(".btn-spinner").classList.remove("hidden");

  try {
    const res = await fetch(`${API_BASE}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        email,
        phone,
        gymId: Number(gymId),
      }),
    });

    const data = await res.json();

    if (res.status === 201) {
      showToast(`สมัครสมาชิกสำเร็จ! ยินดีต้อนรับ ${name}`, "success");
      document.getElementById("member-register-form").reset();
      await loadMembers();
    } else if (res.status === 409) {
      document.getElementById("err-email").textContent = data.error?.message || "อีเมลนี้มีอยู่ในระบบแล้ว";
      showToast(data.error?.message || "อีเมลนี้ถูกใช้งานแล้ว", "error");
    } else {
      showToast(data.error?.message || "เกิดข้อผิดพลาดในการสมัคร", "error");
    }
  } catch (err) {
    console.error("Register error:", err);
    showToast(`เกิดข้อผิดพลาดเครือข่าย: ${err.message}`, "error");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = "ยืนยันการสมัครสมาชิก";
    submitBtn.querySelector(".btn-spinner").classList.add("hidden");
  }
}

// ========================================================
// Toast Notification Utility
// ========================================================
function showToast(message, type = "info") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;

  const icon = type === "success" ? "✅" : (type === "error" ? "❌" : "ℹ️");
  toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease-out";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ========================================================
// 4. My Bookings API Logic (GET /members/:id/bookings & DELETE /bookings/:id)
// ========================================================
function populateMyBookingsMemberSelect(members) {
  const select = document.getElementById("my-bookings-member-select");
  if (!select) return;
  const currentVal = select.value;
  select.innerHTML = '<option value="">-- กรุณาเลือกสมาชิก --</option>';
  members.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `#${m.id} - ${m.name} (${m.phone})`;
    select.appendChild(opt);
  });
  if (currentVal && members.some(m => String(m.id) === String(currentVal))) {
    select.value = currentVal;
  } else if (members.length > 0) {
    select.value = members[0].id;
    loadMyBookings(members[0].id);
  }
}

async function loadMyBookings(memberId) {
  const loadingEl = document.getElementById("my-bookings-loading");
  const gridEl = document.getElementById("my-bookings-grid");
  if (!gridEl) return;

  if (!memberId) {
    const select = document.getElementById("my-bookings-member-select");
    memberId = select ? select.value : null;
  }

  if (!memberId) {
    gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">กรุณาเลือกสมาชิกเพื่อดูประวัติการจองคลาส</div>`;
    return;
  }

  loadingEl.classList.remove("hidden");
  gridEl.innerHTML = "";

  try {
    const res = await fetch(`${API_BASE}/members/${memberId}/bookings`);
    if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
    const json = await res.json();
    const bookings = json.data || [];

    if (bookings.length === 0) {
      gridEl.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 3.5rem 1.5rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-color);">
          <div style="font-size: 2.8rem; margin-bottom: 0.75rem;">🧘‍♂️</div>
          <h4 style="color: var(--text-primary); font-size: 1.15rem; margin-bottom: 0.5rem;">ยังไม่มีรายการจองคลาส</h4>
          <p style="color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem;">สมาชิกท่านนี้ยังไม่ได้ลงทะเบียนคลาสออกกำลังกายใด ๆ</p>
          <button class="btn btn-primary btn-sm" onclick="document.querySelector('.nav-link[data-tab=\\'classes\\']').click()">ดูตารางคลาสเพื่อจองทันที ↗</button>
        </div>
      `;
      return;
    }

    bookings.forEach((b) => {
      const card = document.createElement("div");
      card.className = "card booking-card";
      const formattedDate = new Date(b.booked_at).toLocaleString("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
      });

      card.innerHTML = `
        <div>
          <div class="card-header">
            <h3 class="card-title">${b.class_name}</h3>
            <span class="card-badge badge-confirmed">✓ ${b.status === 'confirmed' ? 'ยืนยันแล้ว' : b.status}</span>
          </div>
          <div class="card-body">
            <p>📍 <strong>สาขา:</strong> ${b.gym_name}</p>
            <p>⏰ <strong>เวลาเรียน:</strong> <span style="color:var(--primary); font-weight:600;">${b.schedule_time}</span></p>
            <p>🏋️‍♂️ <strong>เทรนเนอร์:</strong> ${b.trainer_name}</p>
            <p style="font-size:0.8rem; color:var(--text-muted); margin-top:0.75rem;">
              🕒 วันที่จอง: ${formattedDate} (รหัสการจอง #${b.booking_id})
            </p>
          </div>
        </div>
        <div class="card-footer" style="justify-content: flex-end;">
          <button class="btn btn-sm btn-danger" onclick="cancelBooking(${b.booking_id}, ${b.class_id}, '${b.class_name.replace(/'/g, "\\'")}')">
            ❌ ยกเลิกการจอง
          </button>
        </div>
      `;
      gridEl.appendChild(card);
    });
  } catch (err) {
    console.error("Error loading my bookings:", err);
    gridEl.innerHTML = `<div style="grid-column: 1/-1; text-align: center; color: var(--accent-rose); padding: 2rem;">ไม่สามารถดึงข้อมูลการจองได้: ${err.message}</div>`;
  } finally {
    loadingEl.classList.add("hidden");
  }
}

async function cancelBooking(bookingId, classId, className) {
  if (!confirm(`คุณต้องการยกเลิกการจองคลาส "${className}" ใช่หรือไม่?\n\n(ระบบจะคืนสิทธิ์และเพิ่มยอดที่นั่งว่างกลับเข้าคลาสทันที)`)) {
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/bookings/${bookingId}`, {
      method: "DELETE",
    });

    const json = await res.json();

    if (res.ok) {
      showToast(`ยกเลิกคลาส "${className}" สำเร็จ และคืนที่นั่งว่างเรียบร้อยแล้ว`, "success");
      // รีโหลดคลาสของฉัน
      const select = document.getElementById("my-bookings-member-select");
      if (select && select.value) {
        await loadMyBookings(select.value);
      }
      // รีโหลดคลาสเพื่ออัปเดตที่นั่งว่างทันที
      await loadClasses();
    } else {
      showToast(json.error?.message || "ไม่สามารถยกเลิกการจองได้", "error");
    }
  } catch (err) {
    console.error("Cancel booking error:", err);
    showToast(`เกิดข้อผิดพลาดในการยกเลิก: ${err.message}`, "error");
  }
}
