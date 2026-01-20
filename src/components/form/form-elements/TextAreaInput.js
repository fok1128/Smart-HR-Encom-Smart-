import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import ComponentCard from "../../common/ComponentCard";
import TextArea from "../input/TextArea";
import Label from "../Label";
export default function TextAreaInput() {
    const [message, setMessage] = useState("");
    const [messageTwo, setMessageTwo] = useState("");
    return (_jsx(ComponentCard, { title: "Textarea input field", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { children: "Description" }), _jsx(TextArea, { value: message, onChange: (value) => setMessage(value), rows: 6 })] }), _jsxs("div", { children: [_jsx(Label, { children: "Description" }), _jsx(TextArea, { rows: 6, disabled: true })] }), _jsxs("div", { children: [_jsx(Label, { children: "Description" }), _jsx(TextArea, { rows: 6, value: messageTwo, error: true, onChange: (value) => setMessageTwo(value), hint: "Please enter a valid message." })] })] }) }));
}
