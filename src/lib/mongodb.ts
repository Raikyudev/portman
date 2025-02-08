import mongoose from 'mongoose';

const MONGODB_URI: string = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
}

const connection: { isConnected?: number } = {};

async function dbConnect(): Promise<void> {
    if (connection.isConnected) {
        console.log("Already connected to MongoDB");
        return;
    }
    try{
        const db = await mongoose.connect(MONGODB_URI, {
            dbName: 'portman',
        });
        connection.isConnected = db.connections[0].readyState;
        console.log("Using Database:", mongoose.connection.name);
    } catch (error) {
        console.error("MongoDB connection error:", error);
    }



}

export default dbConnect;
