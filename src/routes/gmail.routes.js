import express from "express";
import { connectGmail, oauthCallback } from "../controllers/gmail.controller.js";

const gmailRoutes = express.Router();

gmailRoutes.get("/connect", connectGmail);

gmailRoutes.get("/oauth/callback", oauthCallback);

export default gmailRoutes;