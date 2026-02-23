import { useEffect, useMemo, useRef, useState } from "react";
import liff from "@line/liff";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import AppButton from "../components/common/AppButton";

const LIFF_ID = import.meta.env.VITE_LINE_LIFF_ID;

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string) ||
  (import.meta.env.VITE_API_BASE as string);

export default function LineLinkPage() {
  const { loading, refreshMe } = useAuth(); // ✅ เพิ่ม refreshMe
  const nav = useNavigate();
  const location = useLocation();

  const [status, setStatus] = useState("กำลังเริ่มต้น...");
  const [lineUserId, setLineUserId] = useState("");
  const [needsWebLogin, setNeedsWebLogin] = useState(false);
  const [busy, setBusy] = useState(true);

  const startedRef = useRef(false);

  const signinState = useMemo(
    () => ({ from: { pathname: "/line-link" }, prev: location.pathname }),
    [location.pathname]
  );

  const waitForFirebaseUser = async (ms = 9000) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      const fbUser = getAuth().currentUser;
      if (fbUser) return fbUser;
      await new Promise((r) => setTimeout(r, 250));
    }
    return null;
  };

  const doLink = async () => {
    setBusy(true);
    setNeedsWebLogin(false);

    try {
      if (!LIFF_ID) throw new Error("Missing VITE_LINE_LIFF_ID");
      if (!API_BASE) throw new Error("Missing VITE_API_BASE_URL (or VITE_API_BASE)");

      await liff.init({ liffId: LIFF_ID });

      if (!liff.isLoggedIn()) {
        setStatus("กำลังพาไปล็อกอิน LINE...");
        liff.login({ redirectUri: window.location.href });
        return;
      }

      const profile = await liff.getProfile();
      setLineUserId(profile.userId);

      setStatus("กำลังตรวจสอบการเข้าสู่ระบบเว็บ...");
      const fbUser = await waitForFirebaseUser();

      if (!fbUser) {
        setNeedsWebLogin(true);
        setStatus("ต้องเข้าสู่ระบบเว็บก่อน เพื่อเชื่อมบัญชี LINE");
        return;
      }

      setStatus("กำลังผูกบัญชี LINE...");
      const token = await fbUser.getIdToken();

      const resp = await fetch(`${API_BASE}/line/link`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ lineUserId: profile.userId }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data?.ok) {
        throw new Error(data?.error || `LINK_FAILED_${resp.status}`);
      }

      // ✅ สำคัญ: refresh /me ให้ปุ่มใน Profile ปิดทันที
      await refreshMe();

      setStatus("✅ ผูกบัญชีสำเร็จ! กลับไปหน้าโปรไฟล์ได้เลย");
      setNeedsWebLogin(false);
    } catch (e: any) {
      setStatus(`❌ ผูกไม่สำเร็จ: ${e?.message || e}`);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (startedRef.current) return;
    if (loading) return;

    startedRef.current = true;
    void doLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <div className="mx-auto max-w-xl p-6">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
          เชื่อมบัญชี LINE
        </div>
        <div className="mt-2 text-sm text-gray-700 dark:text-gray-300">{status}</div>

        {needsWebLogin && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-100">
            <div className="font-semibold">ต้องเข้าสู่ระบบเว็บก่อน</div>
            <div className="mt-1 text-xs opacity-90">
              ใน LINE in-app browser บางครั้ง session เว็บอาจหลุด/ไม่ติด กรุณากดปุ่มด้านล่างเพื่อเข้าสู่ระบบ แล้วกลับมาหน้านี้
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <AppButton
                type="button"
                variant="primary"
                onClick={() => nav("/signin", { state: signinState })}
              >
                ไปหน้าเข้าสู่ระบบ
              </AppButton>
              <AppButton type="button" variant="outline" onClick={() => doLink()}>
                ลองเชื่อมอีกครั้ง
              </AppButton>
            </div>
          </div>
        )}

        {!needsWebLogin && !busy && status.startsWith("❌") && (
          <div className="mt-4 flex gap-2">
            <AppButton type="button" variant="primary" onClick={() => doLink()}>
              ลองใหม่
            </AppButton>
          </div>
        )}

        {lineUserId && (
          <div className="mt-4 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200">
            LINE userId: {lineUserId}
          </div>
        )}

        <div className="mt-4 flex gap-2">
          <AppButton type="button" variant="outline" onClick={() => nav("/profile")}>
            กลับไปหน้าโปรไฟล์
          </AppButton>
        </div>
      </div>
    </div>
  );
}