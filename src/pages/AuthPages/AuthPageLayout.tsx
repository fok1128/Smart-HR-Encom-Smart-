import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">
        {/* ================= LEFT (50%) ================= */}
        <div
          className="relative hidden lg:block lg:w-1/2 min-h-screen bg-cover bg-center"
          style={{ backgroundImage: "url('/solar-bg.jpg')" }}
        >
          {/* overlay นิด ๆ ให้เหมือนรูปเก่า */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />

          {/* โลโก้ด้านบน (ย้ายไปมุมซ้ายบนเหมือนรูปเก่า) */}
          <div className="absolute left-8 top-8 z-10 rounded-2xl bg-white/90 p-6 shadow-lg backdrop-blur">
            <img
              src="/company-logo2.png"
              alt="PEA ENCOM SMART SOLUTION"
              className="h-24 2xl:h-28 w-auto object-contain"
            />
          </div>

          {/* ข้อความล่างซ้าย */}
          <div className="absolute bottom-10 left-10 z-10 text-white">
            <h2 className="text-4xl font-extrabold">Smart HR</h2>
            <p className="mt-2 text-sm opacity-90">
              PEA ENCOM SMART SOLUTION CO., LTD.
            </p>
          </div>
        </div>

        {/* ================= RIGHT (50%) ================= */}
        <div className="relative w-full lg:w-1/2 min-h-screen bg-gradient-to-br from-[#5A1765] via-[#7A2E85] to-[#B56BBF] overflow-hidden">
          {/* เงากลุ่มคนด้านล่าง */}
          <img
            src="/silhouette.png"
            alt=""
            className="pointer-events-none select-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] max-w-none opacity-[0.12]"
          />

          {/* การ์ด Login (ให้โทนเหมือนรูปเก่า: ม่วงอ่อน) */}
          <div className="relative z-10 flex justify-center px-10 pt-10">
            <div className="w-full max-w-3xl rounded-2xl shadow-xl p-8 sm:p-10 bg-[#E7D7EA] text-gray-900">
              {children}
            </div>
          </div>

          {/* Theme toggle */}
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>
      </div>
    </div>
  );
}
