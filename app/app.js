import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import { mongoConnection } from "./connection.js";
import gmailRoutes from "./routes/gmail.routes.js";
import { routesConstants } from "../constants/routes.constants.js";
import draftRoutes from "./routes/draft.routes.js";
import followUpRoutes from "./routes/followup.routes.js";
const { AUTH, GMAIL, DRAFT, FOLLOWUP } = routesConstants;

mongoConnection();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("API running 🚀");
});

app.get("/api/test", (req, res) => {
  res.send("Test route working 🚀");
});
const routes = [
  { path: AUTH, route: authRoutes },
  { path: GMAIL, route: gmailRoutes },
  { path: DRAFT, route: draftRoutes },
  { path: FOLLOWUP, route: followUpRoutes },
];

routes.forEach(({ path, route }) => {
  app.use(path, route);
});

app.use((error, req, res, next) => {
  res.status(error.statusCode || 500).json(error || "Something went wrong");
});

export default app;
