"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SelectInputs;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var ComponentCard_1 = require("../../common/ComponentCard");
var Label_1 = require("../Label");
var Select_1 = require("../Select");
var MultiSelect_1 = require("../MultiSelect");
function SelectInputs() {
    var options = [
        { value: "marketing", label: "Marketing" },
        { value: "template", label: "Template" },
        { value: "development", label: "Development" },
    ];
    var handleSelectChange = function (value) {
        console.log("Selected value:", value);
    };
    var _a = (0, react_1.useState)([]), selectedValues = _a[0], setSelectedValues = _a[1];
    var multiOptions = [
        { value: "1", text: "Option 1", selected: false },
        { value: "2", text: "Option 2", selected: false },
        { value: "3", text: "Option 3", selected: false },
        { value: "4", text: "Option 4", selected: false },
        { value: "5", text: "Option 5", selected: false },
    ];
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Select Inputs", children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Select Input" }), (0, jsx_runtime_1.jsx)(Select_1.default, { options: options, placeholder: "Select Option", onChange: handleSelectChange, className: "dark:bg-dark-900" })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(MultiSelect_1.default, { label: "Multiple Select Options", options: multiOptions, defaultSelected: ["1", "3"], onChange: function (values) { return setSelectedValues(values); } }), (0, jsx_runtime_1.jsxs)("p", { className: "sr-only", children: ["Selected Values: ", selectedValues.join(", ")] })] })] }) }));
}
