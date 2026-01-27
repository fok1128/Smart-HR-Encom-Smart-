import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import EcommerceMetrics from "../../components/ecommerce/EcommerceMetrics";
import MonthlySalesChart from "../../components/ecommerce/MonthlySalesChart";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import MonthlyTarget from "../../components/ecommerce/MonthlyTarget";
import RecentOrders from "../../components/ecommerce/RecentOrders";
import DemographicCard from "../../components/ecommerce/DemographicCard";
import PageMeta from "../../components/common/PageMeta";
export default function Home() {
    return (_jsxs(_Fragment, { children: [_jsx(PageMeta, { title: "Smart HR @PEA ENCOM SMART", description: "Smart HR Dashboard" }), _jsxs("div", { className: "grid grid-cols-12 gap-4 md:gap-6", children: [_jsxs("div", { className: "col-span-12 space-y-6 xl:col-span-7", children: [_jsx(EcommerceMetrics, {}), _jsx(MonthlySalesChart, {})] }), _jsx("div", { className: "col-span-12 xl:col-span-5", children: _jsx(MonthlyTarget, {}) }), _jsx("div", { className: "col-span-12", children: _jsx(StatisticsChart, {}) }), _jsx("div", { className: "col-span-12 xl:col-span-5", children: _jsx(DemographicCard, {}) }), _jsx("div", { className: "col-span-12 xl:col-span-7", children: _jsx(RecentOrders, {}) })] })] }));
}
