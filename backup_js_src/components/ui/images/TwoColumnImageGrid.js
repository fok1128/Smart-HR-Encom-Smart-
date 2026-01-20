"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = TwoColumnImageGrid;
var jsx_runtime_1 = require("react/jsx-runtime");
function TwoColumnImageGrid() {
    return ((0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 gap-5 sm:grid-cols-2", children: [(0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("img", { src: "/images/grid-image/image-02.png", alt: " grid", className: "border border-gray-200 rounded-xl dark:border-gray-800" }) }), (0, jsx_runtime_1.jsx)("div", { children: (0, jsx_runtime_1.jsx)("img", { src: "/images/grid-image/image-03.png", alt: " grid", className: "border border-gray-200 rounded-xl dark:border-gray-800" }) })] }));
}
