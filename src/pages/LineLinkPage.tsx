import { useEffect, useState } from "react";
import liff from "@line/liff";
import { useAuth } from "../context/AuthContext";

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID;
const API_BASE = import.meta.env.VITE_API_BASE;

export default function LineLinkPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("กำลังเริ่มต้น...");
  const [lineUserId, setLineUserId] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (!LIFF_ID) throw new Error("Missing VITE_LINE_LIFF_ID");
        if (!API_BASE) throw new Error("Missing VITE_API_BASE");

        await liff.init({ liffId: LIFF_ID });

        if (!liff.isLoggedIn()) {
          setStatus("กำลังพาไปล็อกอิน LINE...");
          liff.login();
          return;
        }

        const profile = await liff.getProfile();
        setLineUserId(profile.userId);

        if (!user) {
          setStatus("กรุณาเข้าสู่ระบบเว็บก่อน แล้วค่อยเชื่อม LINE");
          return;
        }

        setStatus("กำลังผูกบัญชี LINE...");
        const token = await user.getIdToken();

        const resp = await fetch(`${API_BASE}/line/link`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ lineUserId: profile.userId }),
        });

        const data = await resp.json().catch(() => ({}));
        if (!resp.ok || !data?.ok) throw new Error(data?.error || "LINK_FAILED");

        setStatus("✅ ผูกบัญชีสำเร็จ! ปิดหน้านี้ได้เลย");
      } catch (e: any) {
        setStatus(`❌ ผูกไม่สำเร็จ: ${e?.message || e}`);
      }
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">เชื่อมบัญชี LINE</div>
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{status}</div>

        {lineUserId && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            LINE userId: {lineUserId}
          </div>
        )}
      </div>
    </div>
  );
}
