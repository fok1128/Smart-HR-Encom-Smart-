"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BasicTableOne;
var jsx_runtime_1 = require("react/jsx-runtime");
var table_1 = require("../../ui/table");
var Badge_1 = require("../../ui/badge/Badge");
// Define the table data using the interface
var tableData = [
    {
        id: 1,
        user: {
            image: "/images/user/user-17.jpg",
            name: "Lindsey Curtis",
            role: "Web Designer",
        },
        projectName: "Agency Website",
        team: {
            images: [
                "/images/user/user-22.jpg",
                "/images/user/user-23.jpg",
                "/images/user/user-24.jpg",
            ],
        },
        budget: "3.9K",
        status: "Active",
    },
    {
        id: 2,
        user: {
            image: "/images/user/user-18.jpg",
            name: "Kaiya George",
            role: "Project Manager",
        },
        projectName: "Technology",
        team: {
            images: ["/images/user/user-25.jpg", "/images/user/user-26.jpg"],
        },
        budget: "24.9K",
        status: "Pending",
    },
    {
        id: 3,
        user: {
            image: "/images/user/user-17.jpg",
            name: "Zain Geidt",
            role: "Content Writing",
        },
        projectName: "Blog Writing",
        team: {
            images: ["/images/user/user-27.jpg"],
        },
        budget: "12.7K",
        status: "Active",
    },
    {
        id: 4,
        user: {
            image: "/images/user/user-20.jpg",
            name: "Abram Schleifer",
            role: "Digital Marketer",
        },
        projectName: "Social Media",
        team: {
            images: [
                "/images/user/user-28.jpg",
                "/images/user/user-29.jpg",
                "/images/user/user-30.jpg",
            ],
        },
        budget: "2.8K",
        status: "Cancel",
    },
    {
        id: 5,
        user: {
            image: "/images/user/user-21.jpg",
            name: "Carla George",
            role: "Front-end Developer",
        },
        projectName: "Website",
        team: {
            images: [
                "/images/user/user-31.jpg",
                "/images/user/user-32.jpg",
                "/images/user/user-33.jpg",
            ],
        },
        budget: "4.5K",
        status: "Active",
    },
];
function BasicTableOne() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]", children: (0, jsx_runtime_1.jsx)("div", { className: "max-w-full overflow-x-auto", children: (0, jsx_runtime_1.jsxs)(table_1.Table, { children: [(0, jsx_runtime_1.jsx)(table_1.TableHeader, { className: "border-b border-gray-100 dark:border-white/[0.05]", children: (0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "User" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Project Name" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Team" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Status" }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Budget" })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableBody, { className: "divide-y divide-gray-100 dark:divide-white/[0.05]", children: tableData.map(function (order) { return ((0, jsx_runtime_1.jsxs)(table_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "px-5 py-4 sm:px-6 text-start", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)("div", { className: "w-10 h-10 overflow-hidden rounded-full", children: (0, jsx_runtime_1.jsx)("img", { width: 40, height: 40, src: order.user.image, alt: order.user.name }) }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("span", { className: "block font-medium text-gray-800 text-theme-sm dark:text-white/90", children: order.user.name }), (0, jsx_runtime_1.jsx)("span", { className: "block text-gray-500 text-theme-xs dark:text-gray-400", children: order.user.role })] })] }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: order.projectName }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: (0, jsx_runtime_1.jsx)("div", { className: "flex -space-x-2", children: order.team.images.map(function (teamImage, index) { return ((0, jsx_runtime_1.jsx)("div", { className: "w-6 h-6 overflow-hidden border-2 border-white rounded-full dark:border-gray-900", children: (0, jsx_runtime_1.jsx)("img", { width: 24, height: 24, src: teamImage, alt: "Team member ".concat(index + 1), className: "w-full size-6" }) }, index)); }) }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: (0, jsx_runtime_1.jsx)(Badge_1.default, { size: "sm", color: order.status === "Active"
                                            ? "success"
                                            : order.status === "Pending"
                                                ? "warning"
                                                : "error", children: order.status }) }), (0, jsx_runtime_1.jsx)(table_1.TableCell, { className: "px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400", children: order.budget })] }, order.id)); }) })] }) }) }));
}
