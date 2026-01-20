import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const ChartTab = () => {
    const [selected, setSelected] = useState("optionOne");
    const getButtonClass = (option) => selected === option
        ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
        : "text-gray-500 dark:text-gray-400";
    return (_jsxs("div", { className: "flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900", children: [_jsx("button", { onClick: () => setSelected("optionOne"), className: `px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass("optionOne")}`, children: "Monthly" }), _jsx("button", { onClick: () => setSelected("optionTwo"), className: `px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass("optionTwo")}`, children: "Quarterly" }), _jsx("button", { onClick: () => setSelected("optionThree"), className: `px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900   dark:hover:text-white ${getButtonClass("optionThree")}`, children: "Annually" })] }));
};
export default ChartTab;
