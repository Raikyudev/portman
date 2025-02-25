import type { Metadata } from "next";
import "./globals.css";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import AuthProvider from "@/components/SessionProvider";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Portman",
  description: "Portman",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <title>Portman</title>
      </head>
      <body className="flex flex-col min-h-screen bg-black text-white">
        <AuthProvider session={session}>
          <Navbar />
          <main className={"flex-1 flex flex-col items-center justify-center"}>
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
