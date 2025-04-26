// Utils for testing

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { getServerSession } from "next-auth";
import bcrypt from "bcryptjs";
import type { Session } from "next-auth";

// In-memory Mongo server instance
let mongo: MongoMemoryServer;

// Connect to in-memory database for tests
export async function connectTestDB() {
  mongo = await MongoMemoryServer.create();
  const uri = mongo.getUri();
  await mongoose.connect(uri);
}

// Close and clean up in-memory database
export async function closeDatabase() {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  if (mongo) await mongo.stop();
}

// Mock next-auth session handling
jest.mock("next-auth");

// Mock a server session return value
export function mockSession(session: Session | null) {
  (
    getServerSession as jest.MockedFunction<typeof getServerSession>
  ).mockResolvedValue(session);
}

// Generate a mock session object with optional overrides
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

// Create a mock POST request with JSON body
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

// Create a mock GET request with URL path
export function createMockRequestWithUrl(
  path: string,
  method: string = "GET",
): Request {
  return new Request(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
  });
}

// Create a user document in the test database
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

// Clear all documents in all collections
export async function clearDatabase() {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
}
