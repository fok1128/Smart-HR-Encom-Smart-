import { getAuth } from "firebase/auth";

async function testMe() {
  try {
    const auth = getAuth();
    const u = auth.currentUser;

    if (!u) {
      console.log("❌ No currentUser (ยังไม่ login หรือ auth ยังไม่พร้อม)");
      return;
    }

    const token = await u.getIdToken();
    const res = await fetch("http://localhost:4000/me", {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await res.json();
    console.log("✅ /me response:", data);
    return data;
  } catch (e) {
    console.error("testMe error:", e);
  }
}

// โยนให้เรียกจาก Console ได้
if (import.meta.env.DEV) {
  (window as any).testMe = testMe;
}
