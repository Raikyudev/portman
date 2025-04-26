import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { POST } from "@/app/api/user/change-password/route";
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

describe("POST /api/user/change-password", () => {
  it("updates user password", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({
      currentPassword: "password123",
      newPassword: "newpassword456",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toMatch(/Password updated/i);
  });

  it("returns 400 if passwords are missing", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
