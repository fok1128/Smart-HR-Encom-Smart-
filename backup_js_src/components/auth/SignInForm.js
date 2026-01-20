"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SignInForm;
var jsx_runtime_1 = require("react/jsx-runtime");
var react_1 = require("react");
var react_router_dom_1 = require("react-router-dom"); // ✅ แก้ตรงนี้
var icons_1 = require("../../icons");
var Label_1 = require("../form/Label");
var InputField_1 = require("../form/input/InputField");
var Checkbox_1 = require("../form/input/Checkbox");
var AuthContext_1 = require("../../context/AuthContext");
function SignInForm() {
    var _this = this;
    var _a = (0, react_1.useState)(false), showPassword = _a[0], setShowPassword = _a[1];
    var _b = (0, react_1.useState)(false), isChecked = _b[0], setIsChecked = _b[1];
    var _c = (0, react_1.useState)(""), email = _c[0], setEmail = _c[1];
    var _d = (0, react_1.useState)(""), password = _d[0], setPassword = _d[1];
    var _e = (0, react_1.useState)(null), error = _e[0], setError = _e[1];
    var _f = (0, react_1.useState)(false), loading = _f[0], setLoading = _f[1];
    var login = (0, AuthContext_1.useAuth)().login;
    var navigate = (0, react_router_dom_1.useNavigate)();
    var handleSubmit = function (e) { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            e.preventDefault();
            setError(null);
            if (!email.trim() || !password.trim()) {
                setError("กรุณากรอก Email และ Password ให้ครบ");
                return [2 /*return*/];
            }
            try {
                setLoading(true);
                // mock login
                if (email !== "admin@local.com" || password !== "1234") {
                    throw new Error("Email หรือ Password ไม่ถูกต้อง");
                }
                login({ fname: "Admin", lname: "User", email: email }, isChecked);
                navigate("/"); // หรือ navigate("/signin") ตาม flow ของคุณ
            }
            catch (err) {
                setError((err === null || err === void 0 ? void 0 : err.message) || "ล็อกอินไม่สำเร็จ");
            }
            finally {
                setLoading(false);
            }
            return [2 /*return*/];
        });
    }); };
    var inputBlackBorder = "border border-gray-900 bg-transparent focus:border-black focus:ring-0 focus:outline-none " +
        "dark:border-gray-200 dark:focus:border-white";
    return ((0, jsx_runtime_1.jsx)("div", { className: "flex h-full w-full items-center justify-center px-6 sm:px-10", children: (0, jsx_runtime_1.jsxs)("div", { className: "w-full max-w-md xl:max-w-lg 2xl:max-w-2xl", children: [(0, jsx_runtime_1.jsx)("h1", { className: "font-bold text-gray-900 dark:text-white leading-tight", children: (0, jsx_runtime_1.jsx)("span", { className: "block text-3xl xl:text-4xl 2xl:text-5xl", children: "Smart HR" }) }), (0, jsx_runtime_1.jsx)("p", { className: "mt-5 text-gray-600 dark:text-gray-300 text-base xl:text-lg 2xl:text-xl", children: "\u0E01\u0E23\u0E38\u0E13\u0E32\u0E40\u0E02\u0E49\u0E32\u0E2A\u0E39\u0E48\u0E23\u0E30\u0E1A\u0E1A\u0E14\u0E49\u0E27\u0E22\u0E1A\u0E31\u0E0D\u0E0A\u0E35\u0E1E\u0E19\u0E31\u0E01\u0E07\u0E32\u0E19" }), error && ((0, jsx_runtime_1.jsx)("div", { className: "mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-200", children: error })), (0, jsx_runtime_1.jsxs)("form", { onSubmit: handleSubmit, className: "mt-10 space-y-6 2xl:space-y-7", children: [(0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-base xl:text-lg 2xl:text-xl", children: (0, jsx_runtime_1.jsxs)(Label_1.default, { children: ["Email ", (0, jsx_runtime_1.jsx)("span", { className: "text-red-500", children: "*" })] }) }), (0, jsx_runtime_1.jsx)("div", { className: "mt-2", children: (0, jsx_runtime_1.jsx)(InputField_1.default, { type: "email", placeholder: "Enter your email", value: email, onChange: function (e) { return setEmail(e.target.value); }, className: inputBlackBorder }) })] }), (0, jsx_runtime_1.jsxs)("div", { children: [(0, jsx_runtime_1.jsx)("div", { className: "text-base xl:text-lg 2xl:text-xl", children: (0, jsx_runtime_1.jsxs)(Label_1.default, { children: ["Password ", (0, jsx_runtime_1.jsx)("span", { className: "text-red-500", children: "*" })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "relative mt-2", children: [(0, jsx_runtime_1.jsx)(InputField_1.default, { type: showPassword ? "text" : "password", placeholder: "Enter your password", value: password, onChange: function (e) { return setPassword(e.target.value); }, className: inputBlackBorder }), (0, jsx_runtime_1.jsx)("button", { type: "button", onClick: function () { return setShowPassword(function (s) { return !s; }); }, className: "absolute -translate-y-1/2 right-4 top-1/2 text-gray-600 hover:text-black dark:text-gray-300 dark:hover:text-white", "aria-label": showPassword ? "Hide password" : "Show password", children: showPassword ? ((0, jsx_runtime_1.jsx)(icons_1.EyeIcon, { className: "w-5 h-5 xl:w-6 xl:h-6" })) : ((0, jsx_runtime_1.jsx)(icons_1.EyeCloseIcon, { className: "w-5 h-5 xl:w-6 xl:h-6" })) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "flex items-center", children: (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center gap-3 text-sm xl:text-base 2xl:text-lg text-gray-700 dark:text-gray-300", children: [(0, jsx_runtime_1.jsx)(Checkbox_1.default, { id: "keep-logged-in", checked: isChecked, onChange: function () { return setIsChecked(function (v) { return !v; }); }, className: "border border-gray-900 dark:border-gray-200 focus:ring-0" }), "Keep me logged in"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "pt-2", children: (0, jsx_runtime_1.jsx)("button", { type: "submit", disabled: loading, className: "w-full rounded-lg bg-green-600 px-4 py-3 text-base font-medium text-white hover:bg-green-700 disabled:opacity-60 xl:py-4 xl:text-lg 2xl:text-xl", children: loading ? "Signing in..." : "Sign in" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "pt-2 text-center text-xs xl:text-sm text-gray-500 dark:text-gray-400", children: ["\u00A9 ", new Date().getFullYear(), " Smart HR PEA ENCOM SMART SOLUTION CO., LTD."] })] })] }) }));
}
