import { useEffect } from "react";
import { useLocation } from "react-router-dom";
const BASE = "Smart HR @PEA ENCOM SMART";
function getTitle(pathname) {
    // อยากให้ละเอียดขึ้นค่อยเพิ่ม mapping ได้
    if (pathname.startsWith("/signin"))
        return `${BASE} - Sign In`;
    if (pathname.startsWith("/signup"))
        return `${BASE} - Sign Up`;
    if (pathname.startsWith("/reset-password"))
        return `${BASE} - Reset Password`;
    if (pathname === "/")
        return `${BASE} - Dashboard`;
    if (pathname.startsWith("/profile"))
        return `${BASE} - Profile`;
    if (pathname.startsWith("/calendar"))
        return `${BASE} - Calendar`;
    return BASE;
}
export default function TitleManager() {
    const { pathname } = useLocation();
    useEffect(() => {
        const title = getTitle(pathname);
        // ตั้งทันที
        document.title = title;
        // กันเคสมีตัวอื่นมาตั้งทับ “ทีหลัง”
        const id = window.setTimeout(() => {
            document.title = title;
        }, 0);
        return () => window.clearTimeout(id);
    }, [pathname]);
    return null;
}
