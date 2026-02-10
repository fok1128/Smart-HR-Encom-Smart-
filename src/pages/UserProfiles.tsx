import PageBreadcrumb from "../components/common/PageBreadCrumb";
import UserMetaCard from "../components/UserProfile/UserMetaCard";
import UserInfoCard from "../components/UserProfile/UserInfoCard";
import PageMeta from "../components/common/PageMeta";
import { useMyProfile } from "../hooks/useMyProfile";

export default function UserProfile() {
  const { profile, fetching, errorMsg } = useMyProfile();

  return (
    <>
      <PageMeta title="Profile | Smart HR" description="User profile page" />
      <PageBreadcrumb pageTitle="Profile" />

      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <h3 className="mb-5 text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-7">
          Profile
        </h3>

        {/* ✅ Loading */}
        {fetching && (
          <div className="text-sm text-gray-600 dark:text-white/70">
            กำลังโหลดข้อมูลโปรไฟล์...
          </div>
        )}

        {/* ✅ Error */}
        {!fetching && errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/10 dark:text-red-200">
            {errorMsg}
          </div>
        )}

        {/* ✅ No profile */}
        {!fetching && !errorMsg && !profile && (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 dark:border-gray-800 dark:bg-white/[0.02] dark:text-white/70">
            ไม่พบข้อมูลโปรไฟล์ (ตรวจสอบ users/{`{uid}`}.employeeNo และ employees/{`{employeeNo}`})
          </div>
        )}

        {/* ✅ Profile OK */}
        {!fetching && !errorMsg && profile && (
          <div className="space-y-6">
            <UserMetaCard profile={profile} />
            <UserInfoCard profile={profile} />
          </div>
        )}
      </div>
    </>
  );
}
