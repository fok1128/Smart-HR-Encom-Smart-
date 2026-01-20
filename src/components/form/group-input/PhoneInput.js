import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
const PhoneInput = ({ countries, placeholder = "+1 (555) 000-0000", onChange, selectPosition = "start", // Default position is 'start'
 }) => {
    const [selectedCountry, setSelectedCountry] = useState("US");
    const [phoneNumber, setPhoneNumber] = useState("+1");
    const countryCodes = countries.reduce((acc, { code, label }) => ({ ...acc, [code]: label }), {});
    const handleCountryChange = (e) => {
        const newCountry = e.target.value;
        setSelectedCountry(newCountry);
        setPhoneNumber(countryCodes[newCountry]);
        if (onChange) {
            onChange(countryCodes[newCountry]);
        }
    };
    const handlePhoneNumberChange = (e) => {
        const newPhoneNumber = e.target.value;
        setPhoneNumber(newPhoneNumber);
        if (onChange) {
            onChange(newPhoneNumber);
        }
    };
    return (_jsxs("div", { className: "relative flex", children: [selectPosition === "start" && (_jsxs("div", { className: "absolute", children: [_jsx("select", { value: selectedCountry, onChange: handleCountryChange, className: "appearance-none bg-none rounded-l-lg border-0 border-r border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400", children: countries.map((country) => (_jsx("option", { value: country.code, className: "text-gray-700 dark:bg-gray-900 dark:text-gray-400", children: country.code }, country.code))) }), _jsx("div", { className: "absolute inset-y-0 flex items-center text-gray-700 pointer-events-none bg-none right-3 dark:text-gray-400", children: _jsx("svg", { className: "stroke-current", width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M4.79175 7.396L10.0001 12.6043L15.2084 7.396", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] })), _jsx("input", { type: "tel", value: phoneNumber, onChange: handlePhoneNumberChange, placeholder: placeholder, className: `dark:bg-dark-900 h-11 w-full ${selectPosition === "start" ? "pl-[84px]" : "pr-[84px]"} rounded-lg border border-gray-300 bg-transparent py-3 px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800` }), selectPosition === "end" && (_jsxs("div", { className: "absolute right-0", children: [_jsx("select", { value: selectedCountry, onChange: handleCountryChange, className: "appearance-none bg-none rounded-r-lg border-0 border-l border-gray-200 bg-transparent py-3 pl-3.5 pr-8 leading-tight text-gray-700 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:text-gray-400", children: countries.map((country) => (_jsx("option", { value: country.code, className: "text-gray-700 dark:bg-gray-900 dark:text-gray-400", children: country.code }, country.code))) }), _jsx("div", { className: "absolute inset-y-0 flex items-center text-gray-700 pointer-events-none right-3 dark:text-gray-400", children: _jsx("svg", { className: "stroke-current", width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: _jsx("path", { d: "M4.79175 7.396L10.0001 12.6043L15.2084 7.396", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) }) })] }))] }));
};
export default PhoneInput;
