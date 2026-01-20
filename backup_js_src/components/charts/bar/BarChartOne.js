"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BarChartOne;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_apexcharts_1 = require("react-apexcharts");
function BarChartOne() {
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
    return ((0, jsx_runtime_1.jsx)("div", { className: "max-w-full overflow-x-auto custom-scrollbar", children: (0, jsx_runtime_1.jsx)("div", { id: "chartOne", className: "min-w-[1000px]", children: (0, jsx_runtime_1.jsx)(react_apexcharts_1.default, { options: options, series: series, type: "bar", height: 180 }) }) }));
}
