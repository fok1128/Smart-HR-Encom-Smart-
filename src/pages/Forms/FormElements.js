import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import DefaultInputs from "../../components/form/form-elements/DefaultInputs";
import InputGroup from "../../components/form/form-elements/InputGroup";
import DropzoneComponent from "../../components/form/form-elements/DropZone";
import CheckboxComponents from "../../components/form/form-elements/CheckboxComponents";
import RadioButtons from "../../components/form/form-elements/RadioButtons";
import ToggleSwitch from "../../components/form/form-elements/ToggleSwitch";
import FileInputExample from "../../components/form/form-elements/FileInputExample";
import SelectInputs from "../../components/form/form-elements/SelectInputs";
import TextAreaInput from "../../components/form/form-elements/TextAreaInput";
import InputStates from "../../components/form/form-elements/InputStates";
import PageMeta from "../../components/common/PageMeta";
export default function FormElements() {
    return (_jsxs("div", { children: [_jsx(PageMeta, { title: "React.js Form Elements Dashboard | TailAdmin - React.js Admin Dashboard Template", description: "This is React.js Form Elements  Dashboard page for TailAdmin - React.js Tailwind CSS Admin Dashboard Template" }), _jsx(PageBreadcrumb, { pageTitle: "Form Elements" }), _jsxs("div", { className: "grid grid-cols-1 gap-6 xl:grid-cols-2", children: [_jsxs("div", { className: "space-y-6", children: [_jsx(DefaultInputs, {}), _jsx(SelectInputs, {}), _jsx(TextAreaInput, {}), _jsx(InputStates, {})] }), _jsxs("div", { className: "space-y-6", children: [_jsx(InputGroup, {}), _jsx(FileInputExample, {}), _jsx(CheckboxComponents, {}), _jsx(RadioButtons, {}), _jsx(ToggleSwitch, {}), _jsx(DropzoneComponent, {})] })] })] }));
}
