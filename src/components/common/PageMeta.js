import { Fragment as _Fragment, jsx as _jsx } from "react/jsx-runtime";
import { useEffect } from "react";
export default function PageMeta({ title, description }) {
    useEffect(() => {
        if (title)
            document.title = title;
        const meta = document.querySelector('meta[name="description"]') ||
            document.createElement("meta");
        meta.setAttribute("name", "description");
        meta.setAttribute("content", description ?? "");
        if (!meta.parentNode)
            document.head.appendChild(meta);
    }, [title, description]);
    return null;
}
export function AppWrapper({ children }) {
    return _jsx(_Fragment, { children: children });
}
