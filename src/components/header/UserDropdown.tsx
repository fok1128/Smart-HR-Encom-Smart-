import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function UserDropdown() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleSignOut = () => {
    logout();
    // ✅ ใช้ replace กันปุ่ม back พากลับเข้าหลังบ้าน
    navigate("/signin", { replace: true });
    setOpen(false);
  };

  // ✅ ปิด dropdown เมื่อคลิกข้างนอก
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // ถ้าไม่มี user (ยังไม่ login) ไม่ต้องโชว์ dropdown
  if (!user) return null;

  const fullName = `${user.fname ?? ""} ${user.lname ?? ""}`.trim() || "User";

  return (
    <div className="relative" ref={menuRef}>
      {/* ปุ่มเปิด dropdown */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {/* รูป (ถ้าไม่มีให้เป็นวงกลม) */}
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700" />
        <div className="hidden text-left sm:block">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {fullName}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {user.email}
          </div>
        </div>
        <span className="text-gray-500 dark:text-gray-400">▾</span>
      </button>

      {/* เมนู */}
      {open && (
        <div className="absolute right-0 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-lg dark:border-gray-800 dark:bg-gray-900">
          <div className="px-3 py-2">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              {fullName}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {user.email}
            </div>
          </div>

          <div className="my-2 h-px bg-gray-200 dark:bg-gray-800" />

          <Link
            to="/profile"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
            onClick={() => setOpen(false)}
          >
            👤 Edit profile
          </Link>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            ⚙️ Account settings
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            ℹ️ Support
          </button>

          <div className="my-2 h-px bg-gray-200 dark:bg-gray-800" />

          {/* ✅ Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            ⎋ Sign out
          </button>
        </div>
      )}
    </div>
  );
}
