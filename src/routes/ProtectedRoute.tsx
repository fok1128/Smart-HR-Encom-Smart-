import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute() {
  const { user } = useAuth();
  const location = useLocation();

  // ยังไม่ล็อกอิน -> ส่งไปหน้า signin และจำหน้าที่กำลังจะเข้าไว้
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // ล็อกอินแล้ว -> ให้เข้า route ลูกต่อ
  return <Outlet />;
}
