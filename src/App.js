import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";
import Home from "./pages/Dashboard/Home";
import UserProfiles from "./pages/UserProfiles";
import Calendar from "./pages/Calendar";
import Blank from "./pages/Blank";
import FormElements from "./pages/Forms/FormElements";
import BasicTables from "./pages/Tables/BasicTables";
import SignIn from "./pages/AuthPages/SignIn";
import ResetPassword from "./pages/AuthPages/ResetPassword";
import NotFound from "./pages/OtherPage/NotFound";
import ProtectedRoute from "./routes/ProtectedRoute";
import TitleLock from "./components/common/TitleLock";
import LeaveSubmitPage from "./pages/LeaveSubmitPage";
import LeaveStatusPage from "./pages/LeaveStatusPage";
export default function App() {
    return (_jsxs(_Fragment, { children: [_jsx(ScrollToTop, {}), _jsx(TitleLock, {}), _jsxs(Routes, { children: [_jsx(Route, { path: "/signin", element: _jsx(SignIn, {}) }), _jsx(Route, { path: "/signup", element: _jsx(Navigate, { to: "/signin", replace: true }) }), _jsx(Route, { path: "/reset-password", element: _jsx(ResetPassword, {}) }), _jsx(Route, { element: _jsx(ProtectedRoute, {}), children: _jsxs(Route, { path: "/", element: _jsx(AppLayout, {}), children: [_jsx(Route, { index: true, element: _jsx(Home, {}) }), _jsx(Route, { path: "profile", element: _jsx(UserProfiles, {}) }), _jsx(Route, { path: "calendar", element: _jsx(Calendar, {}) }), _jsx(Route, { path: "blank", element: _jsx(Blank, {}) }), _jsx(Route, { path: "form-elements", element: _jsx(FormElements, {}) }), _jsx(Route, { path: "basic-tables", element: _jsx(BasicTables, {}) }), _jsx(Route, { path: "leave/submit", element: _jsx(LeaveSubmitPage, {}) }), _jsx(Route, { path: "leave/request", element: _jsx(LeaveSubmitPage, {}) }), _jsx(Route, { path: "leave/status", element: _jsx(LeaveStatusPage, {}) })] }) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] })] }));
}
