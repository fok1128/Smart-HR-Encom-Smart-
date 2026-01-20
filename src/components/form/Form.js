import { jsx as _jsx } from "react/jsx-runtime";
const Form = ({ onSubmit, children, className }) => {
    return (_jsx("form", { onSubmit: (event) => {
            event.preventDefault(); // Prevent default form submission
            onSubmit(event);
        }, className: ` ${className}`, children: children }));
};
export default Form;
