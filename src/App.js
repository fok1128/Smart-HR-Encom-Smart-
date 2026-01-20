import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import FormElements from "./pages/Forms/FormElements";
import BasicTables from "./pages/Tables/BasicTables";
import SignIn from "./pages/AuthPages/SignIn";
import SignUp from "./pages/AuthPages/SignUp";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
export default function App() {
    return (_jsx(AuthProvider, { children: _jsxs(Router, { children: [_jsx(ScrollToTop, {}), _jsxs(Routes, { children: [_jsxs(Route, { element: _jsx(AppLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(Home, {}) }), _jsx(Route, { path: "/profile", element: _jsx(UserProfiles, {}) }), _jsx(Route, { path: "/calendar", element: _jsx(Calendar, {}) }), _jsx(Route, { path: "/blank", element: _jsx(Blank, {}) }), _jsx(Route, { path: "/form-elements", element: _jsx(FormElements, {}) }), _jsx(Route, { path: "/basic-tables", element: _jsx(BasicTables, {}) })] }), _jsx(Route, { path: "/signin", element: _jsx(SignIn, {}) }), _jsx(Route, { path: "/signup", element: _jsx(SignUp, {}) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPassword, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] })] }) }));
}
