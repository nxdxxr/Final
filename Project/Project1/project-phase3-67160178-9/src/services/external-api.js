const axios = require("axios");

// พิกัด GPS จำลองของแต่ละสาขาในกรุงเทพฯ
const GYM_COORDINATES = {
  1: { lat: 13.7456, lon: 100.5342, locationName: "สยามสแควร์" },
  2: { lat: 13.8055, lon: 100.5734, locationName: "ลาดพร้าว" },
  3: { lat: 13.7797, lon: 100.5447, locationName: "อารีย์" },
  4: { lat: 13.7314, lon: 100.5816, locationName: "ทองหล่อ" },
};

// ค่าตั้งค่าความทนทานต่อความผิดพลาด (Resilience Configuration)
const DEFAULT_CONFIG = {
  timeoutMs: 3000,       // Timeout: สูงสุด 3 วินาที
  maxRetries: 2,         // Retry: ลองใหม่อีก 2 ครั้ง (รวมเป็น 3 ครั้ง)
  initialDelayMs: 500,   // Delay เริ่มต้นก่อนลองใหม่
  backoffFactor: 2,      // Exponential Backoff multiplier
};

// ข้อมูลสำรอง (Fallback Data) เมื่อบริการภายนอกล้มเหลว
function getFallbackWeatherData(gymId, gymName, reason = "External API Unavailable") {
  return {
    gymId,
    gymName,
    temperatureCelsius: 30.0,
    relativeHumidity: 65,
    windSpeedKmh: 10.5,
    weatherCondition: "แจ่มใส (ข้อมูลสำรองโดยประมาณ)",
    airQualityIndex: 45,
    airQualityStatus: "คุณภาพอากาศดี",
    recommendation: "สภาพอากาศและคุณภาพอากาศเหมาะสมสำหรับการออกกำลังกายทั้งในร่มและกลางแจ้ง",
    isFallback: true,
    fallbackReason: reason,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * ฟังก์ชันช่วยหน่วงเวลา (Delay helper)
 */
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * ดึงข้อมูลสภาพอากาศภายนอกพร้อมระบบความทนทาน (Retry / Timeout / Fallback)
 * @param {number} gymId - รหัสสาขาฟิตเนส
 * @param {string} gymName - ชื่อสาขาฟิตเนส
 * @param {object} options - ตัวเลือกการเรียกและโหมดทดสอบจำลอง (simulate)
 */
async function fetchGymWeatherWithResilience(gymId, gymName, options = {}) {
  const coords = GYM_COORDINATES[gymId] || { lat: 13.7563, lon: 100.5018, locationName: "กรุงเทพมหานคร" };
  const timeoutMs = options.timeoutMs || DEFAULT_CONFIG.timeoutMs;
  const maxRetries = options.maxRetries ?? DEFAULT_CONFIG.maxRetries;
  const initialDelayMs = options.initialDelayMs || DEFAULT_CONFIG.initialDelayMs;
  const backoffFactor = options.backoffFactor || DEFAULT_CONFIG.backoffFactor;

  // สำหรับการทดสอบ Failure Scenario:
  // simulate = 'network' (จำลองเครือข่ายล่ม)
  // simulate = 'timeout' (จำลอง timeout)
  // simulate = '500'     (จำลอง external server error)
  let targetUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia%2FBangkok`;

  if (options.simulate === "network") {
    targetUrl = "https://invalid-non-existent-domain-12345.xyz/api";
  } else if (options.simulate === "timeout") {
    // ใช้บริการ httpbin จำลอง delay 10 วินาที (ซึ่งจะเกิน timeout 3 วินาที)
    targetUrl = "https://httpstat.us/200?sleep=10000";
  } else if (options.simulate === "500") {
    targetUrl = "https://httpstat.us/500";
  }

  const logs = [];
  let attempt = 0;
  let currentDelay = initialDelayMs;

  while (attempt <= maxRetries) {
    attempt++;
    const startTime = Date.now();

    try {
      logs.push(`[Attempt ${attempt}/${maxRetries + 1}] กำลังเรียก External API: ${targetUrl} (Timeout: ${timeoutMs}ms)`);

      const response = await axios.get(targetUrl, {
        timeout: timeoutMs,
        headers: { "Accept": "application/json" },
      });

      const durationMs = Date.now() - startTime;
      logs.push(`[Attempt ${attempt}] สำเร็จ (Status: ${response.status}, Time: ${durationMs}ms)`);

      // แปลงข้อมูลผลลัพธ์จาก Open-Meteo
      const current = response.data.current || {};
      const temp = current.temperature_2m ?? 31.0;
      const humidity = current.relative_humidity_2m ?? 60;
      const wind = current.wind_speed_10m ?? 8.0;

      return {
        success: true,
        data: {
          gymId,
          gymName,
          location: coords.locationName,
          temperatureCelsius: temp,
          relativeHumidity: humidity,
          windSpeedKmh: wind,
          weatherCondition: temp > 35 ? "อากาศร้อนจัด แนะนำออกกำลังกายในร่มห้องแอร์" : "อากาศปกติ เหมาะแก่การออกกำลังกาย",
          recommendation: "ระบบฟิตเนสพร้อมให้บริการคลาสตามตารางปกติ",
          isFallback: false,
          fetchedAt: new Date().toISOString(),
          durationMs,
        },
        attemptsUsed: attempt,
        logs,
      };
    } catch (err) {
      const durationMs = Date.now() - startTime;
      const isTimeout = err.code === "ECONNABORTED" || err.message.includes("timeout");
      const is5xx = err.response && err.response.status >= 500;
      const isNetwork = !err.response || err.code === "ENOTFOUND" || err.code === "ECONNREFUSED";

      const errType = isTimeout ? "TIMEOUT" : (is5xx ? `HTTP_${err.response.status}` : "NETWORK_ERROR");
      logs.push(`[Attempt ${attempt}] ล้มเหลว (${errType}: ${err.message}) ในเวลา ${durationMs}ms`);

      // หากยังมีโควตา Retry ให้หน่วงเวลาก่อนลองรอบถัดไป
      if (attempt <= maxRetries) {
        logs.push(`[Retry Logic] จะลองใหม่ครั้งที่ ${attempt} ในอีก ${currentDelay}ms (Exponential Backoff)`);
        await wait(currentDelay);
        currentDelay *= backoffFactor;
      } else {
        logs.push(`[Retry Exhausted] เรียกซ้ำครบ ${maxRetries} ครั้งแล้ว สลับไปใช้ Fallback Logic`);
      }
    }
  }

  // Fallback Logic เมื่อเรียกซ้ำครบแล้วยังล้มเหลว
  const fallbackResult = getFallbackWeatherData(gymId, gymName, `External service failed after ${attempt} attempts`);
  return {
    success: true,
    data: fallbackResult,
    attemptsUsed: attempt,
    logs,
  };
}

module.exports = {
  fetchGymWeatherWithResilience,
  getFallbackWeatherData,
  DEFAULT_CONFIG,
};
