"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Modal = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var Modal = function (_a) {
    var isOpen = _a.isOpen, onClose = _a.onClose, children = _a.children, className = _a.className, _b = _a.showCloseButton, showCloseButton = _b === void 0 ? true : _b, // Default to true for backwards compatibility
    _c = _a.isFullscreen, // Default to true for backwards compatibility
    isFullscreen = _c === void 0 ? false : _c;
    var modalRef = (0, react_1.useRef)(null);
    (0, react_1.useEffect)(function () {
        var handleEscape = function (event) {
            if (event.key === "Escape") {
                onClose();
            }
        };
        if (isOpen) {
            document.addEventListener("keydown", handleEscape);
        }
        return function () {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [isOpen, onClose]);
    (0, react_1.useEffect)(function () {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        }
        else {
            document.body.style.overflow = "unset";
        }
        return function () {
            document.body.style.overflow = "unset";
        };
    }, [isOpen]);
    if (!isOpen)
        return null;
    var contentClasses = isFullscreen
        ? "w-full h-full"
        : "relative w-full rounded-3xl bg-white  dark:bg-gray-900";
    return ((0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-0 flex items-center justify-center overflow-y-auto modal z-99999", children: [!isFullscreen && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 h-full w-full bg-gray-400/50 backdrop-blur-[32px]", onClick: onClose })), (0, jsx_runtime_1.jsxs)("div", { ref: modalRef, className: "".concat(contentClasses, "  ").concat(className), onClick: function (e) { return e.stopPropagation(); }, children: [showCloseButton && ((0, jsx_runtime_1.jsx)("button", { onClick: onClose, className: "absolute right-3 top-3 z-999 flex h-9.5 w-9.5 items-center justify-center rounded-full bg-gray-100 text-gray-400 transition-colors hover:bg-gray-200 hover:text-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white sm:right-6 sm:top-6 sm:h-11 sm:w-11", children: (0, jsx_runtime_1.jsx)("svg", { width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", xmlns: "http://www.w3.org/2000/svg", children: (0, jsx_runtime_1.jsx)("path", { fillRule: "evenodd", clipRule: "evenodd", d: "M6.04289 16.5413C5.65237 16.9318 5.65237 17.565 6.04289 17.9555C6.43342 18.346 7.06658 18.346 7.45711 17.9555L11.9987 13.4139L16.5408 17.956C16.9313 18.3466 17.5645 18.3466 17.955 17.956C18.3455 17.5655 18.3455 16.9323 17.955 16.5418L13.4129 11.9997L17.955 7.4576C18.3455 7.06707 18.3455 6.43391 17.955 6.04338C17.5645 5.65286 16.9313 5.65286 16.5408 6.04338L11.9987 10.5855L7.45711 6.0439C7.06658 5.65338 6.43342 5.65338 6.04289 6.0439C5.65237 6.43442 5.65237 7.06759 6.04289 7.45811L10.5845 11.9997L6.04289 16.5413Z", fill: "currentColor" }) }) })), (0, jsx_runtime_1.jsx)("div", { children: children })] })] }));
};
exports.Modal = Modal;
