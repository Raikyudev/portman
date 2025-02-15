import  {AuthOptions} from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";





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

                return user;


            }
        })
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                const userData = user as IUser;
                token.id = userData._id.toString();
                token.email = userData.email;
                token.name = `${userData.first_name} ${userData.last_name}`;
                token.preferences = userData.preferences;
                token.first_name = userData.first_name;
                token.last_name = userData.last_name;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as {id?: string}).id = token.id as string;
                session.user.email = token.email as string;
                session.user.name = token.name as string;
                (session.user as { preferences?: IUser["preferences"] }).preferences = token.preferences as IUser["preferences"];
                (session.user as { first_name?: IUser["first_name"] }).first_name = token.first_name as IUser["first_name"];
                (session.user as { last_name?: IUser["last_name"] }).last_name = token.last_name as IUser["last_name"];
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/login",
        signOut: "/auth/logout",
    },
};
