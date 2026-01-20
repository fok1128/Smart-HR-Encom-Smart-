import { jsx as _jsx } from "react/jsx-runtime";
// Table Component
const Table = ({ children, className }) => {
    return _jsx("table", { className: `min-w-full  ${className}`, children: children });
};
// TableHeader Component
const TableHeader = ({ children, className }) => {
    return _jsx("thead", { className: className, children: children });
};
// TableBody Component
const TableBody = ({ children, className }) => {
    return _jsx("tbody", { className: className, children: children });
};
// TableRow Component
const TableRow = ({ children, className }) => {
    return _jsx("tr", { className: className, children: children });
};
// TableCell Component
const TableCell = ({ children, isHeader = false, className, }) => {
    const CellTag = isHeader ? "th" : "td";
    return _jsx(CellTag, { className: ` ${className}`, children: children });
};
export { Table, TableHeader, TableBody, TableRow, TableCell };
