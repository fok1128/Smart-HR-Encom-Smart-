"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FileInputExample;
var jsx_runtime_1 = require("react/jsx-runtime");
var ComponentCard_1 = require("../../common/ComponentCard");
var FileInput_1 = require("../input/FileInput");
var Label_1 = require("../Label");
function FileInputExample() {
    var handleFileChange = function (event) {
        var _a;
        var file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (file) {
            console.log("Selected file:", file.name);
        }
    };
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "File Input", children: (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Upload file" }), (0, jsx_runtime_1.jsx)(FileInput_1.default, { onChange: handleFileChange, className: "custom-class" })] }) }));
}
