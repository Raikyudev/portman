import { jest } from "@jest/globals";

jest.mock("next-auth");

import { GET } from "@/app/api/user-portfolios/route";
import {
  connectTestDB,
  closeDatabase,
  getMockSession,
  mockSession,
} from "@/lib/testUtils";
import User from "@/models/User";
import Portfolio from "@/models/Portfolio";

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("GET /api/user-portfolios", () => {
  it("fetches user portfolios successfully", async () => {
    const user = await User.create({
      email: "test@example.com",
      password: "hashedpassword",
      first_name: "Test",
      last_name: "User",
      preferences: { currency: "USD" },
    });

    mockSession(getMockSession({ id: user._id.toString() }));

    await Portfolio.create({
      name: "First portfolio",
      description: "First portfolio description",
      user_id: user._id,
    });

    await Portfolio.create({
      name: "Second portfolio",
      description: "Second portfolio description",
      user_id: user._id,
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(Array.isArray(data.portfolios)).toBe(true);
    expect(data.portfolios.length).toBe(2);
    expect(data.portfolios[0]).toHaveProperty("name");
    expect(data.portfolios[0]).toHaveProperty("description");
    expect(data.portfolios[0]).toHaveProperty("created_at");
  });

  it("returns 401 if user is not authenticated", async () => {
    mockSession(null);

    const res = await GET();
    expect(res.status).toBe(401);

    const error = await res.json();
    expect(error.error).toBe("Unauthorized");
  });
});
