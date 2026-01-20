"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ToggleSwitch;
var jsx_runtime_1 = require("react/jsx-runtime");
var ComponentCard_1 = require("../../common/ComponentCard");
var Switch_1 = require("../switch/Switch");
function ToggleSwitch() {
    var handleSwitchChange = function (checked) {
        console.log("Switch is now:", checked ? "ON" : "OFF");
    };
    return ((0, jsx_runtime_1.jsxs)(ComponentCard_1.default, { title: "Toggle switch input", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex gap-4", children: [(0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Default", defaultChecked: true, onChange: handleSwitchChange }), (0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Checked", defaultChecked: true, onChange: handleSwitchChange }), (0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Disabled", disabled: true })] }), " ", (0, jsx_runtime_1.jsxs)("div", { className: "flex gap-4", children: [(0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Default", defaultChecked: true, onChange: handleSwitchChange, color: "gray" }), (0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Checked", defaultChecked: true, onChange: handleSwitchChange, color: "gray" }), (0, jsx_runtime_1.jsx)(Switch_1.default, { label: "Disabled", disabled: true, color: "gray" })] })] }));
}
