import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";

let mongo: MongoMemoryServer;

export async function connectTestDB() {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
}

export async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
}

jest.mock("next-auth");

export function mockSession(session: Session | null) {
  (
    getServerSession as jest.MockedFunction<typeof getServerSession>
  ).mockResolvedValue(session);
}

export function getMockSession(
  overrides: Partial<Session["user"]> = {},
): Session {
  return {
    user: {
      id: new mongoose.Types.ObjectId().toString(),
      email: "test@example.com",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
      ...overrides,
    },
    expires: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  };
}

export function createMockRequestWithJson(
  body: any,
  method: string = "POST",
): Request {
  return new Request("http://localhost", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createMockRequestWithUrl(
  path: string,
  method: string = "GET",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

export async function createUserInDB(
  overrides: Partial<Record<string, any>> = {},
) {
  const User = (await import("@/models/User")).default;
  const hashedPassword = await bcrypt.hash("password123", 10);
  const user = new User({
    email: "test@example.com",
    password: hashedPassword,
    first_name: "Test",
    last_name: "User",
    preferences: { currency: "USD" },
    ...overrides,
  });
  await user.save();
  return user;
}

export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
