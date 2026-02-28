import { prisma } from "../db"
import type { Contact } from "../../generated/prisma/client"

type IdentifyResponse = {
  contact: {
    primaryContactId: number
    emails: string[]
    phoneNumbers: string[]
    secondaryContactIds: number[]
  }
}

export async function identify(
  email?: string,
  phoneNumber?: string
): Promise<IdentifyResponse> {

  const orConditions: { email?: string; phoneNumber?: string }[] = []

  if (email) orConditions.push({ email })
  if (phoneNumber) orConditions.push({ phoneNumber })

  // 1️⃣ Find matching contacts
  const matches: Contact[] =
    orConditions.length > 0
      ? await prisma.contact.findMany({
          where: {
            deletedAt: null,
            OR: orConditions,
          },
        })
      : []

  // 2️⃣ No matches → create primary
  if (matches.length === 0) {
    const created = await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkPrecedence: "primary",
      },
    })

    return buildResponse(created.id, [created])
  }

  // 3️⃣ Fetch cluster (matches + their linked contacts)
  const matchIds = matches.map((m) => m.id)

  const cluster: Contact[] = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: { in: matchIds } },
        { linkedId: { in: matchIds } },
      ],
    },
  })

  const primary = resolvePrimary(cluster)

  // 4️⃣ Demote extra primaries
  const primaries = cluster.filter(
    (c) => c.linkPrecedence === "primary"
  )

  for (const p of primaries) {
    if (p.id !== primary.id) {
      await prisma.contact.update({
        where: { id: p.id },
        data: {
          linkedId: primary.id,
          linkPrecedence: "secondary",
        },
      })
    }
  }

  // 5️⃣ Insert secondary if new information present
  const existingEmails = new Set(
    cluster
      .map((c) => c.email)
      .filter((e): e is string => Boolean(e))
  )

  const existingPhones = new Set(
    cluster
      .map((c) => c.phoneNumber)
      .filter((p): p is string => Boolean(p))
  )

  if (
    (email && !existingEmails.has(email)) ||
    (phoneNumber && !existingPhones.has(phoneNumber))
  ) {
    await prisma.contact.create({
      data: {
        email,
        phoneNumber,
        linkedId: primary.id,
        linkPrecedence: "secondary",
      },
    })
  }

  // 6️⃣ Fetch final cluster
  const finalCluster: Contact[] = await prisma.contact.findMany({
    where: {
      deletedAt: null,
      OR: [
        { id: primary.id },
        { linkedId: primary.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  })

  return buildResponse(primary.id, finalCluster)
}

function resolvePrimary(cluster: Contact[]): Contact {
  const primaries = cluster.filter(
    (c) => c.linkPrecedence === "primary"
  )

  if (primaries.length === 0) {
    throw new Error("Invariant violation: no primary contact found")
  }

  primaries.sort(
    (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
  )

  const primary = primaries[0]

  if (!primary) {
    throw new Error("Primary resolution failed unexpectedly")
  }

  return primary
}

function buildResponse(
  primaryId: number,
  contacts: Contact[]
): IdentifyResponse {
  const emails = Array.from(
    new Set(
      contacts
        .map((c) => c.email)
        .filter((e): e is string => Boolean(e))
    )
  )

  const phoneNumbers = Array.from(
    new Set(
      contacts
        .map((c) => c.phoneNumber)
        .filter((p): p is string => Boolean(p))
    )
  )

  const secondaryContactIds = contacts
    .filter((c) => c.linkPrecedence === "secondary")
    .map((c) => c.id)

  return {
    contact: {
      primaryContactId: primaryId,
      emails,
      phoneNumbers,
      secondaryContactIds,
    },
  }
}