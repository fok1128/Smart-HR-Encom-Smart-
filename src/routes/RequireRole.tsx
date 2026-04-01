// src/routes/RequireRole.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useToastCenter } from "../components/common/ToastCenter";

/** อนุญาตเฉพาะ role ที่กำหนด */
export default function RequireRole({ allow }: { allow: string[] }) {
  const { user, loading, roleReady } = useAuth();
  const location = useLocation();
  const { showToast } = useToastCenter();

  const allowUpper = useMemo(
    () => (Array.isArray(allow) ? allow : []).map((r) => String(r || "").toUpperCase()),
    [allow]
  );

  const firedRef = useRef(false);

  const role = String(user?.role || "").toUpperCase();
  const waitingForRole = !!user && !roleReady;
  const ok = allowUpper.includes(role);

  useEffect(() => {
    if (loading || waitingForRole) return;

    if (!user) {
      firedRef.current = false;
      return;
    }

    if (!ok && !firedRef.current) {
      firedRef.current = true;
      showToast("ไม่มีสิทธิ์เข้าหน้านี้", { variant: "danger", title: "Access denied" });
      return;
    }

    if (ok) {
      firedRef.current = false;
    }
  }, [loading, waitingForRole, user, ok, showToast]);

  if (loading || waitingForRole) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center px-4">
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:text-gray-300">
          กำลังตรวจสอบสิทธิ์การเข้าใช้งาน...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  if (!ok) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
