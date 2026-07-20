export function parseProposalCount(text: string): number | null {
  // Completely relaxed regex: just find the standard Upwork proposal brackets anywhere in the text
  // since the word "proposals" might be separated by lots of UI elements.
  const match = text.match(
    /(less than 5|5 to 10|10 to 15|15 to 20|20 to 50|50\+)/i
  )

  if (!match) return null

  const bracket = match[1].toLowerCase()
  const bracketMidpoints: Record<string, number> = {
    "less than 5": 2,
    "5 to 10": 7,
    "10 to 15": 12,
    "15 to 20": 17,
    "20 to 50": 35,
    "50+": 55
  }

  return bracketMidpoints[bracket] ?? null
}

export function parsePostedAt(text: string, now = new Date()): string | null {
  if (/\bposted\s+yesterday\b/i.test(text)) {
    const date = new Date(now)
    date.setDate(date.getDate() - 1)
    return date.toISOString()
  }

  const match = text.match(
    /posted\s+(\d+)\s+(minute|hour|day|week|month)s?\s+ago/i
  )

  if (!match) return null

  const value = Number(match[1])
  const unit = match[2].toLowerCase()
  const date = new Date(now)

  if (unit === "minute") date.setMinutes(date.getMinutes() - value)
  if (unit === "hour") date.setHours(date.getHours() - value)
  if (unit === "day") date.setDate(date.getDate() - value)
  if (unit === "week") date.setDate(date.getDate() - value * 7)
  if (unit === "month") date.setMonth(date.getMonth() - value)

  return date.toISOString()
}

export function parseBudget(text: string): {
  budgetAmount: number | null
  budgetType: "hourly" | "fixed" | "unknown"
} {
  // Relaxed hourly: look for any $amount followed by hr, hour, or hourly anywhere nearby
  const hourlyRange = text.match(
    /\$\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*-\s*\$\s*(\d+(?:,\d+)?(?:\.\d+)?).*?(?:hr|hour|hourly)/i
  )

  if (hourlyRange) {
    const min = parseMoney(hourlyRange[1])
    const max = parseMoney(hourlyRange[2])
    return {
      budgetAmount: Math.round((min + max) / 2),
      budgetType: "hourly"
    }
  }

  const hourlySingle = text.match(
    /\$\s*(\d+(?:,\d+)?(?:\.\d+)?).*?(?:hr|hour|hourly)/i
  )

  if (hourlySingle) {
    return {
      budgetAmount: parseMoney(hourlySingle[1]),
      budgetType: "hourly"
    }
  }

  // Relaxed fixed price: look for the first dollar amount that appears in the text
  // Upwork almost always lists the budget with a $ sign.
  const fixedMatch = text.match(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/)
  
  if (fixedMatch) {
    return {
      budgetAmount: parseMoney(fixedMatch[1]),
      budgetType: "fixed"
    }
  }

  return {
    budgetAmount: null,
    budgetType: "unknown"
  }
}

export function parsePaymentVerified(
  text: string
): "yes" | "no" | "unknown" {
  if (/\bpayment(?:\s+method)?\s+verified\b/i.test(text)) return "yes"
  if (/\bpayment(?:\s+method)?\s+(?:unverified|not\s+verified)\b/i.test(text)) {
    return "no"
  }

  return "unknown"
}

export function parseClientRating(text: string): number | null {
  // Matches "4.89 of 5" OR "4.89 (10 reviews)" OR "4.89 stars"
  const match = text.match(/([1-5](?:\.\d{1,2})?)\s*(?:of\s*5|out\s*of\s*5|stars?|\(?[0-9,]+\s*reviews?\)?)/i)
  if (!match) return null

  const rating = Number(match[1])
  return rating >= 0 && rating <= 5 ? rating : null
}

export function parseTotalClientSpend(text: string): number | null {
  const match = text.match(
    /\$?\s*(\d+(?:,\d+)?(?:\.\d+)?)\s*([kmb])?\+?\s*(?:total\s+)?spent/i
  )

  if (!match) return null

  let value = parseMoney(match[1])
  const suffix = match[2]?.toLowerCase()

  if (suffix === "k") value *= 1000
  if (suffix === "m") value *= 1000000
  if (suffix === "b") value *= 1000000000

  return Math.round(value)
}

export function parseClientHireCount(text: string): number | null {
  const match = text.match(/(\d+(?:,\d+)?)\s*hires?/i)
  return match ? parseMoney(match[1]) : null
}

export function detectOffPlatformFlag(text: string): boolean {
  return /\b(skype|telegram|whatsapp|pay\s+outside|outside\s+upwork|direct\s+payment|wire\s+transfer)\b/i.test(
    text
  )
}

export function detectUnpaidTestFlag(text: string): boolean {
  return /\b(unpaid\s+test|free\s+sample|sample\s+task\s+without\s+pay|work\s+for\s+free)\b/i.test(
    text
  )
}

function parseMoney(value: string): number {
  return Number(value.replace(/,/g, ""))
}
