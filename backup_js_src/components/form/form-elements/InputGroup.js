"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InputGroup;
var jsx_runtime_1 = require("react/jsx-runtime");
var ComponentCard_1 = require("../../common/ComponentCard");
var Label_1 = require("../Label");
var InputField_1 = require("../input/InputField");
var icons_1 = require("../../../icons");
var PhoneInput_1 = require("../group-input/PhoneInput");
function InputGroup() {
    var countries = [
        { code: "US", label: "+1" },
        { code: "GB", label: "+44" },
        { code: "CA", label: "+1" },
        { code: "AU", label: "+61" },
    ];
    var handlePhoneNumberChange = function (phoneNumber) {
        console.log("Updated phone number:", phoneNumber);
    };
    return ((0, jsx_runtime_1.jsx)(ComponentCard_1.default, { title: "Input Group", children: (0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Email" }), (0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)(InputField_1.default, { placeholder: "info@gmail.com", type: "text", className: "pl-[62px]" }), (0, jsx_runtime_1.jsx)("span", { className: "absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400", children: (0, jsx_runtime_1.jsx)(icons_1.EnvelopeIcon, { className: "size-6" }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Phone" }), (0, jsx_runtime_1.jsx)(PhoneInput_1.default, { selectPosition: "start", countries: countries, placeholder: "+1 (555) 000-0000", onChange: handlePhoneNumberChange })] }), " ", (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)(Label_1.default, { children: "Phone" }), (0, jsx_runtime_1.jsx)(PhoneInput_1.default, { selectPosition: "end", countries: countries, placeholder: "+1 (555) 000-0000", onChange: handlePhoneNumberChange })] })] }) }));
}
