import { NextRequest, NextResponse } from "next/server";
import { POST } from "@/app/api/auth/register/route";
import User from "@/models/User";
import mongoose from "mongoose";
import { dbConnect, closeDatabase } from "@/lib/mongodb";


describe("User Registration API", () => {
    beforeAll(async () =>{
        await dbConnect();
        console.log("Checking database connection:", mongoose.connection.readyState);
    });

    afterEach(async () => {
       await User.deleteMany({});
    });

    afterAll(async () => {
       await closeDatabase();
    })



    it("should create a new user in the database", async () => {
        const request = new NextRequest(new Request("http://localhost/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: "autotest",
                first_name: "Auto",
                last_name: "Test",
                email: "test@gmail.com",
                password: "password123"
            }),
            headers: { "Content-Type": "application/json" }
        }));

        const response = (await POST(request) as NextResponse);
        const responsejson = await response.json();

        expect(response.status).toBe(201);
        expect(responsejson.user).toHaveProperty("username", "autotest");
        expect(responsejson.user).toHaveProperty("first_name", "Auto");
        expect(responsejson.user).toHaveProperty("last_name", "Test");
        expect(responsejson.user).toHaveProperty("email", "test@gmail.com");
    });

    it("should return an error if the username is already taken", async () => {
        await User.create({
            username: "autotest",
            first_name: "Test",
            last_name: "User",
            email: "test@gmail.com",
            password: "password123",
        });

        const request = new NextRequest(new Request("http://localhost/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: "autotest",
                first_name: "Auto",
                last_name: "Test",
                email: "newtest@gmail.com",
                password: "password123",
            }),
            headers: { "Content-Type": "application/json" }
        }));

        const response = (await POST(request) as NextResponse);
        const responsejson = await response.json();

        expect(response.status).toBe(400);
        expect(responsejson.error).toBe("Username already taken");
    });

    it("should return an error if the email is already taken", async () => {
        await User.create({
            username: "autotest",
            first_name: "Test",
            last_name: "User",
            email: "test@gmail.com",
            password: "password123",
        });

        const request = new NextRequest(new Request("http://localhost/api/auth/register", {
            method: "POST",
            body: JSON.stringify({
                username: "autotestnew",
                first_name: "Auto",
                last_name: "Test",
                email: "test@gmail.com",
                password: "password123",
            }),
            headers: { "Content-Type": "application/json" }
        }));

        const response = (await POST(request) as NextResponse);
        const responsejson = await response.json();

        expect(response.status).toBe(400);
        expect(responsejson.error).toBe("Email already registered");
    });

});