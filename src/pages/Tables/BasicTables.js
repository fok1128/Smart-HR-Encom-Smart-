import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
import BasicTableOne from "../../components/tables/BasicTables/BasicTableOne";
export default function BasicTables() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "React.js Basic Tables Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Basic Tables Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Basic Tables" }), _jsx("div", { className: "space-y-6", children: _jsx(ComponentCard, { title: "Basic Table 1", children: _jsx(BasicTableOne, {}) }) })] }));
}
