import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import cookieParser from "cookie-parser";
import morgan from "morgan";
import connectDb from "./config/dbConfig.js";
import userRoute from "./routes/user.route.js"
import galleryRoute from "./routes/gallery.route.js";
import storyRoute from "./routes/story.route.js";


connectDb();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());
app.use(morgan("dev"));

const port = process.env.PORT || 8080;

app.use("/api/v1/user",userRoute)
app.use("/api/v1/gallery", galleryRoute);
app.use("/api/v1/stories", storyRoute);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running at ${port}`);
});
