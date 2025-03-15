"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React from "react";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  return (
    <div className="">
      <div className="grid grid-cols-2 w-screen h-[calc(100vh-70px)] bg-true-black bg-[url('/homepage1.png')] bg-no-repeat bg-[length:60%_auto] bg-left relative">
        {/* Left Column */}
        <div className="flex flex-col justify-center items-center col-span-1  gap-4 p-10">
          <div className="text-5xl text-white">Portman</div>
          <div className="flex flex-col justify-center items-center mb-4 text-white">
            <div>Portfolio management</div>
            <div>powered by AI</div>
          </div>
        </div>

        {/* Right Column */}
        <div className="flex flex-col col-span-1 bg-true-black rounded-bl-[60px] justify-center items-center p-10">
          <div className="flex flex-col gap-4 w-1/2 text-left">
            <div className="text-4xl">
              <span className="text-red">Portman.</span> A new approach to
              investing.
            </div>
            <div className="text-lg">
              We believe investing should be a clear and straightforward
              experience. We build and manage diversified portfolios, using
              technology to keep charges low and clearly show where you’re
              invested.
            </div>
          </div>
          <div className="mt-8 flex justify-center w-full">
            <Card className="bg-red text-white p-6 rounded-lg no-border w-1/2 mt-10">
              <CardHeader>
                <CardTitle className="text-xl text-true-black font">
                  Wealth Starts Here.
                </CardTitle>
                <CardTitle className="text-lg text-white">Start now.</CardTitle>
              </CardHeader>
              <CardContent className="flex items-center gap-4">
                <Button
                  className="bg-black text-white"
                  onClick={() => router.push("/auth/login")}
                >
                  Log in
                </Button>
                <div>or</div>
                <Button
                  className="bg-black text-white"
                  onClick={() => router.push("/auth/register")}
                >
                  Create new account
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Message Box - Positioned at the bottom */}
        <div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-red font-bold p-4 mb-6 text-center w-fit rounded-full"
          style={{ backgroundColor: "rgba(0, 0, 0, 0.5)" }}
        >
          ↓ Scroll down to learn more ↓
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="text-lg text-red font-bold p-4 mt-6">
          Why choose Portman?
        </div>
        <div className="p-4 w-3/5">
          We were the first and we’re now the largest digital wealth manager in
          the UK with 200k clients. We don’t hide behind complex pricing
          structures or financial jargon. We don’t keep you in the dark when it
          comes to your investments or how they’re performing. Instead, we give
          you complete transparency, and want you to feel empowered.
        </div>
        <div className="text-lg text-red font-bold p-4 mt-6">
          How Portman Helps you invest
        </div>
        <div className="grid grid-cols-3 grid-rows-2 gap-4 w-2/3">
          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>

          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>

          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>

          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>

          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>

          <Card className="bg-true-black hover:bg-red">
            <CardHeader>
              <CardTitle>SOME FEATURE</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">DESCRRIPTION</CardContent>
          </Card>
        </div>
        <div className="text-lg text-red font-bold p-4 mt-6">
          3 Easy steps to get you started
        </div>
        <div className="grid grid-cols-3 grid-rows-1 gap-4 w-2/3 mb-16">
          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-lg">Step 1</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Log in or create a new account
              <Image
                src="/homepage1.png"
                alt="Description of image"
                width={600}
                height={400}
              />
            </CardContent>
          </Card>

          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-lg">Step 2</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Create your first portfolio and add your transactions
              <Image
                src="/homepage1.png"
                alt="Description of image"
                className=""
                width={600}
                height={400}
              />
            </CardContent>
          </Card>

          <Card className="bg-true-black hover:border-red">
            <CardHeader>
              <CardTitle className="text-lg">Step 3</CardTitle>
            </CardHeader>
            <CardContent className="h-auto">
              Explore your insights and see how your portfolio is performing
              <Image
                src="/homepage1.png"
                alt="Description of image"
                width={600}
                height={400}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
