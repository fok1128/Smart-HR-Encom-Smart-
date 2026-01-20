"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = FormElements;
var jsx_runtime_1 = require("react/jsx-runtime");
var PageBreadCrumb_1 = require("../../components/common/PageBreadCrumb");
var DefaultInputs_1 = require("../../components/form/form-elements/DefaultInputs");
var InputGroup_1 = require("../../components/form/form-elements/InputGroup");
var DropZone_1 = require("../../components/form/form-elements/DropZone");
var CheckboxComponents_1 = require("../../components/form/form-elements/CheckboxComponents");
var RadioButtons_1 = require("../../components/form/form-elements/RadioButtons");
var ToggleSwitch_1 = require("../../components/form/form-elements/ToggleSwitch");
var FileInputExample_1 = require("../../components/form/form-elements/FileInputExample");
var SelectInputs_1 = require("../../components/form/form-elements/SelectInputs");
var TextAreaInput_1 = require("../../components/form/form-elements/TextAreaInput");
var InputStates_1 = require("../../components/form/form-elements/InputStates");
var PageMeta_1 = require("../../components/common/PageMeta");
function FormElements() {
    return ((0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(PageMeta_1.default, { title: "React.js Form Elements Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Form Elements  Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), (0, jsx_runtime_1.jsx)(PageBreadCrumb_1.default, { pageTitle: "Form Elements" }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)(DefaultInputs_1.default, {}), (0, jsx_runtime_1.jsx)(SelectInputs_1.default, {}), (0, jsx_runtime_1.jsx)(TextAreaInput_1.default, {}), (0, jsx_runtime_1.jsx)(InputStates_1.default, {})] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsx)(InputGroup_1.default, {}), (0, jsx_runtime_1.jsx)(FileInputExample_1.default, {}), (0, jsx_runtime_1.jsx)(CheckboxComponents_1.default, {}), (0, jsx_runtime_1.jsx)(RadioButtons_1.default, {}), (0, jsx_runtime_1.jsx)(ToggleSwitch_1.default, {}), (0, jsx_runtime_1.jsx)(DropZone_1.default, {})] })] })] }));
}
