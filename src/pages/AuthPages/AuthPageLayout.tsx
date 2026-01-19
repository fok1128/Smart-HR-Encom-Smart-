import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="flex min-h-screen w-full flex-col lg:flex-row">

        {/* ================= LEFT (50%) ================= */}
        <div
          className="relative hidden lg:block lg:w-1/2 min-h-screen bg-cover bg-center"
          style={{ backgroundImage: "url('/solar-bg.jpg')" }}
        >
          {/* โลโก้ด้านบน */}
          <div className="relative z-10 px-10 pt-10">
            <div className="mx-auto max-w-2xl text-center">
              <div className="rounded-2xl bg-white/95 p-10 shadow-lg">
                <img
                  src="/company-logo2.png"
                  alt="PEA ENCOM SMART SOLUTION"
                  className="mx-auto max-h-[360px] 2xl:max-h-[440px] w-auto object-contain"
                />
              </div>

              <p className="mt-6 text-white/90 text-lg">
                
              </p>
            </div>
          </div>

          {/* ข้อความล่าง */}
          <div className="absolute bottom-10 left-10 text-white z-10">
            <h2 className="text-4xl font-semibold">Smart HR</h2>
            <p className="mt-2 text-sm opacity-90">
              PEA ENCOM SMART SOLUTION CO., LTD.
            </p>
          </div>
        </div>

        {/* ================= RIGHT (50%) ================= */}
        <div
          className="
            relative w-full lg:w-1/2 min-h-screen
            bg-gradient-to-br
            from-[#5A1765]
            via-[#7A2E85]
            to-[#B56BBF]
            overflow-hidden
          "
        >
          {/* 👥 เงากลุ่มคนด้านล่าง */}
          <img
            src="/silhouette.png"
            alt=""
            className="
              pointer-events-none select-none
              absolute bottom-0 left-1/2 -translate-x-1/2
              w-[120%] max-w-none
              opacity-[0.12]
            "
          />

          {/* การ์ด Login (โปร่งขึ้น) */}
          <div className="relative z-10 flex justify-center px-10 pt-10">
            <div
              className="
                w-full max-w-3xl
                rounded-2xl shadow-xl
                p-8 sm:p-10

                /* 🔥 โปร่ง + glass */
                bg-white/75 backdrop-blur-md text-gray-900
                dark:bg-gray-900/65 dark:text-white
              "
            >
              {children}
            </div>
          </div>
        </div>

        {/* Theme toggle */}
        <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
          <ThemeTogglerTwo />
        </div>
      </div>
    </div>
  );
}
