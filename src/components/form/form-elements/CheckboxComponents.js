import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import Checkbox from "../input/Checkbox";
export default function CheckboxComponents() {
    const [isChecked, setIsChecked] = useState(false);
    const [isCheckedTwo, setIsCheckedTwo] = useState(true);
    const [isCheckedDisabled, setIsCheckedDisabled] = useState(false);
    return (_jsx(ComponentCard, { title: "Checkbox", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Checkbox, { checked: isChecked, onChange: setIsChecked }), _jsx("span", { className: "block text-sm font-medium text-gray-700 dark:text-gray-400", children: "Default" })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Checkbox, { checked: isCheckedTwo, onChange: setIsCheckedTwo, label: "Checked" }) }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Checkbox, { checked: isCheckedDisabled, onChange: setIsCheckedDisabled, disabled: true, label: "Disabled" }) })] }) }));
}
