import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import Chart from "react-apexcharts";
import { Dropdown } from "../ui/dropdown/Dropdown";
import { DropdownItem } from "../ui/dropdown/DropdownItem";
import { MoreDotIcon } from "../../icons";
import { useState } from "react";
export default function MonthlySalesChart() {
    const options = {
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
                formatter: (val) => `${val}`,
            },
        },
    };
    const series = [
        {
            name: "Sales",
            data: [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112],
        },
    ];
    const [isOpen, setIsOpen] = useState(false);
    function toggleDropdown() {
        setIsOpen(!isOpen);
    }
    function closeDropdown() {
        setIsOpen(false);
    }
    return (_jsxs("div", { className: "overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800 dark:text-white/90", children: "Monthly Sales" }), _jsxs("div", { className: "relative inline-block", children: [_jsx("button", { className: "dropdown-toggle", onClick: toggleDropdown, children: _jsx(MoreDotIcon, { className: "text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 size-6" }) }), _jsxs(Dropdown, { isOpen: isOpen, onClose: closeDropdown, className: "w-40 p-2", children: [_jsx(DropdownItem, { onItemClick: closeDropdown, className: "flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300", children: "View More" }), _jsx(DropdownItem, { onItemClick: closeDropdown, className: "flex w-full font-normal text-left text-gray-500 rounded-lg hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-gray-300", children: "Delete" })] })] })] }), _jsx("div", { className: "max-w-full overflow-x-auto custom-scrollbar", children: _jsx("div", { className: "-ml-5 min-w-[650px] xl:min-w-full pl-2", children: _jsx(Chart, { options: options, series: series, type: "bar", height: 180 }) }) })] }));
}
