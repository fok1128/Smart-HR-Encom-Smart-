import { Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";
import ScrollToTop from "./components/common/ScrollToTop";
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
import RequireAdmin from "./components/auth/RequireAdmin";
import LeaveApprovePage from "./pages/LeaveApprovePage";
import { ToastCenterProvider } from "./components/common/ToastCenter";

export default function App() {
  return (
    <ToastCenterProvider>
      <ScrollToTop />
      <TitleLock />

      <Routes>
        {/* Auth pages */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Navigate to="/signin" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Protected area */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<UserProfiles />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="blank" element={<Blank />} />
            <Route path="form-elements" element={<FormElements />} />
            <Route path="basic-tables" element={<BasicTables />} />

            {/* Leave */}
            <Route path="leave/submit" element={<LeaveSubmitPage />} />
            <Route path="leave/request" element={<LeaveSubmitPage />} />
            <Route path="leave/status" element={<LeaveStatusPage />} />

            {/* ✅ Admin only */}
            <Route
              path="leave/approve"
              element={
                <RequireAdmin>
                  <LeaveApprovePage />
                </RequireAdmin>
              }
            />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </ToastCenterProvider>
  );
}
