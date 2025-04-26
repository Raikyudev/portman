// Page to display email confirmation success message
export default function ConfirmedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-4">
      <div className="text-center text-white">
        <h1 className="text-2xl font-semibold mb-4">Email Confirmed!</h1>
        <p>Your email has been successfully verified. You can now log in.</p>
        <a
          href="/auth/login"
          className="mt-4 inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Go to Login
        </a>
      </div>
    </div>
  );
}
