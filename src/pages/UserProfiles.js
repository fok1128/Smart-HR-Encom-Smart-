import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import UserAddressCard from "../components/UserProfile/UserAddressCard";
import PageMeta from "../components/common/PageMeta";
export default function UserProfiles() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "React.js Profile Dashboard | TailAdmin - Next.js Admin Dashboard Template", description: "This is React.js Profile Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Profile" }), _jsxs("div", { className: "rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6", children: [_jsx("h3", { className: "mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7", children: "Profile" }), _jsxs("div", { className: "space-y-6", children: [_jsx(UserMetaCard, {}), _jsx(UserInfoCard, {}), _jsx(UserAddressCard, {})] })] })] }));
}
