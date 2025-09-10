import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import rootRouter from "./routes/root.routes";
import { connectDB } from "./config/db";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());

// Cors setup for development
app.use(cors({ origin: "http://localhost:5173", credentials: true })); // Vite default port is 5173

// Routes
app.get("/", (req: Request, res: Response) => {
  res.json({ message: "Hello, TypeScript with Express!!!" });
});
app.use("/api", rootRouter);

app.listen(PORT, () => {
  // Connect DB
  connectDB();

  console.log(`Server is running on http://localhost:${PORT}`);
});
