import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const BASE = "Smart HR @PEA ENCOM SMART";

function getTitle(pathname: string) {
  if (pathname.startsWith("/signin")) return `${BASE} - Sign In`;
  if (pathname.startsWith("/signup")) return `${BASE} - Sign Up`;
  if (pathname.startsWith("/reset-password")) return `${BASE} - Reset Password`;
  if (pathname === "/") return `${BASE} - Dashboard`;
  if (pathname.startsWith("/profile")) return `${BASE} - Profile`;
  if (pathname.startsWith("/calendar")) return `${BASE} - Calendar`;
  if (pathname.startsWith("/blank")) return `${BASE} - Blank`;
  if (pathname.startsWith("/form-elements")) return `${BASE} - Forms`;
  if (pathname.startsWith("/basic-tables")) return `${BASE} - Tables`;
  return BASE;
}

export default function TitleLock() {
  const { pathname } = useLocation();

  useEffect(() => {
    const desired = getTitle(pathname);

    const ensureTitleEl = () => {
      let titleEl = document.querySelector("title");
      if (!titleEl) {
        titleEl = document.createElement("title");
        document.head.appendChild(titleEl);
      }
      return titleEl;
    };

    const apply = () => {
      const titleEl = ensureTitleEl();
      if (titleEl.textContent !== desired) titleEl.textContent = desired;
      if (document.title !== desired) document.title = desired;
    };

    // ✅ ตั้งทันที
    apply();

    // ✅ เฝ้าทั้ง <head> กันเคสมีคนสร้าง/ลบ <title> ใหม่
    const headObserver = new MutationObserver(() => apply());
    headObserver.observe(document.head, { childList: true, subtree: true });

    // ✅ เฝ้าตัว <title> โดยตรง (ถ้ามี)
    const titleEl = ensureTitleEl();
    const titleObserver = new MutationObserver(() => apply());
    titleObserver.observe(titleEl, { childList: true });

    return () => {
      headObserver.disconnect();
      titleObserver.disconnect();
    };
  }, [pathname]);

  return null;
}
