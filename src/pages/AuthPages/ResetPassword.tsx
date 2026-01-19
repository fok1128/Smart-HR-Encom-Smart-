import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";

const ResetPassword: React.FC = () => {
  return (
    <>
      <PageMeta
        title="Reset Password | Company Portal"
        description="Reset your password for the company portal."
      />
      <AuthLayout>
        <div className="w-full max-w-md mx-auto rounded-2xl bg-white p-8 shadow-lg">
          <h1 className="text-2xl font-semibold text-slate-900 mb-2">
            Reset Password
          </h1>
          <p className="text-sm text-slate-500 mb-6">
            ใส่อีเมลที่ใช้ลงทะเบียน ระบบจะส่งลิงก์สำหรับรีเซ็ตรหัสผ่านไปให้คุณ
          </p>

          <form className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">
                Email
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600"
            >
              ส่งลิงก์รีเซ็ตรหัสผ่าน
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            นึกออกแล้ว?{" "}
            <Link to="/signin" className="font-medium text-brand-500">
              กลับไปหน้า Sign In
            </Link>
          </p>
        </div>
      </AuthLayout>
    </>
  );
};

export default ResetPassword;
