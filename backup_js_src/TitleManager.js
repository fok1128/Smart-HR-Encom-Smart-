"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TitleManager;
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom");
var APP_TITLE = "Smart HR @PEA ENCOM SMART";
function TitleManager() {
    var location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(function () {
        document.title = APP_TITLE;
    }, [location.pathname]);
    return null;
}
