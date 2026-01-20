"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = RadioButtons;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var ComponentCard_1 = require("../../common/ComponentCard");
var Radio_1 = require("../input/Radio");
function RadioButtons() {
    var _a = (0, react_1.useState)("option2"), selectedValue = _a[0], setSelectedValue = _a[1];
    var handleRadioChange = function (value) {
        setSelectedValue(value);
    };
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Radio Buttons", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap items-center gap-8", children: [(0, jsx_runtime_1.jsx)(Radio_1.default, { id: "radio1", name: "group1", value: "option1", checked: selectedValue === "option1", onChange: handleRadioChange, label: "Default" }), (0, jsx_runtime_1.jsx)(Radio_1.default, { id: "radio2", name: "group1", value: "option2", checked: selectedValue === "option2", onChange: handleRadioChange, label: "Selected" }), (0, jsx_runtime_1.jsx)(Radio_1.default, { id: "radio3", name: "group1", value: "option3", checked: selectedValue === "option3", onChange: handleRadioChange, label: "Disabled", disabled: true })] }) }));
}
