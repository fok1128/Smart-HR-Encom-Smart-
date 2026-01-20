"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = MonthlySalesChart;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_apexcharts_1 = require("react-apexcharts");
var Dropdown_1 = require("../ui/dropdown/Dropdown");
var DropdownItem_1 = require("../ui/dropdown/DropdownItem");
var icons_1 = require("../../icons");
var react_1 = require("react");
function MonthlySalesChart() {
    var options = {
        colors: ["#465fff"],
        chart: {
            fontFamily: "Outfit, sans-serif",
            type: "bar",
            height: 180,
            toolbar: {
                show: false,
            },
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: "39%",
                borderRadius: 5,
                borderRadiusApplication: "end",
            },
        },
        dataLabels: {
            enabled: false,
        },
        stroke: {
            show: true,
            width: 4,
            colors: ["transparent"],
        },
        xaxis: {
            categories: [
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
            ],
            axisBorder: {
                show: false,
            },
            axisTicks: {
                show: false,
            },
        },
        legend: {
            show: true,
            position: "top",
            horizontalAlign: "left",
            fontFamily: "Outfit",
        },
        yaxis: {
            title: {
                text: undefined,
            },
        },
        grid: {
            yaxis: {
                lines: {
                    show: true,
                },
            },
        },
        fill: {
            opacity: 1,
        },
        tooltip: {
            x: {
                show: false,
            },
            y: {
                formatter: function (val) { return "".concat(val); },
            },
        },
    };
    var series = [
        {
            name: "Sales",
            data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
        },
    ];
    var _a = (0, react_1.useState)(false), isOpen = _a[0], setIsOpen = _a[1];
    function toggleDropdown() {
        setIsOpen(!isOpen);
    }
    function closeDropdown() {
        setIsOpen(false);
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center justify-between", children: [(0, jsx_runtime_1.jsx)("h3", { className: "text-lg font-semibold text-gray-800 dark:text-white/90", children: "Monthly Sales" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative inline-block", children: [(0, jsx_runtime_1.jsx)("button", { className: "dropdown-toggle", onClick: toggleDropdown, children: (0, jsx_runtime_1.jsx)(icons_1.MoreDotIcon, { className: "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" }) }), (0, jsx_runtime_1.jsxs)(Dropdown_1.Dropdown, { isOpen: isOpen, onClose: closeDropdown, className: "w-40 p-2", children: [(0, jsx_runtime_1.jsx)(DropdownItem_1.DropdownItem, { onItemClick: closeDropdown, className: "flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300", children: "View More" }), (0, jsx_runtime_1.jsx)(DropdownItem_1.DropdownItem, { onItemClick: closeDropdown, className: "flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300", children: "Delete" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "max-w-full overflow-x-auto custom-scrollbar", children: (0, jsx_runtime_1.jsx)("div", { className: "-ml-5 min-w-[650px] xl:min-w-full pl-2", children: (0, jsx_runtime_1.jsx)(react_apexcharts_1.default, { options: options, series: series, type: "bar", height: 180 }) }) })] }));
}
