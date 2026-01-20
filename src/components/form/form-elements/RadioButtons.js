import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Radio from "../input/Radio";
export default function RadioButtons() {
    const [selectedValue, setSelectedValue] = useState("option2");
    const handleRadioChange = (value) => {
        setSelectedValue(value);
    };
    return (_jsx(ComponentCard, { title: "Radio Buttons", children: _jsxs("div", { className: "flex flex-wrap items-center gap-8", children: [_jsx(Radio, { id: "radio1", name: "group1", value: "option1", checked: selectedValue === "option1", onChange: handleRadioChange, label: "Default" }), _jsx(Radio, { id: "radio2", name: "group1", value: "option2", checked: selectedValue === "option2", onChange: handleRadioChange, label: "Selected" }), _jsx(Radio, { id: "radio3", name: "group1", value: "option3", checked: selectedValue === "option3", onChange: handleRadioChange, label: "Disabled", disabled: true })] }) }));
}
