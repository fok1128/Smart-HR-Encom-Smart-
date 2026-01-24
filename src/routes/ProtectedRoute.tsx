import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user, loading } = useAuth();
  const location = useLocation();

  // รอ auth โหลดก่อน
  if (loading) return null; // หรือใส่ Loading UI ก็ได้

  // ถ้ายังไม่ login -> ไปหน้า signin
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  // login แล้ว -> ให้เข้า route ลูกได้
  return <Outlet />;
}
