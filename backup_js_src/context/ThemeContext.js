"use client";
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useTheme = exports.ThemeProvider = void 0;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var ThemeContext = (0, react_1.createContext)(undefined);
var ThemeProvider = function (_a) {
    var children = _a.children;
    var _b = (0, react_1.useState)("light"), theme = _b[0], setTheme = _b[1];
    var _c = (0, react_1.useState)(false), isInitialized = _c[0], setIsInitialized = _c[1];
    (0, react_1.useEffect)(function () {
        // This code will only run on the client side
        var savedTheme = localStorage.getItem("theme");
        var initialTheme = savedTheme || "light"; // Default to light theme
        setTheme(initialTheme);
        setIsInitialized(true);
    }, []);
    (0, react_1.useEffect)(function () {
        if (isInitialized) {
            localStorage.setItem("theme", theme);
            if (theme === "dark") {
                document.documentElement.classList.add("dark");
            }
            else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, [theme, isInitialized]);
    var toggleTheme = function () {
        setTheme(function (prevTheme) { return (prevTheme === "light" ? "dark" : "light"); });
    };
    return ((0, jsx_runtime_1.jsx)(ThemeContext.Provider, { value: { theme: theme, toggleTheme: toggleTheme }, children: children }));
};
exports.ThemeProvider = ThemeProvider;
var useTheme = function () {
    var context = (0, react_1.useContext)(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
};
exports.useTheme = useTheme;
