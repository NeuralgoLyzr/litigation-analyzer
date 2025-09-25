/* eslint-disable prefer-const */
/* eslint-disable no-var */
import mongoose from 'mongoose';
import 'dotenv/config';

// Define interface for the cached connection
interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Add mongoose to global type
declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseConnection | undefined;
}

// This prints the value to debug what's happening
console.log("MONGODB_URI:", process.env.NEXT_PUBLIC_MONGODB_URI);

if (!process.env.NEXT_PUBLIC_MONGODB_URI) {
  throw new Error('Please add your MONGODB_URI to .env.local');
}

// Use the connection string without modifications
const MONGODB_URI: string = process.env.NEXT_PUBLIC_MONGODB_URI;

let cached = global.mongoose as MongooseConnection;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectToDatabase() {
  // Check for existing connection
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    // Close any existing connections first
    if (mongoose.connection.readyState !== 0) {
      console.log("Closing existing connection");
      await mongoose.disconnect();
    }

    console.log("Creating new connection to DocumentDB");
    
    // Options for DocumentDB
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 45000,
      // Only needed for remote connections
      retryWrites: false,
      tls: true,
      tlsAllowInvalidHostnames: true,
      tlsAllowInvalidCertificates: true
    };

    mongoose.set('strictQuery', false);

    try {
      // Create new connection
      cached.promise = mongoose.connect(MONGODB_URI, opts);
      cached.conn = await cached.promise;
      console.log('✅ DocumentDB connection established successfully');
      
      return cached.conn;
    } catch (error) {
      console.error('❌ DocumentDB connection error:', error);
      cached.promise = null;
      throw error;
    }
  } else {
    // Resolve existing promise
    try {
      cached.conn = await cached.promise;
      return cached.conn;
    } catch (error) {
      console.error('❌ Error with existing connection promise:', error);
      cached.promise = null;
      throw error;
    }
  }
}

export default connectToDatabase; 