"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TextAreaInput;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var ComponentCard_1 = require("../../common/ComponentCard");
var TextArea_1 = require("../input/TextArea");
var Label_1 = require("../Label");
function TextAreaInput() {
    var _a = (0, react_1.useState)(""), message = _a[0], setMessage = _a[1];
    var _b = (0, react_1.useState)(""), messageTwo = _b[0], setMessageTwo = _b[1];
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Textarea input field", children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Description" }), (0, jsx_runtime_1.jsx)(TextArea_1.default, { value: message, onChange: function (value) { return setMessage(value); }, rows: 6 })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Description" }), (0, jsx_runtime_1.jsx)(TextArea_1.default, { rows: 6, disabled: true })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Description" }), (0, jsx_runtime_1.jsx)(TextArea_1.default, { rows: 6, value: messageTwo, error: true, onChange: function (value) { return setMessageTwo(value); }, hint: "Please enter a valid message." })] })] }) }));
}
