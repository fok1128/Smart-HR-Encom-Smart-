import { jsx as _jsx } from "react/jsx-runtime";
import { useSidebar } from "../context/SidebarContext";
const Backdrop = () => {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();
    if (!isMobileOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 z-40 bg-gray-900/50 lg:hidden", onClick: toggleMobileSidebar }));
};
export default Backdrop;
