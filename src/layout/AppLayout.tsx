import { useEffect } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useAuth } from "../context/AuthContext";
import PageMeta from "../components/common/PageMeta";

const LayoutContent = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const authPaths = ["/signin", "/signup", "/reset-password"];
    const isAuthPage = authPaths.includes(location.pathname);

    if (!loading && !user && !isAuthPage) {
      navigate("/signin", { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  if (loading) return null;

  return (
    <>
      <PageMeta title="Smart HR @PEA ENCOM SMART" description="Smart HR Dashboard" />

      <div className="min-h-screen bg-gray-50 xl:flex dark:bg-gray-950">
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
    </>
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
