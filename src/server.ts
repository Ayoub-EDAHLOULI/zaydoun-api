import app from "./app";
import { startSessionJanitor } from "./jobs/session.janitor";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
  startSessionJanitor();
});
