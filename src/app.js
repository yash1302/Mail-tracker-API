import express from "express";
import cors from "cors";
import authRoutes from "./routes/authRoutes.js";
import { mongoConnection } from "./connection.js";
import gmailRoutes from "./routes/gmail.routes.js";

mongoConnection();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running 🚀");
});

app.use("/api/auth", authRoutes);
app.use("/api/gmail", gmailRoutes);

export default app;
