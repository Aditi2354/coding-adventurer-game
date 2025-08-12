import mongoose from "mongoose";

export async function connectDB(uri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(uri);
  console.log("✅ MongoDB connected");
}

export async function disconnectDB() {
  await mongoose.connection.close();
}
