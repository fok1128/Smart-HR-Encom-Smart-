import PageMeta from "../../components/common/PageMeta";
import AuthLayout from "./AuthPageLayout";
import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <>
      <PageMeta
        title="Smart HR @PEA ENCOM SMART"
        description="Smart HR Sign In"
      />
      <AuthLayout>
        <SignInForm />
      </AuthLayout>
    </>
  );
}
