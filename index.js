import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import mongoose from "mongoose";
import morgan from "morgan";

import routes from "./routes/index.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(morgan("dev"));

// db connection
const connectDB = async () => {
  const srvUri = process.env.MONGODB_URI;
  const directUri = process.env.MONGODB_URI_DIRECT;

  try {
    await mongoose.connect(srvUri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (err) {
    console.log("MongoDB connection error:", err.message);

    const isSrv = typeof srvUri === "string" && srvUri.startsWith("mongodb+srv://");
    if (isSrv && directUri) {
      try {
        await mongoose.connect(directUri, {
          serverSelectionTimeoutMS: 10000,
        });
        console.log("MongoDB connected (direct)");
      } catch (err2) {
        console.log("MongoDB direct connection error:", err2.message);
        process.exit(1);
      }
    } else {
      process.exit(1);
    }
  }
};

connectDB();

app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", async (req, res) => {
  res.status(200).json({
    message: "Welcome to Taskman API",
  });
});

app.use("/api-v1", routes);

// err middleware
app.use((err, req, res, next) => {
  console.log(err.stack);
  res.status(500).json({
    message: "Internal Server Error",
  });
});

// err not found
app.use((req, res, next) => {
  res.status(404).json({
    message: "Not Found",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
