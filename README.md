# Smart Leave System (Smart-HR-Encom-Smart)

ระบบเว็บสำหรับ “ยื่นลา–อนุมัติ–ดูประวัติ–ออกรายงาน” ตามบทบาทผู้ใช้  
Frontend ใช้ TailAdmin (React + Tailwind) และ Backend เป็น Express API เชื่อม Firebase/Firestore พร้อมอัปโหลดไฟล์ไป Supabase Storage (Signed URL)

---

## Features
- Authentication + Role-based access  
  Roles: `USER`, `HR`, `MANAGER`, `EXECUTIVE_MANAGER`, `ADMIN`
- Submit leave request + track status
- Approve / Reject + approval history
- Export approval history to PDF
- Upload attachments (PDF / Images) to Supabase Storage
- Secure file access via Signed URL + server-side policy

---

## Tech Stack
- Frontend: React + Tailwind CSS (TailAdmin template)
- Backend: Node.js + Express
- Auth/DB: Firebase Admin + Firestore
- Storage: Supabase Storage (bucket) + Signed URL

---

## Project Structure (สำคัญ)
- `src/` : Frontend
- `backend/` : Backend API
  - `backend/server.js`
  - `backend/supabase.js`

---

## Requirements
- Node.js 18+ (แนะนำ)
- Firebase Project: Auth + Firestore
- Supabase Project: Storage bucket

---

## Environment Variables

### Frontend (`.env`)
ตัวอย่าง:
- `VITE_API_BASE_URL=http://localhost:4000`

> ปรับตาม port/โดเมนที่คุณใช้จริง

### Backend (`backend/.env`)
ขั้นต่ำที่มักต้องมี:

**Server**
- `PORT=4000`
- `CORS_ORIGIN=http://localhost:5173`

**Supabase**
- `SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `SUPABASE_BUCKET=smart-hr-files`

**Firebase Admin (เลือกอย่างใดอย่างหนึ่ง)**

1) Render/Prod: ใส่ JSON เป็น string ใน ENV  
- `FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"...","private_key":"...","client_email":"..."}`

> หมายเหตุ: `private_key` ต้องมี `\n` ได้ (ระบบใน server.js จะ replace ให้)

หรือ

2) Local: ใช้ไฟล์ service account ในเครื่อง  
- `GOOGLE_APPLICATION_CREDENTIALS=/path/to/serviceAccount.json`

---

## Run (Local)

### 1) Frontend
```bash
npm install
npm run dev
