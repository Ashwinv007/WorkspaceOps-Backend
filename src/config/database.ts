import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri, {
      maxPoolSize: 50,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    const host = mongoose.connection.host;
    console.log(`MongoDB connected → ${host}`);
  } catch (err) {
    console.error("MongoDB connection failed" + err);
    process.exit(1);
  }
};
