import { AuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { dbConnect } from "@/lib/mongodb";
import User, { IUser } from "@/models/User";

export const authOptions: AuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  jwt: {
    maxAge: 30 * 24 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },
      async authorize(credentials) {
        console.log(credentials);
        if (!credentials || !credentials.email || !credentials.password) {
          throw new Error("Missing credentials");
        }

        await dbConnect();

        const user = await User.findOne({
          email: credentials.email,
        });

        if (!user) {
          throw new Error("Invalid credentials");
        }

        if (!user.isVerified) {
          throw new Error("Please verify your email before logging in.");
        }

        const passwordsMatch = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!passwordsMatch) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          preferences: user.preferences || {},
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const userData = user;
        token.id = userData.id.toString();
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
        (session.user as { id?: string }).id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        (session.user as { preferences?: IUser["preferences"] }).preferences =
          token.preferences as IUser["preferences"];
        (session.user as { first_name?: IUser["first_name"] }).first_name =
          token.first_name as IUser["first_name"];
        (session.user as { last_name?: IUser["last_name"] }).last_name =
          token.last_name as IUser["last_name"];
      }
      return session;
    },
    async redirect({
      url,
      baseUrl,
    }: {
      url: string;
      baseUrl: string;
    }): Promise<string> {
      const isLocalhost = url.includes("localhost");
      const isValidUrl = url.startsWith(baseUrl) || url.startsWith("/");

      if (isValidUrl || isLocalhost) {
        return url;
      }
      return baseUrl + "/portfolio";
    },
  },
  pages: {
    signIn: "/auth/login",
    signOut: "/auth/logout",
    error: "/auth/error",
  },
};
