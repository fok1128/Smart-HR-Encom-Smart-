import SignInForm from "../../components/auth/SignInForm";
import AuthPageLayout from "./AuthPageLayout";

export default function SignIn() {
  return (
    <AuthPageLayout>
      <SignInForm />
    </AuthPageLayout>
  );
}
