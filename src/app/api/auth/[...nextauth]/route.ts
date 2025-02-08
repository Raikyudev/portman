import NextAuth, {AuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";



interface AuthUser {
    id: string;
    email: string;
    name: string;
}

export const authOptions: AuthOptions= {
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: {
                    label: "Email",
                    type: "email"
                },
                password: {
                    label: "Password",
                    type: "password",
                },
            },
            async authorize(credentials: Record<"email" | "password", string> | undefined): Promise<AuthUser | null> {
                if (!credentials || !credentials.email || !credentials.password) {
                    throw new Error("Missing credentials");
                }

                await dbConnect();

                const user = await User.findOne({
                    email: credentials.email
                });

                if (!user){
                    throw new Error ("Invalid credentials");
                }

                const passwordsMatch = await bcrypt.compare(credentials.password, user.password);

                if(!passwordsMatch) {
                    throw new Error ("Invalid credentials");
                }

                return {
                    id: user._id.toString(),
                    email: user.email,
                    name: user.username
                }


            }
        })
    ],
    pages: {
        signIn: "/auth/login",
        signOut: "/auth/logout",
    },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };