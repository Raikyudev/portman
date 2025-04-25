import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getServerSession } from "next-auth";
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

export function createMockRequestWithJson(body: any): Request {
  return new Request("http://localhost", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export function createMockRequestWithUrl(path: string): Request {
  return new Request(`http://localhost${path}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
}
