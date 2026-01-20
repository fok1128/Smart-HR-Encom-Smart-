import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const Button = ({ children, size = "md", variant = "primary", startIcon, endIcon, onClick, className = "", disabled = false, type = "button", // ⬅️ set default type
 }) => {
    const sizeClasses = {
        sm: "px-4 py-3 text-sm",
        md: "px-5 py-3.5 text-sm",
    };
    const variantClasses = {
        primary: "bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300",
        outline: "bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300",
    };
    return (_jsxs("button", { type: type, className: `inline-flex items-center justify-center gap-2 rounded-lg transition ${className} ${sizeClasses[size]} ${variantClasses[variant]} ${disabled ? "cursor-not-allowed opacity-50" : ""}`, onClick: onClick, disabled: disabled, children: [startIcon && _jsx("span", { className: "flex items-center", children: startIcon }), children, endIcon && _jsx("span", { className: "flex items-center", children: endIcon })] }));
};
export default Button;
