# ระบบตรวจเช็คอุปกรณ์ประจำรถพยาบาล หน่วยกู้ชีพเทศบาลเมืองพันท้ายนรสิงห์
### Ambulance Equipment Checklist & Management Web Application (PWA & Google Sheets API)

![Version](https://img.shields.io/badge/Version-4.2-red?style=for-the-badge)
![Platform](https://img.shields.io/badge/Platform-GitHub%20Pages%20%7C%20Google%20Apps%20Script-blue?style=for-the-badge)
![PWA](https://img.shields.io/badge/PWA-Ready%20%F0%9F%93%B2-success?style=for-the-badge)
![Responsive](https://img.shields.io/badge/Device-Mobile%20%7C%20Tablet%20%7C%20Desktop-orange?style=for-the-badge)

ระบบเว็บแอปพลิเคชันตรวจเช็คความพร้อมอุปกรณ์ประจำรถพยาบาลฉุกเฉิน (EMS) สำหรับ **หน่วยกู้ชีพเทศบาลเมืองพันท้ายนรสิงห์** ออกแบบทันสมัย สีสันสวยงาม ใช้งานง่าย รองรับการทำงานทั้งบน **Google Apps Script** และ **GitHub Pages** พร้อมระบบ Progressive Web App (PWA) ติดตั้งลงบนมือถือ แท็บเล็ต และคอมพิวเตอร์ได้ทันที

---

## 🚑 รถพยาบาลที่รองรับ (3 คัน)

- 🔴 **กข9745** (กข 9745)
- 🔵 **กค7080** (กค 7080)
- 🟢 **กง3002** (กง 3002)

---

## ✨ คุณสมบัติเด่นของระบบ (Key Features)

1. **รองรับ 2 เวรต่อวัน (เวรเช้า ☀️ / เวรดึก 🌙)**:
   - ตารางใน Google Sheet มี 65 คอลัมน์ (ข้อมูล 3 คอลัมน์ + 31 วัน x 2 เวร)
   - หน้าเว็บมีระบบตรวจจับเวลาจริงเพื่อสลับเวรเช้า/ดึกให้อัตโนมัติ (และเลือกปรับเองได้)
2. **ระบบผู้ตรวจและรหัสย่อ (Checker ID Mapping)**:
   - สมาชิก EMS ตรวจเช็คด้วย User ID และแสดงผลเฉพาะเลขรหัส เช่น `312`, `325`, `122` ในช่องชื่อผู้ตรวจด้านล่างสุดของตารางในชีท
3. **PWA & Multi-Device Responsive**:
   - หน้าจอมือถือ: มีแถบเมนูด้านล่าง (Mobile Bottom Nav) และแถบปุ่มบันทึกด่วนแบบลอย (Floating Quick Submit Bar) พร้อมระบบสั่นสัมผัส (Haptic Feedback)
   - หน้าจอแท็บเล็ต/ไอแพด: จัดเรียง 2 คอลัมน์ สบายตา
   - หน้าจอคอมพิวเตอร์: จัดเรียง 3 คอลัมน์ พร้อมแดชบอร์ดสรุปสถิติ KPI
   - ติดตั้งเป็นแอป Standalone ได้ทั้ง iOS, Android, Windows, Mac
4. **การเชื่อมต่อแบบไฮบริด (Hybrid Deployment)**:
   - ใช้งานผ่าน **Google Apps Script Web App** โดยตรง
   - หรือนำขึ้น **GitHub Pages** เป็นเว็บไซต์สาธารณะ แล้วเชื่อมต่อ Google Sheet ผ่าน Web App API URL ด้วยคลิกเดียว
5. **การพิมพ์และส่งออกเอกสาร**:
   - พิมพ์ใบรับรองผลการตรวจเช็คเป็น PDF สวยงาม
   - ส่งออกประวัติการตรวจเช็คทั้งหมดเป็นไฟล์ Excel (.xlsx)

---

## 📁 โครงสร้างไฟล์ในโครงการ

```text
├── index.html                  # ไฟล์หน้าเว็บหลัก (HTML5, TailwindCSS, Vue-like JS Logic)
├── Code.gs                     # สคริปต์ Google Apps Script สำหรับ Google Sheets Backend
├── manifest.json               # Web App Manifest สำหรับติดตั้งเป็น PWA
├── sw.js                       # Service Worker สำหรับระบบแคช Offline
├── appsscript.json             # ไฟล์การตั้งค่า Google Apps Script
├── DEPLOYMENT_GUIDE.md         # คู่มือการติดตั้งบน Google Sheet Apps Script
├── GITHUB_PAGES_GUIDE.md       # คู่มือการนำขึ้น GitHub & เปิดใช้งาน GitHub Pages
└── .github/
    └── workflows/
        └── deploy.yml          # GitHub Actions สำหรับอัปเดตเว็บไซต์ Pages อัตโนมัติ
```

---

## 👥 บัญชีผู้ใช้งานเริ่มต้น

| User ID | Password | ตำแหน่ง | รหัสใน Sheet | สิทธิ์ |
|---|---|---|---|---|
| `phantai312` | `123456` | EMT | **312** | Staff |
| `phantai325` | `123456` | EMT | **325** | Staff |
| `phantai326` | `123456` | EMT | **326** | Staff |
| `phantai327` | `123456` | EMT | **327** | Staff |
| `phantai122` | `123456` | EMR | **122** | Staff |
| `phantai134` | `123456` | EMR | **134** | Staff |
| `phantai136` | `123456` | EMR | **136** | Staff |
| `phantai137` | `123456` | EMR | **137** | Staff |
| `ems.pantai@gmail.com` | `ems1669` | Administrator | **1669** | Admin |

---

## 📖 คู่มือการติดตั้งและการนำขึ้น GitHub

- ดูขั้นตอนการนำขึ้น GitHub Pages และเชื่อมต่อ Google Sheet อย่างละเอียดได้ที่ 👉 **[GITHUB_PAGES_GUIDE.md](file:///C:/Users/USER/.gemini/antigravity/scratch/ambulance-checklist-pantai/GITHUB_PAGES_GUIDE.md)**
- ดูขั้นตอนการตั้งค่าบน Google Apps Script ได้ที่ 👉 **[DEPLOYMENT_GUIDE.md](file:///C:/Users/USER/.gemini/antigravity/scratch/ambulance-checklist-pantai/DEPLOYMENT_GUIDE.md)**
