import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";
import pino from "pino";

const app = createApp();
const port = env.PORT;
const logger = pino();

app.listen(port, () => {
  logger.info(`Server running on http://localhost:${port}`);
});
