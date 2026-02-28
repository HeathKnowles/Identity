import "dotenv/config"
import { serve } from "bun"
import identifyRoute from "./routes/identify"

const port = Number(process.env.port) || 3000

serve({
  port,
  fetch: identifyRoute.fetch,
})