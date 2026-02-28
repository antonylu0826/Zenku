import { app } from "./app";
import { config } from "./config";

console.log(`Zenku server starting on http://localhost:${config.PORT}`);

export default {
    port: config.PORT,
    fetch: app.fetch,
};
