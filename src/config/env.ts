import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT || 4000,
  mongoUri: process.env.MONGO_URI as string,
  jwtSecret: process.env.JWT_SECRET as string
};
