import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },

  password: { type: String, default: null }, // ✅ not required

  provider: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  googleId: { type: String, default: null }, // optional

  createdAt: { type: Date, default: Date.now },
});
const User = mongoose.model("User", userSchema);

export default User;
