import cors from "cors";
import express from "express";
import healthRouter from "./routes/health";
import jobsRouter from "./routes/jobs";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  }),
);
app.use(express.json());

app.use("/health", healthRouter);
app.use("/jobs", jobsRouter);

export default app;
