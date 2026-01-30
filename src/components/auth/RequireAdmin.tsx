import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return null; // หรือใส่ Loading UI ได้

  // ยังไม่ล็อกอิน
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location }} />;
  }

  // ไม่ใช่ ADMIN
  if (user.role !== "ADMIN") {
    return <Navigate to="/" replace />;
    // ถ้าคุณมีหน้า 403 ก็เปลี่ยนเป็น <Navigate to="/403" replace />
  }

  return <>{children}</>;
}
