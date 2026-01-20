import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import BarChartOne from "../../components/charts/bar/BarChartOne";
import PageMeta from "../../components/common/PageMeta";
export default function BarChart() {
    return (_jsxs("div", { children: [_jsx(PageMeta, { title: "React.js Chart Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Chart Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Bar Chart" }), _jsx("div", { className: "space-y-6", children: _jsx(ComponentCard, { title: "Bar Chart 1", children: _jsx(BarChartOne, {}) }) })] }));
}
