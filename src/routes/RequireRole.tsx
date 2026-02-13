// src/routes/RequireRole.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToastCenter } from "../components/common/ToastCenter";

/** อนุญาตเฉพาะ role ที่กำหนด */
export default function RequireRole({ allow }: { allow: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { showToast } = useToastCenter();

  // ทำ allow ให้ stable + เทียบแบบ uppercase
  const allowUpper = useMemo(
    () => (Array.isArray(allow) ? allow : []).map((r) => String(r || "").toUpperCase()),
    [allow]
  );

  // กัน toast เด้งซ้ำ (แต่ต้อง reset ได้เมื่อ user/role กลับมาปกติ)
  const firedRef = useRef(false);

  // คำนวณสิทธิ์แบบ memo
  const role = String(user?.role || "").toUpperCase();
  const ok = allowUpper.includes(role);

  useEffect(() => {
    if (loading) return;

    // ยังไม่ login -> reset เพื่อกันค้างจาก session ก่อนหน้า
    if (!user) {
      firedRef.current = false;
      return;
    }

    // ไม่มีสิทธิ์ -> toast ครั้งเดียว
    if (!ok && !firedRef.current) {
      firedRef.current = true;
      showToast("ไม่มีสิทธิ์เข้าหน้านี้", { variant: "danger", title: "Access denied" });
      return;
    }

    // กลับมามีสิทธิ์ -> reset ให้ยิงได้ใหม่ในอนาคต (เช่น role เปลี่ยน, switch account)
    if (ok) {
      firedRef.current = false;
    }
  }, [loading, user, ok, showToast]);

  if (loading) return null;

  // ยังไม่ login
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // ไม่มีสิทธิ์
  if (!ok) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
