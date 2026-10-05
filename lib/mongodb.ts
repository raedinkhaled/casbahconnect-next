import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URL;

if (!uri) {
  throw new Error("MONGODB_URL is not configured");
}

declare global {
  var _mongoClient: MongoClient | undefined;
}

// The adapter accepts an unconnected client. The driver opens a connection
// on the first database operation, so JWT/session and demo requests do not
// start an unused connection pool. Reuse the pool in warm production workers.
const client = global._mongoClient ?? new MongoClient(uri);
global._mongoClient = client;

export default client;
