import app from "./app/app.js";
import "./app/cron/checkReplies.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
