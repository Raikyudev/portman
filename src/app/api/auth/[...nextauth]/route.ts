import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import type { NextApiRequest, NextApiResponse } from "next";

const handler = (req: NextApiRequest, res: NextApiResponse) => {
    console.log("Request to NextAuth handler: ", req.body);
    console.log("Headers: ", req.headers);
    console.log("Environment: ", {
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        NEXTAUTH_URL_INTERNAL: process.env.NEXTAUTH_URL_INTERNAL,
    });

    return NextAuth(authOptions)(req, res);
};


export const POST = handler;
export const GET = handler;
