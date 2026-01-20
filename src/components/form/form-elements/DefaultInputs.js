import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import Select from "../Select";
import { EyeCloseIcon, EyeIcon, TimeIcon } from "../../../icons";
import DatePicker from "../date-picker";
export default function DefaultInputs() {
    const [showPassword, setShowPassword] = useState(false);
    const options = [
        { value: "marketing", label: "Marketing" },
        { value: "template", label: "Template" },
        { value: "development", label: "Development" },
    ];
    const handleSelectChange = (value) => {
        console.log("Selected value:", value);
    };
    return (_jsx(ComponentCard, { title: "Default Inputs", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { htmlFor: "input", children: "Input" }), _jsx(Input, { type: "text", id: "input" })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "inputTwo", children: "Input with Placeholder" }), _jsx(Input, { type: "text", id: "inputTwo", placeholder: "info@gmail.com" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Select Input" }), _jsx(Select, { options: options, placeholder: "Select an option", onChange: handleSelectChange, className: "dark:bg-dark-900" })] }), _jsxs("div", { children: [_jsx(Label, { children: "Password Input" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { type: showPassword ? "text" : "password", placeholder: "Enter your password" }), _jsx("button", { onClick: () => setShowPassword(!showPassword), className: "absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2", children: showPassword ? (_jsx(EyeIcon, { className: "fill-gray-500 dark:fill-gray-400 size-5" })) : (_jsx(EyeCloseIcon, { className: "fill-gray-500 dark:fill-gray-400 size-5" })) })] })] }), _jsx("div", { children: _jsx(DatePicker, { id: "date-picker", label: "Date Picker Input", placeholder: "Select a date", onChange: (dates, currentDateString) => {
                            // Handle your logic
                            console.log({ dates, currentDateString });
                        } }) }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "tm", children: "Time Picker Input" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { type: "time", id: "tm", name: "tm", onChange: (e) => console.log(e.target.value) }), _jsx("span", { className: "absolute text-gray-500 -translate-y-1/2 pointer-events-none right-3 top-1/2 dark:text-gray-400", children: _jsx(TimeIcon, { className: "size-6" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { htmlFor: "tm", children: "Input with Payment" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { type: "text", placeholder: "Card number", className: "pl-[62px]" }), _jsx("span", { className: "absolute left-0 top-1/2 flex h-11 w-[46px] -translate-y-1/2 items-center justify-center border-r border-gray-200 dark:border-gray-800", children: _jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: [_jsx("circle", { cx: "6.25", cy: "10", r: "5.625", fill: "#E80B26" }), _jsx("circle", { cx: "13.75", cy: "10", r: "5.625", fill: "#F59D31" }), _jsx("path", { d: "M10 14.1924C11.1508 13.1625 11.875 11.6657 11.875 9.99979C11.875 8.33383 11.1508 6.8371 10 5.80713C8.84918 6.8371 8.125 8.33383 8.125 9.99979C8.125 11.6657 8.84918 13.1625 10 14.1924Z", fill: "#FC6020" })] }) })] })] })] }) }));
}
