type Profile = {
  email: string;
  employeeNo: string;
  role: string;
  fname: string;
  lname: string;
  position: string;
  departmentId: string;
  phone: string;
  active: boolean;
  avatarUrl?: string | null;
};

export default function UserInfoCard({ profile }: { profile: Profile }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
      <div>
        <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 lg:mb-6">
          Personal Information
        </h4>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">First Name</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.fname}</p>
          </div>

          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Last Name</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.lname}</p>
          </div>

          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Email address</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.email}</p>
          </div>

          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Phone</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.phone}</p>
          </div>

          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Position</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.position}</p>
          </div>

          <div>
            <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">Role</p>
            <p className="text-sm font-medium text-gray-800 dark:text-white/90">{profile.role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
