"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var Form = function (_a) {
    var onSubmit = _a.onSubmit, children = _a.children, className = _a.className;
    return ((0, jsx_runtime_1.jsx)("form", { onSubmit: function (event) {
            event.preventDefault(); // Prevent default form submission
            onSubmit(event);
        }, className: " ".concat(className), children: children }));
};
exports.default = Form;
