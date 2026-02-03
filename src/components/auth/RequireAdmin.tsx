import React, { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useToastCenter } from "../common/ToastCenter";

export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useToastCenter();

  const role = String(user?.role || "").toUpperCase();
  const isAdmin = role === "ADMIN";

  // ✅ กัน useEffect ยิงซ้ำ (React StrictMode dev)
  const firedRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    // ✅ กันทำงานซ้ำทุกกรณี
    if (firedRef.current) return;

    // ยังไม่ล็อกอิน → ไป signin
    if (!user) {
      firedRef.current = true;
      navigate("/signin", { replace: true, state: { from: location } });
      return;
    }

    // ไม่ใช่ ADMIN → toast + เด้งกลับ
    if (!isAdmin) {
      firedRef.current = true;

      showToast("ไม่มีสิทธิ์เข้าหน้านี้", {
        title: "Access denied",
        variant: "danger",
        durationMs: 2200,
      });

      navigate(-1);
      return;
    }

    // ✅ ถ้าเป็น admin ปล่อยผ่าน (ไม่ต้อง lock ก็ได้ แต่กันไว้ให้ชัวร์)
    firedRef.current = true;
  }, [loading, user, isAdmin, navigate, location, showToast]);

  if (loading) return null;
  if (!user) return null;
  if (!isAdmin) return null;

  return <>{children}</>;
}
