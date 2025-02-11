import "@testing-library/jest-dom";
import dotenv from "dotenv";
import "fast-text-encoding";
import { TextEncoder, TextDecoder } from 'util';
import "whatwg-fetch";


Object.assign(global, { TextDecoder, TextEncoder });
dotenv.config({ path: ".env.local" });
process.env.NEXTAUTH_URL = "http://localhost:3001";
process.env.NEXTAUTH_URL_INTERNAL = "http://localhost:3001/app/api/auth";

