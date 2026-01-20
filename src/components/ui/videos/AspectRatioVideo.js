import { jsx as _jsx } from "react/jsx-runtime";
const AspectRatioVideo = ({ videoUrl, aspectRatio = "video", // Default aspect ratio
title = "Embedded Video", }) => {
    return (_jsx("div", { className: `aspect-${aspectRatio} overflow-hidden rounded-lg`, children: _jsx("iframe", { src: videoUrl, title: title, frameBorder: "0", allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture", allowFullScreen: true, className: "w-full h-full" }) }));
};
export default AspectRatioVideo;
