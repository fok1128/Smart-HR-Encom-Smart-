import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listenMyLeaveRequests, type LeaveRequestDoc } from "../services/leaveRequests";

function fmtSubmitted(ts: any) {
  const d: Date | null = ts?.toDate?.() ?? null;
  if (!d) return "-";
  return d.toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function LeaveStatusPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<LeaveRequestDoc[]>([]);

  useEffect(() => {
    if (!user?.uid) return;
    const unsub = listenMyLeaveRequests(user.uid, setItems);
    return () => unsub();
  }, [user?.uid]);

  const rows = useMemo(() => items ?? [], [items]);

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
                  <tr key={r.id} className="bg-white dark:bg-gray-900">
                    <td className="px-3 py-3 font-semibold text-gray-900 dark:text-gray-100">{r.requestNo}</td>

                    <td className="px-3 py-3 text-gray-800 dark:text-gray-200">
                      {r.category} • {r.subType}
                    </td>

                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {String(r.startAt).replace("T", " ")} → {String(r.endAt).replace("T", " ")}
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

        {rows.length > 0 && (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            * หมายเหตุ/เหตุผลแสดงในปฏิทินรายละเอียดรายวันด้วย
          </div>
        )}
      </div>
    </div>
  );
}
