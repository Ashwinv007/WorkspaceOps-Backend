import mongoose from "mongoose";
import { env } from "./env";

export const connectDB = async () => {
  try {
    await mongoose.connect(env.mongoUri);
    const host = mongoose.connection.host;
    console.log(`MongoDB connected → ${host}`);
  } catch (err) {
    console.error("MongoDB connection failed");
    process.exit(1);
  }
};
