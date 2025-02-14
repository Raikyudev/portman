
import User from "@/models/User";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import {closeDatabase, dbConnect} from "@/lib/mongodb";
import { POST } from "@/app/api/auth/[...nextauth]/route";
import { createMocks } from "node-mocks-http";

process.env.NEXTAUTH_URL = "http://localhost:3001";
process.env.NEXTAUTH_URL_INTERNAL = "http://localhost:3001/app/api/auth";


describe ("User Login API", () => {
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

    it("Should let user log in with correct credentials", async () => {
        const hashedPassword = await bcrypt.hash("password123", 10);

        await User.create({
           username: "autotest",
           first_name: "Auto",
           last_name: "Test",
            email: "test@gmail.com",
            password: hashedPassword,
        });

        const { req, res } = createMocks({
            method: "POST",
            url: "/api/auth/callback/credentials",
            body: {
                username: "autotest",
                password: "password123",
            },
        });

        req.headers.origin = process.env.NEXTAUTH_URL;



        await POST(req, res);

        expect(res._getStatusCode()).toBe(200);
        const jsonResponse = JSON.parse(res._getData());
        expect(jsonResponse).toHaveProperty("user");
        expect(jsonResponse.user.username).toBe("autotest");

    });

    it("Should return an error if the user does not exist", async () => {
        const mock = createMocks({
            method: "POST",
            url: "/api/auth/callback/credentials",
            body: {
                username: "autotest",
                password: "password123",
            },
        });
        const request = mock.req;
        const response = mock.res;


        await POST(request, response);


        expect(response._getStatusCode()).toBe(401);
        const jsonResponse = JSON.parse(response._getData());
        expect(jsonResponse).toHaveProperty("error");
        expect(jsonResponse.error).toBe("Invalid credentials");


    });

    it("Should return an error if the password is incorrect", async () => {
        const hashedPassword = await bcrypt.hash("password123", 10);

        await User.create({
            username: "autotest",
            first_name: "Auto",
            last_name: "Test",
            email: "test@gmail.com",
            password: hashedPassword,
        });

        const mock = createMocks({
            method: "POST",
            url: "/api/auth/callback/credentials",
            body: {
                username: "autotest",
                password: "testestestestestestest",
            },
        });
        const request = mock.req;
        const response = mock.res;

        await POST(request, response);


        expect(response._getStatusCode()).toBe(401);
        const jsonResponse = JSON.parse(response._getData());
        expect(jsonResponse).toHaveProperty("error");
        expect(jsonResponse.error).toBe("Invalid credentials");
    });

});