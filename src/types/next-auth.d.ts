import { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    first_name: string;
    last_name: string;
    preferences?: Record<string, unknown>;
  }

  interface Session extends DefaultSession {
    user: User;
  }

  interface JWT {
    id: string;
    email: string;
    name: string;
    first_name: string;
    last_name: string;
    preferences?: Record<string, unknown>;
  }
}
