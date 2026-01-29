import React from "react";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <div className="relative flex min-h-screen w-full flex-col lg:flex-row">
        {/* ================= LEFT (50%) ================= */}
        <div
          className="relative hidden min-h-screen bg-cover bg-center lg:block lg:w-1/2"
          style={{ backgroundImage: "url('/solar-bg3.jpg')" }}
        >
          {/* overlay นิด ๆ ให้เหมือนรูปเก่า */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-black/0" />

          {/* โลโก้บนกลางฝั่งซ้าย */}
          <div className="absolute top-6 left-1/2 z-10 -translate-x-1/2">
            <div
              className="rounded-[32px] bg-white/90 shadow-2xl backdrop-blur
                         w-[480px] h-[190px] md:w-[560px] md:h-[220px] 2xl:w-[620px] 2xl:h-[240px]
                         flex items-center justify-center px-8 py-6"
            >
              <img
                src="/company-logo2.png"
                alt="PEA ENCOM SMART SOLUTION"
                className="w-full h-full object-contain -translate-y-1"
              />
            </div>
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
        <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-br from-[#5A1765] via-[#7A2E85] to-[#B56BBF] lg:w-1/2 lg:-ml-px">

          {/* เงากลุ่มคน/ตึกด้านล่าง (ลงมาอีก) */}
            <img
              src="/silhouette3.png"
              alt=""
              className="pointer-events-none select-none absolute -bottom-48 left-1/2 -translate-x-1/2
                        w-[115%] max-w-none opacity-[0.12]"
            />


          {/* การ์ด Login (แคบลงอีก) */}
          <div className="relative z-10 flex justify-center px-6 pt-8">
            <div className="w-full max-w-lg rounded-2xl bg-[#E7D7EA] p-6 sm:p-7 text-gray-900 shadow-xl">
              {children}
            </div>
          </div>

          {/* Theme toggle */}
          <div className="fixed bottom-6 right-6 z-50 hidden sm:block">
            <ThemeTogglerTwo />
          </div>
        </div>

        {/* ===== Fade divider ตรงกลาง (เฉพาะจอใหญ่) ===== */}
    {/* ===== Seamless edge blend (เนียนมาก) ===== */}
<div className="pointer-events-none absolute inset-y-0 left-1/2 hidden -translate-x-1/2 lg:block z-40">
  <div
    className="h-full w-24"
    style={{
      WebkitMaskImage:
        "linear-gradient(to right, transparent 0%, black 30%, black 70%, transparent 100%)",
      maskImage:
        "linear-gradient(to right, transparent 0%, black 30%, black 70%, transparent 100%)",
      filter: "blur(10px)", // << ทำให้ขอบละลายจริง ไม่เป็นแถบ
    }}
  >
    <div className="h-full w-full bg-white/8 backdrop-blur-[12px]" />
  </div>
</div>
      </div>
    </div>
  );
}
