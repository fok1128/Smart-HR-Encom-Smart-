import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ComponentCard from "../../common/ComponentCard";
import FileInput from "../input/FileInput";
import Label from "../Label";
export default function FileInputExample() {
    const handleFileChange = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            console.log("Selected file:", file.name);
        }
    };
    return (_jsx(ComponentCard, { title: "File Input", children: _jsxs("div", { children: [_jsx(Label, { children: "Upload file" }), _jsx(FileInput, { onChange: handleFileChange, className: "custom-class" })] }) }));
}
