import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Radio = ({ id, name, value, checked, label, onChange, className = "", disabled = false, }) => {
    return (_jsxs("label", { htmlFor: id, className: `relative flex cursor-pointer  select-none items-center gap-3 text-sm font-medium ${disabled
            ? "text-gray-300 dark:text-gray-600 cursor-not-allowed"
            : "text-gray-700 dark:text-gray-400"} ${className}`, children: [_jsx("input", { id: id, name: name, type: "radio", value: value, checked: checked, onChange: () => !disabled && onChange(value), className: "sr-only", disabled: disabled }), _jsx("span", { className: `flex h-5 w-5 items-center justify-center rounded-full border-[1.25px] ${checked
                    ? "border-brand-500 bg-brand-500"
                    : "bg-transparent border-gray-300 dark:border-gray-700"} ${disabled
                    ? "bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-700"
                    : ""}`, children: _jsx("span", { className: `h-2 w-2 rounded-full bg-white ${checked ? "block" : "hidden"}` }) }), label] }));
};
export default Radio;
