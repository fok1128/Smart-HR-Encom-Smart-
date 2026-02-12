// App.tsx
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
import LeaveApprovePage from "./pages/LeaveApprovePage";
import LeaveApproveHistoryPage from "./pages/LeaveApproveHistoryPage";
import RequireRole from "./routes/RequireRole";
import { ToastCenterProvider } from "./components/common/ToastCenter";
import MyLeaveRequestsPage from "./pages/MyLeaveRequestsPage";

// ✅ Field Work
import FieldWorkSubmitPage from "./pages/FieldWorkSubmitPage";
import FieldWorkHistoryPage from "./pages/FieldWorkHistoryPage"; // <<< ต้องมีไฟล์นี้จริง

export default function App() {
  return (
    <ToastCenterProvider>
      <ScrollToTop />
      <TitleLock />

      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<Navigate to="/signin" replace />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<UserProfiles />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="blank" element={<Blank />} />
            <Route path="form-elements" element={<FormElements />} />
            <Route path="basic-tables" element={<BasicTables />} />

            {/* ✅ Field Work */}
            <Route path="field-work" element={<FieldWorkSubmitPage />} />
            <Route path="field-work/history" element={<FieldWorkHistoryPage />} />

            {/* Leave */}
            <Route path="leave/submit" element={<LeaveSubmitPage />} />
            <Route path="leave/request" element={<LeaveSubmitPage />} />
            <Route path="leave/status" element={<LeaveStatusPage />} />
            <Route path="my-leaves" element={<MyLeaveRequestsPage />} />

            <Route element={<RequireRole allow={["ADMIN", "HR", "MANAGER", "EXECUTIVE_MANAGER"]} />}>
              <Route path="leave/approve" element={<LeaveApprovePage />} />
              <Route path="leave/approve-history" element={<LeaveApproveHistoryPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </ToastCenterProvider>
  );
}
