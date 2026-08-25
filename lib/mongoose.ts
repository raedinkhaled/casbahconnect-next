import mongoose, { type Mongoose } from "mongoose";

const MONGODB_DATABASE = "devflow";

declare global {
  var _mongooseConnection:
    | { connection: Mongoose | null; promise: Promise<Mongoose> | null }
    | undefined;
}

const cache = global._mongooseConnection ?? {
  connection: null,
  promise: null,
};

global._mongooseConnection = cache;

export async function connectToDatabase() {
  if (cache.connection) return cache.connection;

  const uri = process.env.MONGODB_URL;
  if (!uri) throw new Error("MONGODB_URL is not configured");

  if (!cache.promise) {
    mongoose.set("strictQuery", true);
    cache.promise = mongoose.connect(uri, { dbName: MONGODB_DATABASE });
  }

  try {
    cache.connection = await cache.promise;
  } catch (error) {
    cache.promise = null;
    throw error;
  }

  return cache.connection;
}
