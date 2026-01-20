"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var jsx_runtime_1 = require("react/jsx-runtime");
var AspectRatioVideo = function (_a) {
    var videoUrl = _a.videoUrl, _b = _a.aspectRatio, aspectRatio = _b === void 0 ? "video" : _b, // Default aspect ratio
    _c = _a.title, // Default aspect ratio
    title = _c === void 0 ? "Embedded Video" : _c;
    return ((0, jsx_runtime_1.jsx)("div", { className: "aspect-".concat(aspectRatio, " overflow-hidden rounded-lg"), children: (0, jsx_runtime_1.jsx)("iframe", { src: videoUrl, title: title, frameBorder: "0", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, className: "w-full h-full" }) }));
};
exports.default = AspectRatioVideo;
