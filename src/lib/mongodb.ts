import mongoose from 'mongoose';

const MONGODB_URI: string = process.env.MONGO_URI || '';

if (!MONGODB_URI) {
    throw new Error('Please define the MONGO_URI environment variable');
}

const connection: { isConnected?: number } = {};

async function dbConnect(): Promise<void> {
    if (connection.isConnected) {
        return;
    }

    const db = await mongoose.connect(MONGODB_URI);

    connection.isConnected = db.connections[0].readyState;
}

export default dbConnect;
