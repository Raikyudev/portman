import { jest } from "@jest/globals";

jest.mock("next-auth", () => ({
  getServerSession: jest.fn(),
}));

import { POST } from "@/app/api/user/change-currency/route";
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

describe("POST /api/user/change-currency", () => {
  it("updates user currency", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({ currency: "EUR" });
    const res = await POST(req);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.user.preferences.currency).toBe("EUR");
  });

  it("returns 400 if no currency provided", async () => {
    const user = await createUserInDB();
    mockSession(getMockSession({ email: user.email }));

    const req = createMockRequestWithJson({});
    const res = await POST(req);

    expect(res.status).toBe(400);
  });
});
