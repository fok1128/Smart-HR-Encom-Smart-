import { jsx as _jsx } from "react/jsx-runtime";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function ProtectedRoute() {
    const { user, loading } = useAuth();
    const location = useLocation();
    if (loading)
        return null; // หรือใส่ Loading UI ก็ได้
    if (!user) {
        return _jsx(Navigate, { to: "/signin", replace: true, state: { from: location } });
    }
    return _jsx(Outlet, {});
}
