import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const connection: { isConnected?: number; mongoServer?: MongoMemoryServer } =
  {};

async function dbConnect(): Promise<void> {
  if (connection.isConnected || mongoose.connection.readyState >= 1) {
    console.log("Already connected to MongoDB");
    return;
  }

  if (process.env.NODE_ENV === "test") {
    console.log("Using in-memory database");
    connection.mongoServer = await MongoMemoryServer.create();
    const uri = connection.mongoServer.getUri();

    await mongoose.connect(uri, { dbName: "portman" });
    connection.isConnected = mongoose.connection.readyState;
  } else {
    const MONGODB_URI: string = process.env.MONGODB_URI || "";

    if (!MONGODB_URI) {
      throw new Error("No MongoDB URI provided.");
    }

    try {
      await mongoose.connect(MONGODB_URI, { dbName: "portman" });
      connection.isConnected = mongoose.connection.readyState;
      console.log("Using Database:", mongoose.connection.name);
    } catch (error) {
      console.error("MongoDB connection error:", error);
    }
  }
}

async function closeDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "test" && connection.mongoServer) {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await connection.mongoServer.stop();
    console.log("Closed In-memory mongo database");
  } else {
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        console.log("Closed MongoDB connection");
      }
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    }
  }

  connection.isConnected = undefined;
}

export { dbConnect, closeDatabase };
