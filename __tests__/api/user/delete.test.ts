import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { DELETE } from "@/app/api/user/delete/route";
import {
  connectTestDB,
  closeDatabase,
  createMockRequestWithJson,
  getMockSession,
  mockSession,
  createUserInDB,
  clearDatabase,
} from "@/lib/testUtils";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(async () => {
  await clearDatabase();
  jest.clearAllMocks();
});

describe("DELETE /api/user/delete", () => {
  it("deletes user and related data", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({ password: "password123" });
    const res = await DELETE(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/Account and all related data deleted/i);
  });

  it("returns 400 if no password provided", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({});
    const res = await DELETE(req);

    expect(res.status).toBe(400);
  });
});
