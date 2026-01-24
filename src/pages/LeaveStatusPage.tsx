import { useMemo } from "react";
import { useLeave } from "../context/LeaveContext";

function fmtSubmitted(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("th-TH", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function LeaveStatusPage() {
  const { requests } = useLeave();

  const rows = useMemo(() => requests ?? [], [requests]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">ตรวจสอบสถานะคำร้อง</h1>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          เลขคำร้อง • ประเภท • ช่วงเวลา • สถานะ • ยื่นเมื่อ
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">รายการคำร้องทั้งหมด</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{rows.length} รายการ</div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-600 dark:bg-gray-900/40 dark:text-gray-300">
              <tr>
                <th className="px-3 py-2 font-semibold">เลขคำร้อง</th>
                <th className="px-3 py-2 font-semibold">ประเภท</th>
                <th className="px-3 py-2 font-semibold">ช่วงเวลา</th>
                <th className="px-3 py-2 font-semibold">สถานะ</th>
                <th className="px-3 py-2 font-semibold">ยื่นเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {rows.length === 0 ? (
                <tr>
                  <td className="px-3 py-3 text-gray-500 dark:text-gray-400" colSpan={5}>
                    ยังไม่มีคำร้อง
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.requestNo} className="bg-white dark:bg-gray-900">
                    <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.requestNo}</td>
                    <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                      {r.category} • {r.subType}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {r.startAt.replace("T", " ")} → {r.endAt.replace("T", " ")}
                    </td>
                    <td className="px-3 py-3">
                      <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">{fmtSubmitted(r.submittedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* reason preview */}
        {rows.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            * หมายเหตุ/เหตุผลแสดงในปฏิทินรายละเอียดรายวันด้วย
          </div>
        )}
      </div>
    </div>
  );
}
