import { createApp } from "./api/app.js";
import { config } from "./config.js";
import { ensureBootstrapAdmin } from "./services/authService.js";

ensureBootstrapAdmin();

const app = createApp();

app.listen(config.port, () => {
  console.log(`[medy-site-backend] API disponible sur http://localhost:${config.port}`);
});
