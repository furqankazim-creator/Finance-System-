import mongoose from "mongoose";

const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error("MONGODB_URI environment variable is not defined");
    }

    const conn = await mongoose.connect(mongoUri, {
      // Mongoose 8 has sensible defaults; override only what you need
      serverSelectionTimeoutMS: 5000,
    });

    console.log(`✅  MongoDB connected: ${conn.connection.host}`);

    mongoose.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("MongoDB disconnected. Attempting to reconnect...");
    });

    mongoose.connection.on("reconnected", () => {
      console.log("MongoDB reconnected");
    });
  } catch (error) {
    console.error("❌  MongoDB connection failed:", error);
    process.exit(1);
  }
};

export default connectDB;
