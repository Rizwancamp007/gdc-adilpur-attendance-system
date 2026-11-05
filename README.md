# GDC Adilpur — Attendance Portal
> **Official Attendance Management System (AMS) for Government Degree College Adilpur, District Ghotki, Sindh, Pakistan.**

An enterprise-grade, mobile-first Progressive Web App (PWA) and RESTful API backend engineered for daily student roll-call, real-time turnout analytics, automated multi-channel absentee notifications, and institutional reporting.

---

## 🌟 Key Features

### 1. 📱 Mobile-First Teacher PWA (Offline-Ready)
- **Instant Roll Call:** Single-tap attendance toggles (`Present`, `Absent`, `Late`, `Excused`) tailored for mobile screens.
- **Offline Resiliency:** Full Dexie.js (IndexedDB) local cache allows teachers to take attendance in classrooms with zero mobile connectivity and auto-sync when connection restores.
- **PWA Installation:** Optimized for iOS (Safari "Add to Home Screen") and Android with custom application manifests, splash screens, and Apple touch icons.
- **Session Security:** 24-hour JWT token expiration with an optional "Remember Me" toggle for trusted faculty devices.

### 2. 📊 Admin & Institutional Analytics
- **Turnout Intelligence:** Live turn-out visual progress bars by class and section, daily attendance breakdown, and key metrics.
- **Student Information System:** Fast search, filtering by program and section, inline editing, and smooth pagination (100 students per page).
- **Academic Hierarchy:** Full control over Degree Programs (F.Sc Pre-Medical, Pre-Engineering, Computer Science, Arts) and Class Sections.
- **Faculty Account Management:** Provisioning of teacher accounts and granular class assignments.
- **Official Sindh Education Department Reports:** One-click custom date-range export in standardized `.xlsx` spreadsheet format.

### 3. 💬 Automated Parent Notification Gateway
- **Multi-Channel Dispatch:** Connects with WhatsApp Web automation and an Android SIM SMS Gateway.
- **Anti-Ban Safety:** Enforces an automated 15–20 second jittered delay between outbound messages to protect the college SIM/WhatsApp number.
- **Live Dispatch Queue:** Real-time visibility into queued, sent, and failed absentee SMS logs with one-click re-queueing.

### 4. ⚡ High Efficiency & Cloud Optimization
- **Smart Active Window (7:00 AM – 6:00 PM PKT):** Background ping service automatically rests overnight, conserving Render free-tier compute hours ($<270\text{ hrs/month}$) while ensuring zero cold starts during college operating hours.
- **2-Year Rolling Retention Engine:** Scheduled monthly prune deletes daily session logs older than 730 days while preserving cumulative attendance percentages, keeping MongoDB Atlas storage indefinitely under 35 MB.
- **Code-Split Bundles:** Dynamic route chunking keeps initial JavaScript payload under 150 KB gzip for instantaneous loading over 3G/4G networks.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS v4, Lucide Icons, Dexie.js (IndexedDB) |
| **Backend** | Node.js (ESM), Express.js, Mongoose, JWT, bcryptjs, node-cron |
| **Database** | MongoDB Atlas (Multi-node Replica Set M0) |
| **Deployment** | Vercel (Frontend on `attendance.gdcadilpur.edu.pk`) & Render (Backend API) |
| **DNS & SSL** | Cloudflare DNS + Vercel Automated Edge SSL |

---

## 📁 Repository Structure

```text
attendance-system/
├── client/                     # Frontend Vite + React 19 PWA
│   ├── public/                 # Static assets, logo, manifest.json, sw.js
│   ├── src/
│   │   ├── api/                # Axios interceptors & base API client
│   │   ├── assets/             # Branding assets
│   │   ├── components/         # Protected routes, Navbar, shared UI
│   │   ├── context/            # Authentication & State context
│   │   ├── db/                 # Dexie.js offline schema & sync queue
│   │   ├── pages/
│   │   │   ├── admin/          # Dashboard, Students, Academic, Teachers, Messaging, Reports
│   │   │   ├── teacher/        # Teacher Portal & Rapid Roll-Call
│   │   │   └── Login.tsx       # Secure Login with "Remember Me"
│   │   ├── App.tsx             # Code-split routing
│   │   └── main.tsx            # Application entrypoint
│   └── vercel.json             # SPA fallback rewrites for Vercel
├── server/                     # Backend Node.js Express API
│   ├── config/                 # MongoDB database connection
│   ├── middleware/             # Auth JWT verification & RBAC guards
│   ├── models/                 # Mongoose schemas (Student, Class, User, AttendanceSession, etc.)
│   ├── routes/                 # Express REST endpoints
│   ├── services/               # Keep-alive pinger, retention cleaner, SMS service
│   ├── utils/                  # JWT signers & password helpers
│   └── server.js               # Main Express application & Cron scheduler
├── package.json                # Root package scripts
└── README.md                   # Project documentation
```

---

## 📜 License & Governance

Developed for **Government Degree College Adilpur**, College Education Department, Government of Sindh.  
All rights reserved © 2026.
