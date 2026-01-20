"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppWrapper = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_helmet_async_1 = require("react-helmet-async");
var PageMeta = function (_a) {
    var title = _a.title, description = _a.description;
    return ((0, jsx_runtime_1.jsxs)(react_helmet_async_1.Helmet, { children: [(0, jsx_runtime_1.jsx)("title", { children: title }), (0, jsx_runtime_1.jsx)("meta", { name: "description", content: description })] }));
};
var AppWrapper = function (_a) {
    var children = _a.children;
    return ((0, jsx_runtime_1.jsx)(react_helmet_async_1.HelmetProvider, { children: children }));
};
exports.AppWrapper = AppWrapper;
exports.default = PageMeta;
