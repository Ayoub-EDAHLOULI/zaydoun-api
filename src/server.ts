import app from "./app";
import dotenv from "dotenv";
import { startSessionJanitor } from "./jobs/session.janitor";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  startSessionJanitor();
});
