type Announcement = {
  id: string;
  title: string;
  priorityLabel?: string; // เช่น (ด่วนที่สุด)
  author: string;
  announcedAt: string; // ISO
  body: string;
};

const mockAnnouncements: Announcement[] = [
  {
    id: "1",
    title: "แจ้งปิดระบบสารสนเทศและเครือข่ายชั่วคราว",
    priorityLabel: "ด่วนที่สุด",
    author: "สำนักคอมพิวเตอร์และเทคโนโลยีสารสนเทศ",
    announcedAt: "2026-01-29T10:00:00.000Z",
    body:
      "แจ้งปิดระบบสารสนเทศและเครือข่ายชั่วคราว ในวันพฤหัสบดีที่ 29 มกราคม 2569 เวลา 17.00–20.00 น. " +
      "เนื่องจากระบบไฟฟ้าของอาคารอเนกประสงค์เกิดความเสียหายและมีความจำเป็นต้องดำเนินการแก้ไขอย่างเร่งด่วน " +
      "ส่งผลให้ระบบไม่สามารถให้บริการได้ชั่วคราว",
  },
];

function formatThaiDate(iso: string) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

export default function AnnouncementHome() {
  const a = mockAnnouncements[0];

  return (
    <div className="w-full">
      {/* Header + Breadcrumb */}
      <div className="mb-6 flex flex-col gap-1">
        <div className="flex items-end gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-gray-900 dark:text-white">
            หน้าแรก
          </h1>
          <div className="pb-1 text-sm text-gray-500 dark:text-gray-400">
            <span className="opacity-60">|</span>{" "}
            <span className="font-medium text-cyan-700 dark:text-cyan-300">
              ข่าวประกาศ
            </span>
          </div>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          อัปเดตข้อมูลและประกาศสำคัญของระบบ
        </p>
      </div>

      {/* Wrapper กันโล่งเกิน + จัดสัดส่วนอ่านง่าย */}
      <div className="max-w-5xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-800">
          {/* Card header */}
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                ข่าวประกาศล่าสุด
              </h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                แสดงรายการประกาศเพื่อให้พนักงานรับทราบ
              </p>
            </div>

            {/* แสดงวันที่แบบชิค ๆ */}
            <div className="hidden rounded-xl bg-gray-50 px-3 py-2 text-xs font-medium text-gray-600 ring-1 ring-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700 sm:block">
              อัปเดต: {formatThaiDate(a.announcedAt)}
            </div>
          </div>

          {/* Content */}
          <div className="relative grid gap-6 sm:grid-cols-[36px_1fr]">
            {/* Timeline */}
            <div className="relative hidden sm:block">
              <div className="absolute left-1/2 top-1 h-full w-px -translate-x-1/2 bg-gray-200 dark:bg-gray-800" />
              <div className="sticky top-28">
                <div className="mx-auto mt-1 h-4 w-4 rounded-full bg-cyan-500 ring-4 ring-white shadow-sm dark:ring-gray-900" />
              </div>
            </div>

            {/* Main body */}
            <div className="rounded-xl bg-gray-50 p-5 ring-1 ring-gray-200 dark:bg-gray-800/40 dark:ring-gray-800">
              {/* Title row */}
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {a.title}
                    </h3>

                    {a.priorityLabel ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-900/40">
                        {a.priorityLabel}
                      </span>
                    ) : null}
                  </div>

                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                    โปรดอ่านรายละเอียดและวางแผนการใช้งานระบบล่วงหน้า
                  </p>
                </div>

                {/* Meta */}
                <div className="shrink-0 rounded-xl bg-white px-4 py-3 text-sm ring-1 ring-gray-200 dark:bg-gray-900 dark:ring-gray-700">
                  <div className="text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">ประกาศโดย:</span>{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {a.author}
                    </span>
                  </div>
                  <div className="mt-1 text-gray-600 dark:text-gray-300">
                    <span className="font-semibold">วันที่ประกาศ:</span>{" "}
                    <span className="font-medium text-gray-800 dark:text-gray-100">
                      {formatThaiDate(a.announcedAt)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="mt-4 text-[15px] leading-7 text-gray-700 dark:text-gray-200">
                {a.body}
              </div>

              {/* Footer line */}
              <div className="mt-5 flex items-center justify-between border-t border-gray-200 pt-4 text-xs text-gray-500 dark:border-gray-700 dark:text-gray-400">
                <span>หมายเหตุ: เวลาอาจมีการเปลี่ยนแปลงตามสถานการณ์</span>
                <span className="hidden sm:block">Ref: ANN-{a.id.padStart(4, "0")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
