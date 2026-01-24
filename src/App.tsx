import { Routes, Route } from "react-router-dom";
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
import ProtectedRoute from "./routes/ProtectedRoute";
import TitleLock from "./components/common/TitleLock";
import LeaveSubmitPage from "./pages/LeaveSubmitPage";
import LeaveStatusPage from "./pages/LeaveStatusPage";

export default function App() {
  return (
    <>
      <ScrollToTop />
      <TitleLock />

      <Routes>
        {/* หน้า auth */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* หลังบ้าน */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<AppLayout />}>
            <Route index element={<Home />} />
            <Route path="profile" element={<UserProfiles />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="blank" element={<Blank />} />
            <Route path="form-elements" element={<FormElements />} />
            <Route path="basic-tables" element={<BasicTables />} />

            {/* Leave (ทำเป็น relative path) */}
            <Route path="leave/submit" element={<LeaveSubmitPage />} />
            <Route path="leave/request" element={<LeaveSubmitPage />} />
            <Route path="leave/status" element={<LeaveStatusPage />} />
          </Route>
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
