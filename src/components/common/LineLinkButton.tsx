import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

function LineIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        fill="currentColor"
        d="M19.365 10.372c0-3.641-3.65-6.602-8.137-6.602S3.09 6.731 3.09 10.372c0 3.266 2.894 6.001 6.805 6.52.265.057.624.174.716.398.083.205.054.526.027.735 0 0-.095.57-.115.69-.035.205-.16.802.703.437.863-.365 4.658-2.742 6.355-4.692 1.175-1.287 1.784-2.889 1.784-4.068zm-12.9-.768h7.16c.182 0 .331.149.331.331a.332.332 0 0 1-.331.331H6.465a.332.332 0 0 1-.331-.331c0-.182.149-.331.331-.331zm6.829 2.6H6.465a.332.332 0 0 1-.331-.331c0-.182.149-.331.331-.331h6.829c.182 0 .331.149.331.331 0 .182-.149.331-.331.331zm-6.829 2.6h4.957c.182 0 .331.149.331.331a.332.332 0 0 1-.331.331H6.465a.332.332 0 0 1-.331-.331c0-.182.149-.331.331-.331z"
      />
    </svg>
  );
}

export default function LineLinkButton({ className = "" }: { className?: string }) {
  const { user, roleReady } = useAuth();
  const nav = useNavigate();
  const location = useLocation();

  const linked = !!user?.lineUserId; // ✅ มาจาก /me แล้ว
  const checking = !!user && !roleReady; // ✅ lite user (ยัง hydrate ไม่เสร็จ)
  const targetPath = "/line-link";

  const disabled = linked || checking;

  const go = () => {
    if (disabled) return;

    if (!user) {
      nav("/signin", {
        state: { from: { pathname: targetPath }, prev: location.pathname },
      });
      return;
    }
    nav(targetPath);
  };

  const label = linked ? "เชื่อม LINE แล้ว" : checking ? "กำลังตรวจสอบ..." : "เชื่อมบัญชี LINE";

  return (
    <button
      type="button"
      onClick={go}
      disabled={disabled}
      className={[
        "inline-flex items-center gap-2",
        "rounded-full px-4 py-2",
        "text-sm font-semibold leading-none whitespace-nowrap",
        "text-white shadow-sm",
        "bg-[#06C755] hover:bg-[#05B84C]",
        "disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:bg-[#06C755]",
        className,
      ].join(" ")}
      title={linked ? "บัญชีนี้เชื่อม LINE แล้ว" : "เชื่อมบัญชี LINE"}
    >
      <LineIcon className="h-4 w-4" />
      {label}
    </button>
  );
}