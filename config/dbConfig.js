import mongoose from "mongoose";
import dotenv from "dotenv";
import chalk from "chalk";
dotenv.config();

if (!process.env.MONGO_URI) {
  console.error(chalk.red.bold("❌  MONGO_URI is not defined in environment variables"));
  throw new Error("MONGO_URI missing");
}

async function connectDb() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log(chalk.green.bold("✅ Connected to MongoDB successfully!"));
  } catch (error) {
    console.error(
      chalk.red.bold("❌ Error connecting to MongoDB:"),
      chalk.yellow(error.message)
    );
    process.exit(1);
  }
}

export default connectDb;
