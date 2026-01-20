"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var react_router_dom_1 = require("react-router-dom");
var useGoBack = function () {
    var navigate = (0, react_router_dom_1.useNavigate)();
    var goBack = function () {
        if (window.history.state && window.history.state.idx > 0) {
            navigate(-1); // Go back to the previous page
        }
        else {
            navigate("/"); // Redirect to home if no history exists
        }
    };
    return goBack;
};
exports.default = useGoBack;
