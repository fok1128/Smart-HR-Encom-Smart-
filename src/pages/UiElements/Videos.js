import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import ComponentCard from "../../components/common/ComponentCard";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import FourIsToThree from "../../components/ui/videos/FourIsToThree";
import OneIsToOne from "../../components/ui/videos/OneIsToOne";
import SixteenIsToNine from "../../components/ui/videos/SixteenIsToNine";
import TwentyOneIsToNine from "../../components/ui/videos/TwentyOneIsToNine";
export default function Videos() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "React.js Videos Tabs | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Videos page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Videos" }), _jsxs("div", { className: "grid grid-cols-1 gap-5 sm:gap-6 xl:grid-cols-2", children: [_jsxs("div", { className: "space-y-5 sm:space-y-6", children: [_jsx(ComponentCard, { title: "Video Ratio 16:9", children: _jsx(SixteenIsToNine, {}) }), _jsx(ComponentCard, { title: "Video Ratio 4:3", children: _jsx(FourIsToThree, {}) })] }), _jsxs("div", { className: "space-y-5 sm:space-y-6", children: [_jsx(ComponentCard, { title: "Video Ratio 21:9", children: _jsx(TwentyOneIsToNine, {}) }), _jsx(ComponentCard, { title: "Video Ratio 1:1", children: _jsx(OneIsToOne, {}) })] })] })] }));
}
