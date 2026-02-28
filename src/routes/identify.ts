import { Hono } from "hono"
import { identify } from "../services/identity.service"

const app = new Hono()

app.post("/identify", async (c) => {
  const body = await c.req.json()

  const email =
    typeof body.email === "string" ? body.email : undefined

  const phoneNumber =
    typeof body.phoneNumber === "string"
      ? body.phoneNumber
      : undefined

  if (!email && !phoneNumber) {
    return c.json(
      { error: "Either email or phoneNumber is required" },
      400
    )
  }

  const result = await identify(email, phoneNumber)

  return c.json(result)
})

export default app