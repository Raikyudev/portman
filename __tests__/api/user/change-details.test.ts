import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { POST } from "@/app/api/user/change-details/route";
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

describe("POST /api/user/change-details", () => {
  it("updates user email", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({
      email: "newemail@example.com",
      password: "password123",
    });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.email).toBe("newemail@example.com");
  });

  it("returns 400 if no email or password", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
