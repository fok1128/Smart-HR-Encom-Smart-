import GridShape from "../../components/common/GridShape";
import { Link, useLocation } from "react-router-dom";
import PageMeta from "../../components/common/PageMeta";

export default function NotFound() {
  const { pathname } = useLocation();

  return (
    <>
      <PageMeta
        title="404 | Smart HR"
        description="Not found"
      />
      <div className="relative flex flex-col items-center justify-center min-h-screen p-6 overflow-hidden z-1">
        <GridShape />
        <div className="mx-auto w-full max-w-[242px] text-center sm:max-w-[472px]">
          <h1 className="mb-8 font-bold text-gray-800 text-title-md dark:text-white/90 xl:text-title-2xl">
            ERROR
          </h1>

          <img src="/images/error/404.svg" alt="404" className="dark:hidden" />
          <img src="/images/error/404-dark.svg" alt="404" className="hidden dark:block" />

          <p className="mt-10 mb-2 text-base text-gray-700 dark:text-gray-400 sm:text-lg">
            We can’t seem to find the page you are looking for!
          </p>

          {/* ✅ Debug path */}
          <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
            Path: <span className="font-semibold">{pathname}</span>
          </p>

          <div className="flex items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Back to Home
            </Link>

            <Link
              to="/leave/submit"
              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-3.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
            >
              Go Leave Submit
            </Link>
          </div>
        </div>

        <p className="absolute text-sm text-center text-gray-500 -translate-x-1/2 bottom-6 left-1/2 dark:text-gray-400">
          &copy; {new Date().getFullYear()} - TailAdmin
        </p>
      </div>
    </>
  );
}
