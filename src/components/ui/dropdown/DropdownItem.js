import { jsx as _jsx } from "react/jsx-runtime";
import { Link } from "react-router-dom";
export const DropdownItem = ({ tag = "button", to, onClick, onItemClick, baseClassName = "block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-gray-900", className = "", children, }) => {
    const combinedClasses = `${baseClassName} ${className}`.trim();
    const handleClick = (event) => {
        if (tag === "button") {
            event.preventDefault();
        }
        if (onClick)
            onClick();
        if (onItemClick)
            onItemClick();
    };
    if (tag === "a" && to) {
        return (_jsx(Link, { to: to, className: combinedClasses, onClick: handleClick, children: children }));
    }
    return (_jsx("button", { onClick: handleClick, className: combinedClasses, children: children }));
};
