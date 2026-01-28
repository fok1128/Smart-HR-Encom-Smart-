import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLeave } from "../context/LeaveContext";
function ChevronDownIcon({ className = "" }) {
    return (_jsx("svg", { className: className, width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M6 9l6 6 6-6", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
function XIcon({ className = "" }) {
    return (_jsx("svg", { className: className, width: "16", height: "16", viewBox: "0 0 24 24", fill: "none", children: _jsx("path", { d: "M18 6L6 18M6 6l12 12", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" }) }));
}
/** ✅ Dropdown custom */
function SelectBox({ label, placeholder, value, options, onChange, disabled, clearable = true, }) {
    const [open, setOpen] = useState(false);
    const wrapRef = useRef(null);
    const selected = useMemo(() => options.find((o) => o.value === value) ?? null, [options, value]);
    useEffect(() => {
        const onClickOutside = (e) => {
            if (!wrapRef.current)
                return;
            if (!wrapRef.current.contains(e.target))
                setOpen(false);
        };
        document.addEventListener("mousedown", onClickOutside);
        return () => document.removeEventListener("mousedown", onClickOutside);
    }, []);
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "Escape")
                setOpen(false);
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, []);
    return (_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: label }), _jsxs("div", { ref: wrapRef, className: "relative mt-2", children: [_jsxs("button", { type: "button", disabled: disabled, onClick: () => !disabled && setOpen((v) => !v), className: [
                            "w-full rounded-md border bg-white px-3 py-2 text-left",
                            "flex items-center justify-between gap-3",
                            "transition",
                            "dark:bg-gray-900",
                            disabled
                                ? "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-500"
                                : "border-gray-300 hover:border-gray-400 dark:border-gray-800 dark:hover:border-gray-700",
                            open && !disabled ? "border-teal-500 ring-2 ring-teal-500/20" : "",
                        ].join(" "), children: [_jsx("span", { className: selected ? "text-gray-900 dark:text-gray-100" : "text-gray-400", children: selected?.label ?? placeholder }), _jsxs("span", { className: "flex items-center gap-2 text-gray-500", children: [clearable && value && !disabled && (_jsx("button", { type: "button", onClick: (e) => {
                                            e.stopPropagation();
                                            onChange("");
                                            setOpen(false);
                                        }, className: "grid h-6 w-6 place-items-center rounded hover:bg-gray-100 dark:hover:bg-gray-800", "aria-label": "Clear", children: _jsx(XIcon, {}) })), _jsx(ChevronDownIcon, { className: open ? "rotate-180 transition" : "transition" })] })] }), open && !disabled && (_jsx("div", { className: "absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-gray-300 bg-white shadow-lg dark:border-gray-800 dark:bg-gray-900", children: _jsx("div", { className: "max-h-64 overflow-auto", children: options.map((opt) => {
                                const isSelected = opt.value === value;
                                return (_jsx("button", { type: "button", onClick: () => {
                                        onChange(opt.value);
                                        setOpen(false);
                                    }, className: [
                                        "w-full px-3 py-2 text-left text-sm",
                                        "transition",
                                        isSelected
                                            ? "bg-teal-50 text-teal-700 font-semibold dark:bg-teal-500/10 dark:text-teal-200"
                                            : "text-gray-900 hover:bg-gray-50 dark:text-gray-100 dark:hover:bg-gray-800/60",
                                    ].join(" "), children: opt.label }, opt.value));
                            }) }) }))] })] }));
}
const subTypeByCategory = {
    ลากิจ: ["ลากิจปกติ", "ลากิจฉุกเฉิน"],
    ลาป่วย: ["ลาป่วยทั่วไป", "ลาหมอนัด", "ลาแบบมีใบรับรองแพทย์"],
    ลาพักร้อน: ["ลาพักร้อน"],
    ลากรณีพิเศษ: ["ลาคลอด", "ลาราชการทหาร", "อื่นๆ"],
};
function todayISODate() {
    const d = new Date();
    const pad2 = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function toISODateTimeLocal(d) {
    const pad2 = (n) => String(n).padStart(2, "0");
    const yyyy = d.getFullYear();
    const mm = pad2(d.getMonth() + 1);
    const dd = pad2(d.getDate());
    const hh = pad2(d.getHours());
    const mi = pad2(d.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function isEndBeforeStart(start, end) {
    if (!start || !end)
        return false;
    return new Date(end).getTime() < new Date(start).getTime();
}
export default function LeaveSubmitPage() {
    const leave = useLeave();
    // ✅ รองรับได้ทั้ง 2 ชื่อ (กันเธอไปแก้ Context แล้วชื่อไม่ตรง)
    const submitLeave = leave.submitLeave;
    const addRequest = leave.addRequest;
    // dropdown
    const [category, setCategory] = useState("");
    const [subType, setSubType] = useState("");
    // mode
    const [mode, setMode] = useState("allDay");
    // all-day
    const [startDate, setStartDate] = useState(todayISODate());
    const [endDate, setEndDate] = useState(todayISODate());
    // timed
    const [startDT, setStartDT] = useState(() => toISODateTimeLocal(new Date()));
    const [endDT, setEndDT] = useState(() => toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
    // note + attachments
    const [reason, setReason] = useState("");
    const [files, setFiles] = useState([]);
    // ui
    const [errors, setErrors] = useState({});
    const [successMsg, setSuccessMsg] = useState("");
    useEffect(() => {
        setSubType("");
    }, [category]);
    // ถ้า all-day แล้ว end < start ให้ดัน end = start อัตโนมัติ
    useEffect(() => {
        if (mode !== "allDay")
            return;
        if (!startDate || !endDate)
            return;
        if (new Date(endDate).getTime() < new Date(startDate).getTime())
            setEndDate(startDate);
    }, [mode, startDate, endDate]);
    const timedInvalid = mode === "time" && isEndBeforeStart(startDT, endDT);
    const categoryOptions = useMemo(() => [
        { value: "ลากิจ", label: "ลากิจ" },
        { value: "ลาป่วย", label: "ลาป่วย" },
        { value: "ลาพักร้อน", label: "ลาพักร้อน" },
        { value: "ลากรณีพิเศษ", label: "ลากรณีพิเศษ" },
    ], []);
    const subTypeOptions = useMemo(() => {
        if (!category)
            return [];
        return subTypeByCategory[category].map((s) => ({ value: s, label: s }));
    }, [category]);
    const resetAll = () => {
        setCategory("");
        setSubType("");
        setMode("allDay");
        setStartDate(todayISODate());
        setEndDate(todayISODate());
        setStartDT(toISODateTimeLocal(new Date()));
        setEndDT(toISODateTimeLocal(new Date(Date.now() + 60 * 60 * 1000)));
        setReason("");
        setFiles([]);
        setErrors({});
        setSuccessMsg("");
    };
    const validate = () => {
        const e = {};
        if (!category)
            e.category = "กรุณาเลือกประเภทการลา";
        if (!subType)
            e.subType = "กรุณาเลือกประเภทย่อย";
        if (mode === "allDay") {
            if (!startDate)
                e.startDate = "กรุณาเลือกวันเริ่ม";
            if (!endDate)
                e.endDate = "กรุณาเลือกวันสิ้นสุด";
        }
        else {
            if (!startDT)
                e.startDT = "กรุณาเลือกวัน-เวลาเริ่ม";
            if (!endDT)
                e.endDT = "กรุณาเลือกวัน-เวลาสิ้นสุด";
            if (startDT && endDT && isEndBeforeStart(startDT, endDT))
                e.endDT = "วัน-เวลาสิ้นสุดต้องไม่น้อยกว่าวัน-เวลาเริ่ม";
        }
        if (!reason.trim())
            e.reason = "กรุณากรอกเหตุผล/รายละเอียด";
        setErrors(e);
        return Object.keys(e).length === 0;
    };
    const handleSubmit = (ev) => {
        ev.preventDefault();
        setSuccessMsg("");
        if (!validate())
            return;
        // ✅ สำคัญมาก: allDay ต้องเป็น YYYY-MM-DD (ไม่มี T) เพื่อให้ Calendar ทำแถบสีได้
        const payload = {
            category: category,
            subType: subType,
            mode, // ✅ ส่ง mode ไปด้วย (Calendar ใช้ได้ชัวร์)
            startAt: mode === "allDay" ? startDate : startDT,
            endAt: mode === "allDay" ? endDate : endDT,
            reason,
            // ✅ ให้ชื่อเดียวกันกับ Context ใหม่ (files) แต่เผื่อของเดิม (attachments) ด้วย
            files: files.map((f) => ({ name: f.name, size: f.size })),
            attachments: files.map((f) => ({ name: f.name, size: f.size })),
        };
        let created;
        if (typeof submitLeave === "function") {
            created = submitLeave(payload);
        }
        else if (typeof addRequest === "function") {
            created = addRequest(payload);
        }
        else {
            console.error("LeaveContext ไม่มี submitLeave/addRequest — ไปเช็ค LeaveContext.tsx");
            setSuccessMsg("ส่งไม่ได้: LeaveContext ไม่มี submitLeave/addRequest");
            return;
        }
        setErrors({});
        setSuccessMsg(`ส่งคำร้องสำเร็จ ✅ เลขคำร้อง: ${created?.requestNo ?? created?.id ?? "-"}`);
    };
    return (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "flex flex-wrap items-end justify-between gap-3", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-semibold text-gray-800 dark:text-gray-100", children: "\u0E22\u0E37\u0E48\u0E19\u0E43\u0E1A\u0E25\u0E32" }), _jsxs("div", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: [_jsx("span", { className: "text-teal-600", children: "\u0E2B\u0E19\u0E49\u0E32\u0E2B\u0E25\u0E31\u0E01" }), " ", _jsx("span", { className: "mx-2", children: "\u203A" }), " \u0E22\u0E37\u0E48\u0E19\u0E43\u0E1A\u0E25\u0E32"] })] }), _jsx("button", { type: "button", onClick: resetAll, className: "rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800", children: "\u0E25\u0E49\u0E32\u0E07\u0E1F\u0E2D\u0E23\u0E4C\u0E21" })] }), successMsg && (_jsx("div", { className: "rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200", children: successMsg })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsx("div", { className: "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900", children: _jsxs("div", { className: "grid grid-cols-1 gap-8 lg:grid-cols-2", children: [_jsxs("div", { children: [_jsx(SelectBox, { label: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E01\u0E32\u0E23\u0E25\u0E32", placeholder: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E01\u0E32\u0E23\u0E25\u0E32", value: category, options: categoryOptions, onChange: (v) => setCategory(v) }), errors.category && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.category })] }), _jsxs("div", { children: [_jsx(SelectBox, { label: "\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E22\u0E48\u0E2D\u0E22", placeholder: "\u0E1B\u0E23\u0E30\u0E40\u0E20\u0E17\u0E22\u0E48\u0E2D\u0E22", value: subType, options: subTypeOptions, onChange: (v) => setSubType(v), disabled: !category }), errors.subType && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.subType })] })] }) }), _jsxs("div", { className: "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900", children: [_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3", children: [_jsxs("div", { children: [_jsx("div", { className: "text-base font-semibold text-gray-900 dark:text-gray-100", children: "\u0E0A\u0E48\u0E27\u0E07\u0E40\u0E27\u0E25\u0E32\u0E01\u0E32\u0E23\u0E25\u0E32" }), _jsx("div", { className: "mt-1 text-sm text-gray-500 dark:text-gray-400", children: "\u0E40\u0E25\u0E37\u0E2D\u0E01 \u201C\u0E17\u0E31\u0E49\u0E07\u0E27\u0E31\u0E19\u201D \u0E2B\u0E23\u0E37\u0E2D \u201C\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E27\u0E25\u0E32\u201D" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsx("input", { type: "radio", name: "leaveMode", checked: mode === "allDay", onChange: () => setMode("allDay") }), "\u0E17\u0E31\u0E49\u0E07\u0E27\u0E31\u0E19"] }), _jsxs("label", { className: "flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800", children: [_jsx("input", { type: "radio", name: "leaveMode", checked: mode === "time", onChange: () => setMode("time") }), "\u0E23\u0E30\u0E1A\u0E38\u0E40\u0E27\u0E25\u0E32"] })] })] }), _jsx("div", { className: "mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2", children: mode === "allDay" ? (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E27\u0E31\u0E19\u0E40\u0E23\u0E34\u0E48\u0E21\u0E25\u0E32" }), _jsx("input", { type: "date", value: startDate, onChange: (e) => setStartDate(e.target.value), className: "mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900" }), errors.startDate && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.startDate })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E27\u0E31\u0E19\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E25\u0E32" }), _jsx("input", { type: "date", value: endDate, min: startDate || undefined, onChange: (e) => setEndDate(e.target.value), className: "mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900" }), errors.endDate && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.endDate })] })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E27\u0E31\u0E19-\u0E40\u0E27\u0E25\u0E32\u0E40\u0E23\u0E34\u0E48\u0E21\u0E25\u0E32" }), _jsx("input", { type: "datetime-local", value: startDT, onChange: (e) => setStartDT(e.target.value), className: "mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900" }), errors.startDT && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.startDT })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E27\u0E31\u0E19-\u0E40\u0E27\u0E25\u0E32\u0E2A\u0E34\u0E49\u0E19\u0E2A\u0E38\u0E14\u0E25\u0E32" }), _jsx("input", { type: "datetime-local", value: endDT, onChange: (e) => setEndDT(e.target.value), className: [
                                                        "mt-2 w-full rounded-md border bg-white px-3 py-2 text-sm outline-none dark:bg-gray-900 dark:border-gray-800",
                                                        "focus:ring-2",
                                                        timedInvalid
                                                            ? "border-red-400 focus:border-red-500 focus:ring-red-500/20"
                                                            : "border-gray-300 focus:border-teal-500 focus:ring-teal-500/20",
                                                    ].join(" ") }), errors.endDT && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.endDT })] })] })) })] }), _jsx("div", { className: "rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900", children: _jsxs("div", { className: "grid grid-cols-1 gap-6 lg:grid-cols-2", children: [_jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25 / \u0E23\u0E32\u0E22\u0E25\u0E30\u0E40\u0E2D\u0E35\u0E22\u0E14" }), _jsx("textarea", { value: reason, onChange: (e) => setReason(e.target.value), rows: 6, placeholder: "\u0E1E\u0E34\u0E21\u0E1E\u0E4C\u0E40\u0E2B\u0E15\u0E38\u0E1C\u0E25\u0E01\u0E32\u0E23\u0E25\u0E32\u2026", className: "mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 dark:border-gray-800 dark:bg-gray-900" }), errors.reason && _jsx("p", { className: "mt-2 text-xs font-semibold text-red-600", children: errors.reason })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-semibold text-gray-700 dark:text-gray-200", children: "\u0E41\u0E19\u0E1A\u0E44\u0E1F\u0E25\u0E4C (\u0E16\u0E49\u0E32\u0E21\u0E35)" }), _jsx("input", { type: "file", multiple: true, onChange: (e) => setFiles(Array.from(e.target.files ?? [])), className: "mt-2 block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-100 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-gray-700 hover:file:bg-gray-200 dark:text-gray-200 dark:file:bg-gray-800 dark:file:text-gray-200 dark:hover:file:bg-gray-700" }), _jsxs("div", { className: "mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-200", children: [_jsx("div", { className: "font-semibold", children: "\u0E44\u0E1F\u0E25\u0E4C\u0E17\u0E35\u0E48\u0E40\u0E25\u0E37\u0E2D\u0E01" }), files.length === 0 ? (_jsx("div", { className: "mt-2 text-gray-500 dark:text-gray-400", children: "\u0E22\u0E31\u0E07\u0E44\u0E21\u0E48\u0E44\u0E14\u0E49\u0E40\u0E25\u0E37\u0E2D\u0E01\u0E44\u0E1F\u0E25\u0E4C" })) : (_jsx("ul", { className: "mt-2 list-disc space-y-1 pl-5", children: files.map((f) => (_jsxs("li", { children: [f.name, " ", _jsxs("span", { className: "text-gray-500", children: ["(", Math.ceil(f.size / 1024), " KB)"] })] }, f.name))) }))] }), _jsx("div", { className: "mt-4 text-xs text-gray-500 dark:text-gray-400", children: "* \u0E15\u0E2D\u0E19\u0E40\u0E0A\u0E37\u0E48\u0E2D\u0E21 backend \u0E04\u0E48\u0E2D\u0E22\u0E2A\u0E48\u0E07\u0E44\u0E1F\u0E25\u0E4C\u0E1C\u0E48\u0E32\u0E19 FormData \u0E44\u0E14\u0E49\u0E40\u0E25\u0E22" })] })] }) }), _jsxs("div", { className: "flex flex-wrap items-center justify-end gap-3", children: [_jsx("button", { type: "button", onClick: resetAll, className: "rounded-lg border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800", children: "\u0E25\u0E49\u0E32\u0E07\u0E1F\u0E2D\u0E23\u0E4C\u0E21" }), _jsx("button", { type: "submit", className: "rounded-lg bg-teal-600 px-6 py-3 text-sm font-semibold text-white hover:bg-teal-700 focus:ring-2 focus:ring-teal-500/30", children: "\u0E2A\u0E48\u0E07\u0E04\u0E33\u0E23\u0E49\u0E2D\u0E07" })] })] })] }));
}
