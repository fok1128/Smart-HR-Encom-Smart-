import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Select from "../Select";
import MultiSelect from "../MultiSelect";
export default function SelectInputs() {
    const options = [
        { value: "marketing", label: "Marketing" },
        { value: "template", label: "Template" },
        { value: "development", label: "Development" },
    ];
    const handleSelectChange = (value) => {
        console.log("Selected value:", value);
    };
    const [selectedValues, setSelectedValues] = useState([]);
    const multiOptions = [
        { value: "1", text: "Option 1", selected: false },
        { value: "2", text: "Option 2", selected: false },
        { value: "3", text: "Option 3", selected: false },
        { value: "4", text: "Option 4", selected: false },
        { value: "5", text: "Option 5", selected: false },
    ];
    return (_jsx(ComponentCard, { title: "Select Inputs", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { children: "Select Input" }), _jsx(Select, { options: options, placeholder: "Select Option", onChange: handleSelectChange, className: "dark:bg-dark-900" })] }), _jsxs("div", { children: [_jsx(MultiSelect, { label: "Multiple Select Options", options: multiOptions, defaultSelected: ["1", "3"], onChange: (values) => setSelectedValues(values) }), _jsxs("p", { className: "sr-only", children: ["Selected Values: ", selectedValues.join(", ")] })] })] }) }));
}
