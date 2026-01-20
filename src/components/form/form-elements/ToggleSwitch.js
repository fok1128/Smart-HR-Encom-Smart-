import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ComponentCard from "../../common/ComponentCard";
import Switch from "../switch/Switch";
export default function ToggleSwitch() {
    const handleSwitchChange = (checked) => {
        console.log("Switch is now:", checked ? "ON" : "OFF");
    };
    return (_jsxs(ComponentCard, { title: "Toggle switch input", children: [_jsxs("div", { className: "flex gap-4", children: [_jsx(Switch, { label: "Default", defaultChecked: true, onChange: handleSwitchChange }), _jsx(Switch, { label: "Checked", defaultChecked: true, onChange: handleSwitchChange }), _jsx(Switch, { label: "Disabled", disabled: true })] }), " ", _jsxs("div", { className: "flex gap-4", children: [_jsx(Switch, { label: "Default", defaultChecked: true, onChange: handleSwitchChange, color: "gray" }), _jsx(Switch, { label: "Checked", defaultChecked: true, onChange: handleSwitchChange, color: "gray" }), _jsx(Switch, { label: "Disabled", disabled: true, color: "gray" })] })] }));
}
