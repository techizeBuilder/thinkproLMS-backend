import express, { Request, Response } from "express";
import rootRouter from "./routes/root.routes";
import { connectDB } from "./config/db";
import dotenv from "dotenv";
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware
app.use(express.json());

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
