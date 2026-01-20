import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import ResponsiveImage from "../../components/ui/images/ResponsiveImage";
import TwoColumnImageGrid from "../../components/ui/images/TwoColumnImageGrid";
import ThreeColumnImageGrid from "../../components/ui/images/ThreeColumnImageGrid";
import ComponentCard from "../../components/common/ComponentCard";
import PageMeta from "../../components/common/PageMeta";
export default function Images() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "React.js Images Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Images page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Images" }), _jsxs("div", { className: "space-y-5 sm:space-y-6", children: [_jsx(ComponentCard, { title: "Responsive image", children: _jsx(ResponsiveImage, {}) }), _jsx(ComponentCard, { title: "Image in 2 Grid", children: _jsx(TwoColumnImageGrid, {}) }), _jsx(ComponentCard, { title: "Image in 3 Grid", children: _jsx(ThreeColumnImageGrid, {}) })] })] }));
}
