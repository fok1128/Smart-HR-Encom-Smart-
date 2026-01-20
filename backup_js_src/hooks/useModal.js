"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useModal = void 0;
var react_1 = require("react");
var useModal = function (initialState) {
    if (initialState === void 0) { initialState = false; }
    var _a = (0, react_1.useState)(initialState), isOpen = _a[0], setIsOpen = _a[1];
    var openModal = (0, react_1.useCallback)(function () { return setIsOpen(true); }, []);
    var closeModal = (0, react_1.useCallback)(function () { return setIsOpen(false); }, []);
    var toggleModal = (0, react_1.useCallback)(function () { return setIsOpen(function (prev) { return !prev; }); }, []);
    return { isOpen: isOpen, openModal: openModal, closeModal: closeModal, toggleModal: toggleModal };
};
exports.useModal = useModal;
