// Homepage

"use client";

import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React from "react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { status } = useSession();

  // Check if the user is logged in
  const isLoggedIn = status === "authenticated";

  return (
    <div className="">
      <div className="grid grid-cols-1 sm:grid-cols-2 w-full h-[calc(100vh-70px)] bg-true-black bg-[url('/homepage1.png')] bg-no-repeat bg-[length:100%_auto] sm:bg-[length:60%_auto] bg-center sm:bg-left relative">
        <div className="flex flex-col justify-center items-center col-span-1 gap-4 p-4 sm:p-10">
          <div className="text-3xl sm:text-5xl text-white">Portman</div>
          <div className="flex flex-col justify-center items-center mb-4 text-white text-sm sm:text-base">
            <div>Portfolio management</div>
            <div>powered by AI</div>
          </div>
        </div>

        <div className="flex flex-col col-span-1 bg-true-black rounded-bl-[60px] justify-center items-center p-4 sm:p-10">
          <div className="flex flex-col gap-4 w-full sm:w-3/4 md:w-1/2 text-left">
            <div className="text-2xl sm:text-4xl">
              <span className="text-red">Portman.</span> A new approach to
              investing.
            </div>
            <div className="text-sm sm:text-lg">
              Investing should be transparent and simple. We help you build and
              manage your portfolio with clear insights, no fees, and real-time
              tracking of your investments.
            </div>
          </div>
          <div className="mt-4 sm:mt-8 flex justify-center w-full">
            <Card className="bg-red text-white p-4 sm:p-6 rounded-lg no-border w-full sm:w-3/4 md:w-1/2 mt-6 sm:mt-10">
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl text-true-black font">
                  Wealth Starts Here.
                </CardTitle>
                <CardTitle className="text-base sm:text-lg text-white">
                  Start now.
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
                {isLoggedIn ? (
                  <Button
                    className="bg-black text-white hover:text-true-black w-full sm:w-auto"
                    onClick={() => router.push("/dashboard")}
                  >
                    Go to your dashboard
                  </Button>
                ) : (
                  <>
                    <Button
                      className="bg-black text-white hover:text-true-black w-full sm:w-auto"
                      onClick={() => router.push("/auth/login")}
                    >
                      Log in
                    </Button>
                    <div className="hidden sm:block">or</div>
                    <Button
                      className="bg-black text-white hover:text-true-black w-full sm:w-auto"
                      onClick={() => router.push("/auth/register")}
                    >
                      Create new account
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-red font-bold p-2 sm:p-4 mb-4 sm:mb-6 text-center w-fit rounded-full text-xs sm:text-base"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          ↓ Scroll down to learn more ↓
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-base sm:text-lg text-red font-bold p-4 mt-4 sm:mt-6">
          Why choose Portman?
        </div>
        <div className="p-4 w-full sm:w-4/5 md:w-3/5 text-sm sm:text-base">
          Portman is a digital wealth management tool that puts transparency and
          simplicity at the heart of investing - without hidden fees or
          confusing jargon. The platform offers clear insights, real-time
          performance tracking, and AI-driven reports to help you make informed
          decisions with confidence. Whether you're building your first
          portfolio or optimising your investments, Portman helps you take
          control of your financial future.
        </div>

        <div className="text-base sm:text-lg text-red font-bold p-4 mt-4 sm:mt-6">
          How Portman Helps you invest
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full sm:w-4/5 md:w-2/3 px-4">
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>Automated Portfolio Tracking</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Track your investments in real-time with automatic updates and
              insights.
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>Historical Performance Analysis</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Review how your portfolio has grown or changed over time.
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>Customizable Watchlists</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Monitor assets you’re interested in and receive updates on price
              changes.
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>Downloadable Reports</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Export your portfolio summaries and insights whenever you need.
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>Multi-Portfolio Support</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Manage multiple portfolios separately, great for different goals.
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>AI-Driven Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Get tailored insights and suggestions powered by AI.
            </CardContent>
          </Card>
        </div>

        <div className="text-base sm:text-lg text-red font-bold p-4 mt-4 sm:mt-6">
          3 Easy steps to get you started
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full sm:w-4/5 md:w-2/3 px-4 mb-8 sm:mb-16">
          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Step 1</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Log in or create a new account.
              <p>
                <br />
              </p>
              <div className="relative w-full h-[450px]">
                <Image
                  src="/step1.png"
                  alt="Description of image"
                  fill
                  className="object-contain"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Step 2</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Create your first portfolio and add your transactions.
              <div className="relative w-full h-[450px]">
                <Image
                  src="/step2.png"
                  alt="Description of image"
                  fill
                  className="object-contain"
                />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Step 3</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Explore your insights and see how your portfolio is performing.
              <div className="relative w-full h-[450px]">
                <Image
                  src="/step3.png"
                  alt="Description of image"
                  fill
                  className="object-contain"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
