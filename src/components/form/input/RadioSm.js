import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const RadioSm = ({ id, name, value, checked, label, onChange, className = "", }) => {
    return (_jsxs("label", { htmlFor: id, className: `flex cursor-pointer select-none items-center text-sm text-gray-500 dark:text-gray-400 ${className}`, children: [_jsxs("span", { className: "relative", children: [_jsx("input", { type: "radio", id: id, name: name, value: value, checked: checked, onChange: () => onChange(value), className: "sr-only" }), _jsx("span", { className: `mr-2 flex h-4 w-4 items-center justify-center rounded-full border ${checked
                            ? "border-brand-500 bg-brand-500"
                            : "bg-transparent border-gray-300 dark:border-gray-700"}`, children: _jsx("span", { className: `h-1.5 w-1.5 rounded-full ${checked ? "bg-white" : "bg-white dark:bg-[#1e2636]"}` }) })] }), label] }));
};
export default RadioSm;
