// Tests F1 and NF1 requirements
import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import User from "@/models/User";
import { connectTestDB, closeDatabase } from "@/lib/testUtils";

jest.mock("nodemailer", () => {
  const sendMail = jest.fn();
  return {
    createTransport: () => ({ sendMail }),
    __mockSendMail: sendMail,
  };
});

const { __mockSendMail } = jest.requireMock("nodemailer");

describe("User Registration API", () => {
  beforeAll(async () => {
    await connectTestDB();
  });

  afterEach(async () => {
    await User.deleteMany({});
    __mockSendMail.mockReset();
  });

  afterAll(async () => {
    await closeDatabase();
  });

  it("should create a new user in the database", async () => {
    __mockSendMail.mockResolvedValue({});

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Auto",
          last_name: "Test",
          email: "test@gmail.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    expect(response.status).toBe(201);
    expect(responsejson.user).toHaveProperty("first_name", "Auto");
    expect(responsejson.user).toHaveProperty("last_name", "Test");
    expect(responsejson.user).toHaveProperty("email", "test@gmail.com");
  });

  it("should return an error if the email is already registered", async () => {
    await User.create({
      first_name: "Test",
      last_name: "User",
      email: "test@gmail.com",
      password: "password123",
    });

    __mockSendMail.mockResolvedValue({});

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Auto",
          last_name: "Test",
          email: "test@gmail.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    expect(response.status).toBe(400);
    expect(responsejson.error).toBe("Email already registered");
  });

  it("should return an error if required fields are missing", async () => {
    __mockSendMail.mockResolvedValue({});

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    expect(response.status).toBe(500);
    expect(responsejson.error).toContain("Error occurred:");
  });

  it("should handle nodemailer failure", async () => {
    __mockSendMail.mockRejectedValue(new Error("SMTP fail"));

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Auto",
          last_name: "Test",
          email: "failmail@gmail.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    expect(response.status).toBe(500);
    expect(responsejson.error).toBe("Error occurred: Error: SMTP fail");
  });

  it("should handle Mongo duplicate key error", async () => {
    __mockSendMail.mockResolvedValue({});

    const error = new Error() as any;
    error.code = 11000;

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Auto",
          last_name: "Test",
          email: "dup@gmail.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const originalCreate = User.create;
    User.create = jest.fn(() => {
      throw error;
    }) as any;

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    User.create = originalCreate;

    expect(response.status).toBe(400);
    expect(responsejson.error).toBe("Duplicate entry.");
  });

  it("should handle unexpected server error", async () => {
    __mockSendMail.mockResolvedValue({});

    const error = new Error("Unexpected error");

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Auto",
          last_name: "Test",
          email: "failtest@gmail.com",
          password: "password123",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const originalCreate = User.create;
    User.create = jest.fn(() => {
      throw error;
    }) as any;

    const response = (await POST(request)) as NextResponse;
    const responsejson = await response.json();

    User.create = originalCreate;

    expect(response.status).toBe(500);
    expect(responsejson.error).toContain("Error occurred:");
  });

  it("should store the password encrypted in the database", async () => {
    __mockSendMail.mockResolvedValue({});

    const request = new NextRequest(
      new Request("http://localhost/api/auth/register", {
        method: "POST",
        body: JSON.stringify({
          first_name: "Secure",
          last_name: "Test",
          email: "securetest@gmail.com",
          password: "plaintextpassword",
        }),
        headers: { "Content-Type": "application/json" },
      }),
    );

    const response = (await POST(request)) as NextResponse;
    expect(response.status).toBe(201);

    const createdUser = await User.findOne({ email: "securetest@gmail.com" });
    expect(createdUser).toBeDefined();
    expect(createdUser?.password).toBeDefined();
    expect(createdUser?.password).not.toBe("plaintextpassword");
    expect(createdUser?.password.startsWith("$2a$")).toBe(true);
  });
});
