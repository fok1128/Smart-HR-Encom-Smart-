"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = CheckboxComponents;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var ComponentCard_1 = require("../../common/ComponentCard");
var Checkbox_1 = require("../input/Checkbox");
function CheckboxComponents() {
    var _a = (0, react_1.useState)(false), isChecked = _a[0], setIsChecked = _a[1];
    var _b = (0, react_1.useState)(true), isCheckedTwo = _b[0], setIsCheckedTwo = _b[1];
    var _c = (0, react_1.useState)(false), isCheckedDisabled = _c[0], setIsCheckedDisabled = _c[1];
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Checkbox", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-4", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center gap-3", children: [(0, jsx_runtime_1.jsx)(Checkbox_1.default, { checked: isChecked, onChange: setIsChecked }), (0, jsx_runtime_1.jsx)("span", { className: "block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Default" })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-3", children: (0, jsx_runtime_1.jsx)(Checkbox_1.default, { checked: isCheckedTwo, onChange: setIsCheckedTwo, label: "Checked" }) }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center gap-3", children: (0, jsx_runtime_1.jsx)(Checkbox_1.default, { checked: isCheckedDisabled, onChange: setIsCheckedDisabled, disabled: true, label: "Disabled" }) })] }) }));
}
