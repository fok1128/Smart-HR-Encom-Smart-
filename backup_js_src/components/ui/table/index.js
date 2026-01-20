"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TableCell = exports.TableRow = exports.TableBody = exports.TableHeader = exports.Table = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
// Table Component
var Table = function (_a) {
    var children = _a.children, className = _a.className;
    return (0, jsx_runtime_1.jsx)("table", { className: "min-w-full  ".concat(className), children: children });
};
exports.Table = Table;
// TableHeader Component
var TableHeader = function (_a) {
    var children = _a.children, className = _a.className;
    return (0, jsx_runtime_1.jsx)("thead", { className: className, children: children });
};
exports.TableHeader = TableHeader;
// TableBody Component
var TableBody = function (_a) {
    var children = _a.children, className = _a.className;
    return (0, jsx_runtime_1.jsx)("tbody", { className: className, children: children });
};
exports.TableBody = TableBody;
// TableRow Component
var TableRow = function (_a) {
    var children = _a.children, className = _a.className;
    return (0, jsx_runtime_1.jsx)("tr", { className: className, children: children });
};
exports.TableRow = TableRow;
// TableCell Component
var TableCell = function (_a) {
    var children = _a.children, _b = _a.isHeader, isHeader = _b === void 0 ? false : _b, className = _a.className;
    var CellTag = isHeader ? "th" : "td";
    return (0, jsx_runtime_1.jsx)(CellTag, { className: " ".concat(className), children: children });
};
exports.TableCell = TableCell;
