// MongoDB connection file

import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Connection object to track state
const connection: { isConnected?: number; mongoServer?: MongoMemoryServer } =
  {};

async function dbConnect(): Promise<void> {
  // Already connected
  if (connection.isConnected || mongoose.connection.readyState >= 1) {
    return;
  }

  if (process.env.NODE_ENV === "test") {
    // In-memory MongoDB for testing
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
      // Connect to live database
      await mongoose.connect(MONGODB_URI, { dbName: "portman" });
      connection.isConnected = mongoose.connection.readyState;
    } catch (error) {
      console.error("MongoDB connection error:", error);
    }
  }
}

async function closeDatabase(): Promise<void> {
  if (process.env.NODE_ENV === "test" && connection.mongoServer) {
    // Drop in-memory database
    await mongoose.connection.dropDatabase();

    // Close mongoose connection
    await mongoose.connection.close();

    // Stop in-memory server
    await connection.mongoServer.stop();
    console.log("Closed In-memory mongo database");
  } else {
    try {
      if (mongoose.connection.readyState !== 0) {
        // Close regular database connection
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
