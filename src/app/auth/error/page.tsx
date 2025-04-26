// Page to display email verification error message

export default function ErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="text-center text-white">
        <h1 className="text-2xl font-semibold mb-4">Account Not Verified</h1>
        <p>
          Please verify your email before logging in. Check your inbox for the
          confirmation link.
        </p>
      </div>
    </div>
  );
}
