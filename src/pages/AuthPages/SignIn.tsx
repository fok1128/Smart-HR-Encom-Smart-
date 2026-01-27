import SignInForm from "../../components/auth/SignInForm";

export default function SignIn() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-purple-700/40 px-4 py-10">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-10 shadow-xl">
        <SignInForm />
      </div>
    </div>
  );
}
