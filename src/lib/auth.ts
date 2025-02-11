import  {AuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User from "@/models/User";





export const authOptions: AuthOptions= {
    session: {
        strategy: "jwt",
    },
    providers: [
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                username: {
                    label: "Username",
                    type: "text"
                },
                password: {
                    label: "Password",
                    type: "password",
                },
            },
            async authorize(credentials) {
                console.log(credentials)
                if (!credentials || !credentials.username || !credentials.password) {
                    throw new Error("Missing credentials");
                }

                await dbConnect();

                const user = await User.findOne({
                    username: credentials.username
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
                    username: user.username,
                    email: user.email,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    preferences: user.preferences
                }



            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.email = user.email;
                token.name = user.name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as {id?: string}).id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        signOut: "/auth/logout",
    },
};
