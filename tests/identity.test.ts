import "dotenv/config"
import { describe, it, expect, beforeEach, beforeAll, afterAll } from "bun:test"
import { prisma } from "../src/db"
import { identify } from "../src/services/identity.service"

beforeAll(async () => {
  await prisma.$connect()
})

beforeEach(async () => {
  await prisma.contact.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})

describe("Identity Reconciliation", () => {
  it("creates new primary when no match exists", async () => {
    const result = await identify("a@test.com", "111")

    expect(result.contact.emails).toEqual(["a@test.com"])
    expect(result.contact.phoneNumbers).toEqual(["111"])
    expect(result.contact.secondaryContactIds.length).toBe(0)
  })

  it("does not duplicate on identical request", async () => {
    await identify("a@test.com", "111")
    const result = await identify("a@test.com", "111")

    const count = await prisma.contact.count()
    expect(count).toBe(1)
    expect(result.contact.secondaryContactIds.length).toBe(0)
  })

  it("creates secondary when new phone provided", async () => {
    await identify("a@test.com", "111")
    const result = await identify("a@test.com", "222")

    expect(result.contact.phoneNumbers.sort()).toEqual(["111", "222"])
    expect(result.contact.secondaryContactIds.length).toBe(1)
  })

  it("merges two primaries correctly", async () => {
    await identify("x@test.com", "999")
    await identify("y@test.com", "888")

    const result = await identify("x@test.com", "888")

    const primaries = await prisma.contact.findMany({
      where: { linkPrecedence: "primary" },
    })

    expect(primaries.length).toBe(1)
    expect(result.contact.emails).toContain("x@test.com")
    expect(result.contact.emails).toContain("y@test.com")
  })

  it("handles email-only input", async () => {
    const result = await identify("only@test.com", undefined)

    expect(result.contact.phoneNumbers.length).toBe(0)
  })

  it("handles phone-only input", async () => {
    const result = await identify(undefined, "555")

    expect(result.contact.emails.length).toBe(0)
  })

  it("returns full cluster when matching secondary", async () => {
    await identify("a@test.com", "111")
    await identify("a@test.com", "222")

    const secondary = await prisma.contact.findFirst({
      where: { phoneNumber: "222" },
    })

    if (!secondary) {
      throw new Error("Expected secondary contact to exist")
    }

    const result = await identify(
      secondary?.email ?? undefined,
      secondary?.phoneNumber ?? undefined)

    expect(result.contact.phoneNumbers.sort()).toEqual(["111", "222"])
  })
})