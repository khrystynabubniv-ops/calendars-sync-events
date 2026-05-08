import { createApp } from "./app.js";
import { readConfig } from "./config.js";
import { startPolling } from "./poller.js";

const config = readConfig();
const app = createApp(config);

app.listen(config.port, () => {
  console.info(`Calendar sync service is listening on port ${config.port}`);
  startPolling(config);
});
