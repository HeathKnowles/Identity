import "dotenv/config"
import { serve } from "bun"
import identifyRoute from "./routes/identify"

serve({
  port: 3000,
  fetch: identifyRoute.fetch,
})