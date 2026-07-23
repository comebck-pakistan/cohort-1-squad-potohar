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
    /\b(?:posted\s+)?(\d+)\s+(minute|hour|day|week|month)s?\s+ago\b/i
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
  const lines = normalizeLines(text)
  const candidates: BudgetCandidate[] = []

  for (let index = 0; index < lines.length; index++) {
    const currentLine = lines[index]
    const nextLine = lines[index + 1] ?? ""
    const windowText = [currentLine, nextLine].filter(Boolean).join(" ")

    const hourly = parseHourlyBudgetLine(currentLine, nextLine, windowText)
    if (hourly) candidates.push(hourly)

    const fixed = parseFixedBudgetLine(currentLine, nextLine, windowText)
    if (fixed) candidates.push(fixed)
  }

  const bestCandidate = candidates.sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence
    if (a.budgetType === b.budgetType) return 0
    return a.budgetType === "fixed" ? -1 : 1
  })[0]

  if (bestCandidate) {
    return {
      budgetAmount: bestCandidate.budgetAmount,
      budgetType: bestCandidate.budgetType
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
  // Matches "4.89 of 5", "4.89/5", "4.89 out of 5", or "4.89 stars"
  const match = text.match(
    /(?<![\d.])([0-5](?:\.\d{1,2})?)\s*(?:\/\s*5|of\s*5|out\s*of\s*5|stars?)\b/i
  )
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

function normalizeLines(text: string): string[] {
  return text
    .replace(/\u00a0/g, " ")
    .split(/\r?\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
}

type BudgetCandidate = {
  budgetAmount: number
  budgetType: "hourly" | "fixed"
  confidence: number
}

function parseHourlyBudgetLine(
  line: string,
  nextLine: string,
  windowText: string
): BudgetCandidate | null {
  const strongMarker = /(?:\/\s*hr|\/\s*hour|per\s+hour|hourly\s+rate)/i
  const weakMarker = /\bhourly\b/i
  const shortLabel = line.length <= 40

  if (
    !strongMarker.test(windowText) &&
    !(weakMarker.test(line) && shortLabel)
  ) {
    return null
  }

  const rangeMatch = windowText.match(
    /(?:\$?\s*)?(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:-|\u2013|\u2014|to)\s*(?:\$?\s*)?(\d+(?:,\d+)?(?:\.\d+)?)/i
  )

  if (rangeMatch) {
    return {
      budgetAmount: parseBudgetRangeAmount(rangeMatch[1], rangeMatch[2]),
      budgetType: "hourly",
      confidence: strongMarker.test(windowText) ? 100 : 80
    }
  }

  const singleMatch = windowText.match(
    /(?:\$?\s*)?(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:\/\s*hr|\/\s*hour|per\s*hour|hourly\s+rate|hourly)/i
  )

  if (singleMatch) {
    return {
      budgetAmount: parseMoney(singleMatch[1]),
      budgetType: "hourly",
      confidence: strongMarker.test(windowText) ? 95 : 75
    }
  }

  if (weakMarker.test(line) && shortLabel && /\$\s*\d/.test(nextLine)) {
    const nextRange = nextLine.match(
      /(?:\$?\s*)?(\d+(?:,\d+)?(?:\.\d+)?)\s*(?:-|\u2013|\u2014|to)\s*(?:\$?\s*)?(\d+(?:,\d+)?(?:\.\d+)?)/i
    )
    if (nextRange) {
      return {
        budgetAmount: parseBudgetRangeAmount(nextRange[1], nextRange[2]),
        budgetType: "hourly",
        confidence: 85
      }
    }

    const nextSingle = nextLine.match(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/)
    if (nextSingle) {
      return {
        budgetAmount: parseMoney(nextSingle[1]),
        budgetType: "hourly",
        confidence: 80
      }
    }
  }

  return null
}

function parseFixedBudgetLine(
  line: string,
  nextLine: string,
  windowText: string
): BudgetCandidate | null {
  const strongMarker = /\b(?:fixed[\s-]*price|est\.?\s*budget|project budget)\b/i
  const weakMarker = /\bbudget\b/i
  const shortLabel = line.length <= 40

  if (
    !strongMarker.test(windowText) &&
    !(weakMarker.test(line) && shortLabel)
  ) {
    return null
  }

  if (/(?:\/\s*hr|\/\s*hour|per\s+hour|hourly\s+rate)/i.test(windowText)) {
    return null
  }

  const amountMatch =
    line.match(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/) ??
    nextLine.match(/\$\s*(\d+(?:,\d+)?(?:\.\d+)?)/)

  if (!amountMatch) return null

  return {
    budgetAmount: parseMoney(amountMatch[1]),
    budgetType: "fixed",
    confidence: strongMarker.test(windowText) ? 100 : 75
  }
}

function parseBudgetRangeAmount(min: string, max: string): number {
  return Math.round((parseMoney(min) + parseMoney(max)) / 2)
}
