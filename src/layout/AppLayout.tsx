import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../context/AuthContext";

const LayoutContent = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user, loading } = useAuth(); // ✅ เพิ่ม loading
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authPaths = ["/signin", "/signup", "/reset-password"];
    const isAuthPage = authPaths.includes(location.pathname);

    // ✅ รอให้ auth เช็คเสร็จก่อนค่อยเด้ง
    if (!loading && !user && !isAuthPage) {
      navigate("/signin", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  // ✅ ระหว่างกำลังโหลด session จะไม่เด้ง/ไม่กระพริบ
  if (loading) return null; // หรือใส่ Loading UI ก็ได้

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>

      <div
        className={`flex-1 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        } ${isMobileOpen ? "ml-0" : ""}`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-(--breakpoint-2xl) md:p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
