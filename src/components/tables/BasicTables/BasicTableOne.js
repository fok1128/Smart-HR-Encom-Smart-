import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Table, TableBody, TableCell, TableHeader, TableRow, } from "../../ui/table";
import Badge from "../../ui/badge/Badge";
// Define the table data using the interface
const tableData = [
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
export default function BasicTableOne() {
    return (_jsx("div", { className: "overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]", children: _jsx("div", { className: "max-w-full overflow-x-auto", children: _jsxs(Table, { children: [_jsx(TableHeader, { className: "border-b border-gray-100 dark:border-white/[0.05]", children: _jsxs(TableRow, { children: [_jsx(TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "User" }), _jsx(TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Project Name" }), _jsx(TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Team" }), _jsx(TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Status" }), _jsx(TableCell, { isHeader: true, className: "px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400", children: "Budget" })] }) }), _jsx(TableBody, { className: "divide-y divide-gray-100 dark:divide-white/[0.05]", children: tableData.map((order) => (_jsxs(TableRow, { children: [_jsx(TableCell, { className: "px-5 py-4 sm:px-6 text-start", children: _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "w-10 h-10 overflow-hidden rounded-full", children: _jsx("img", { width: 40, height: 40, src: order.user.image, alt: order.user.name }) }), _jsxs("div", { children: [_jsx("span", { className: "block font-medium text-gray-800 text-theme-sm dark:text-white/90", children: order.user.name }), _jsx("span", { className: "block text-gray-500 text-theme-xs dark:text-gray-400", children: order.user.role })] })] }) }), _jsx(TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: order.projectName }), _jsx(TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: _jsx("div", { className: "flex -space-x-2", children: order.team.images.map((teamImage, index) => (_jsx("div", { className: "w-6 h-6 overflow-hidden border-2 border-white rounded-full dark:border-gray-900", children: _jsx("img", { width: 24, height: 24, src: teamImage, alt: `Team member ${index + 1}`, className: "w-full size-6" }) }, index))) }) }), _jsx(TableCell, { className: "px-4 py-3 text-gray-500 text-start text-theme-sm dark:text-gray-400", children: _jsx(Badge, { size: "sm", color: order.status === "Active"
                                            ? "success"
                                            : order.status === "Pending"
                                                ? "warning"
                                                : "error", children: order.status }) }), _jsx(TableCell, { className: "px-4 py-3 text-gray-500 text-theme-sm dark:text-gray-400", children: order.budget })] }, order.id))) })] }) }) }));
}
