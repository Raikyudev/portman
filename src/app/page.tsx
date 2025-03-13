"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import React from "react";

export default function Home() {
  const router = useRouter();
  return (
    <div className="">
        <div className="grid grid-cols-2 w-screen h-screen relative">
            {/* Left Column */}
            <div className="flex flex-col justify-center items-center col-span-1 bg-true-black gap-4 p-10 h-screen">
                <div className="text-5xl text-white">Portman</div>
                <div className="flex flex-col justify-center items-center mb-4 text-white">
                    <div>Portfolio management</div>
                    <div>powered by AI</div>
                </div>
            </div>

            {/* Right Column */}
            <div className="flex flex-col col-span-1 bg-gray justify-center items-center p-10">
                {/* Text Section - Centered container, but text is left-aligned */}
                <div className="flex flex-col gap-4 w-1/2 text-left">
                    <div className="text-5xl">Nutmeg. A new approach to investing.</div>
                    <div className="text-lg">
                        We believe investing should be a clear and straightforward experience. We build and manage diversified portfolios, using technology to keep charges low and clearly show where you’re invested.
                    </div>
                </div>

                {/* Card Section - Below Text */}
                <div className="mt-8 flex justify-center w-full">
                    <Card className="bg-true-black text-white p-6 rounded-lg w-1/2 mt-10">
                        <CardHeader>
                            <CardTitle className="text-lg">Wealth Starts Here.</CardTitle>
                            <CardTitle>Start now.</CardTitle>
                        </CardHeader>
                        <CardContent className="flex items-center gap-4">
                                <Button onClick={() => router.push("/auth/login")}>Log in</Button>
                                <div>or</div>
                                <Button onClick={() => router.push("/auth/register")}>Create new account</Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Message Box - Positioned at the bottom */}
            <div className="absolute bottom-0 left-0 right-0 text-white p-6 text-center">
                ^ Learn more about Portman below ^
            </div>
        </div>

        <div className="flex flex-col items-center h-screen">
            <div className="text-lg p-4 pt-4">Why choose Portman?</div>
            <div className="p-4 w-3/5">We were the first and we’re now the largest digital wealth manager in the UK with 200k clients. We don’t hide behind complex pricing structures or financial jargon. We don’t keep you in the dark when it comes to your investments or how they’re performing. Instead, we give you complete transparency, and want you to feel empowered.
            </div>
            <div className="text-lg p-4 mt-4">How Portman Helps you invest</div>
            <div className="grid grid-cols-3 grid-rows-2 gap-4 w-2/3">
                <Card className="bg-red">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>

                <Card className="bg-true-black">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>

                <Card className="bg-true-black">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>

                <Card className="bg-true-black">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>

                <Card className="bg-true-black">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>

                <Card className="bg-true-black">
                    <CardHeader>
                        <CardTitle>SOME FEATURE</CardTitle>
                    </CardHeader>
                    <CardContent className="h-auto">
                        DESCRRIPTION
                    </CardContent>
                </Card>



            </div>
        </div>
      <h1>Portman</h1>
      <div>
        <button onClick={() => router.push("/auth/login")}>Login</button>
        <button onClick={() => router.push("/auth/register")}>Register</button>
      </div>
    </div>
  );
}
