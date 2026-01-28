import { useEffect } from "react";
const DEFAULT_TITLE = "Smart HR @PEA ENCOM SMART";
const DEFAULT_DESC = "Smart HR PEA ENCOM SMART SOLUTION CO., LTD.";
export default function PageMeta({ title, description }) {
    useEffect(() => {
        // ✅ ตั้ง title เสมอ (มี default)
        document.title = title?.trim() ? title : DEFAULT_TITLE;
        // ✅ meta description (มี default)
        const meta = document.querySelector('meta[name="description"]') ??
            document.createElement("meta");
        meta.setAttribute("name", "description");
        meta.setAttribute("content", description?.trim() ? description : DEFAULT_DESC);
        if (!meta.parentNode)
            document.head.appendChild(meta);
    }, [title, description]);
    return null;
}
