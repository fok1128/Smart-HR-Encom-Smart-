import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import ComponentCard from "../../common/ComponentCard";
import Label from "../Label";
import Input from "../input/InputField";
import { EnvelopeIcon } from "../../../icons";
import PhoneInput from "../group-input/PhoneInput";
export default function InputGroup() {
    const countries = [
        { code: "US", label: "+1" },
        { code: "GB", label: "+44" },
        { code: "CA", label: "+1" },
        { code: "AU", label: "+61" },
    ];
    const handlePhoneNumberChange = (phoneNumber) => {
        console.log("Updated phone number:", phoneNumber);
    };
    return (_jsx(ComponentCard, { title: "Input Group", children: _jsxs("div", { className: "space-y-6", children: [_jsxs("div", { children: [_jsx(Label, { children: "Email" }), _jsxs("div", { className: "relative", children: [_jsx(Input, { placeholder: "info@gmail.com", type: "text", className: "pl-[62px]" }), _jsx("span", { className: "absolute left-0 top-1/2 -translate-y-1/2 border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400", children: _jsx(EnvelopeIcon, { className: "size-6" }) })] })] }), _jsxs("div", { children: [_jsx(Label, { children: "Phone" }), _jsx(PhoneInput, { selectPosition: "start", countries: countries, placeholder: "+1 (555) 000-0000", onChange: handlePhoneNumberChange })] }), " ", _jsxs("div", { children: [_jsx(Label, { children: "Phone" }), _jsx(PhoneInput, { selectPosition: "end", countries: countries, placeholder: "+1 (555) 000-0000", onChange: handlePhoneNumberChange })] })] }) }));
}
