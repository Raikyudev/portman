//Tests F2 requirement
import { POST } from "@/app/api/portfolio/edit/route";
import {
  connectTestDB,
  closeDatabase,
  mockSession,
  getMockSession,
} from "@/lib/testUtils";
import Portfolio from "@/models/Portfolio";
import mongoose from "mongoose";

jest.mock("next-auth");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeDatabase();
});

function createRequest(body: any) {
  return new Request("http://localhost/api/portfolio/edit", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/portfolio/edit", () => {
  it("rejects unauthorized edit", async () => {
    mockSession(null);

    const req = createRequest({});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toMatch(/unauthorized/i);
  });

  it("returns 400 for missing fields", async () => {
    mockSession(getMockSession());

    const req = createRequest({});

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toMatch(/portfolio id and name are required/i);
  });

  it("edits an existing portfolio", async () => {
    const session = getMockSession();
    mockSession(session);

    const portfolio = await Portfolio.create({
      name: "Old Portfolio",
      description: "Old desc",
      user_id: new mongoose.Types.ObjectId(session.user.id),
    });

    const req = createRequest({
      portfolioId: portfolio._id.toString(),
      name: "Updated",
      description: "New desc",
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.portfolio.name).toBe("Updated");
    expect(json.portfolio.description).toBe("New desc");
  });
});
