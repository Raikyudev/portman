//Tests F1 and NF5 requirements
import { GET } from "@/app/api/auth/confirm/route";
import User from "@/models/User";
import { NextRequest } from "next/server";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";

describe("GET /api/auth/confirm", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  const createRequest = (token: string | null) =>
    new NextRequest(
      new Request(`http://localhost/api/auth/confirm?token=${token}`, {
        method: "GET",
      }),
    );

  it("returns error for missing token", async () => {
    const res = (await GET(createRequest(null))) as Response;
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired token");
  });

  it("returns error for invalid token", async () => {
    const invalidToken = "invalid-token";
    const res = (await GET(createRequest(invalidToken))) as Response;
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired token");
  });

  it("confirms user and redirects for valid token", async () => {
    const validToken = "valid-token";

    const user = new User({
      first_name: "Test",
      last_name: "User",
      email: "test@example.com",
      password: "hashed-password",
      isVerified: false,
      verificationToken: validToken,
      verificationTokenExpires: new Date(Date.now() + 1000 * 60 * 60),
      preferences: { currency: "USD" },
    });

    await user.save();

    const res = (await GET(createRequest(validToken))) as Response;

    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe(
      `${process.env.NEXT_PUBLIC_BASE_URL}/auth/confirmed`,
    );

    const updatedUser = await User.findOne({ email: "test@example.com" });
    expect(updatedUser?.isVerified).toBe(true);
    expect(updatedUser?.verificationToken).toBeUndefined();
    expect(updatedUser?.verificationTokenExpires).toBeUndefined();
  });

  it("returns error for expired token", async () => {
    const expiredToken = "expired-token";

    const expiredUser = new User({
      first_name: "Test",
      last_name: "User",
      email: "expired@example.com",
      password: "hashed-password",
      isVerified: false,
      verificationToken: expiredToken,
      verificationTokenExpires: new Date(Date.now() - 1000 * 60 * 60),
      preferences: { currency: "USD" },
    });

    await expiredUser.save();

    const res = (await GET(createRequest(expiredToken))) as Response;
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Invalid or expired token");
  });
});
