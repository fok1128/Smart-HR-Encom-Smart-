import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from "react-router-dom";
const PageBreadcrumb = ({ pageTitle }) => {
    return (_jsxs("div", { className: "flex flex-wrap items-center justify-between gap-3 mb-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800 dark:text-white/90", "x-text": "pageName", children: pageTitle }), _jsx("nav", { children: _jsxs("ol", { className: "flex items-center gap-1.5", children: [_jsx("li", { children: _jsxs(Link, { className: "inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400", to: "/", children: ["Home", _jsx("svg", { className: "stroke-current", width: "17", height: "16", viewBox: "0 0 17 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M6.0765 12.667L10.2432 8.50033L6.0765 4.33366", stroke: "", strokeWidth: "1.2", strokeLinecap: "round", strokeLinejoin: "round" }) })] }) }), _jsx("li", { className: "text-sm text-gray-800 dark:text-white/90", children: pageTitle })] }) })] }));
};
export default PageBreadcrumb;
