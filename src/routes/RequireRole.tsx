import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/** อนุญาตเฉพาะ role ที่กำหนด */
export default function RequireRole({ allow }: { allow: string[] }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null;

  // ยังไม่ login
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  const role = (user.role || "").toUpperCase();
  const ok = allow.map((r) => r.toUpperCase()).includes(role);

  // ไม่มีสิทธิ์
  if (!ok) {
    // แจ้งเตือนแบบเร็ว ๆ (ถ้ามี toast ของคุณอยู่แล้ว เดี๋ยวค่อยเปลี่ยนเป็น toast)
    // eslint-disable-next-line no-alert
    alert("ไม่มีสิทธิ์เข้าหน้านี้");
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
