import { useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../context/AuthContext";

const LayoutContent = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user } = useAuth();
  const navigate = useNavigate();

  // ถ้าไม่มี user ให้เด้งไป /signin
 useEffect(() => {
    if (!user) navigate("/signin");
  }, [user, navigate]);

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
