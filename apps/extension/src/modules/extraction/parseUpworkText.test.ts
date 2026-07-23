import { describe, expect, test } from "vitest"

import {
  detectOffPlatformFlag,
  detectUnpaidTestFlag,
  parseBudget,
  parseClientHireCount,
  parseClientRating,
  parsePaymentVerified,
  parsePostedAt,
  parseProposalCount,
  parseTotalClientSpend
} from "./parseUpworkText"

// ---------- parseProposalCount ----------

describe("parseProposalCount", () => {
  test("Less than 5", () => {
    expect(parseProposalCount("Less than 5 proposals")).toBe(2)
  })

  test("5 to 10", () => {
    expect(parseProposalCount("5 to 10 proposals")).toBe(7)
  })

  test("10 to 15", () => {
    expect(parseProposalCount("10 to 15 proposals")).toBe(12)
  })

  test("15 to 20", () => {
    expect(parseProposalCount("15 to 20 proposals")).toBe(17)
  })

  test("20 to 50", () => {
    expect(parseProposalCount("20 to 50 proposals")).toBe(35)
  })

  test("50+", () => {
    expect(parseProposalCount("50+ proposals")).toBe(55)
  })

  test("case insensitive", () => {
    expect(parseProposalCount("LESS THAN 5 PROPOSALS")).toBe(2)
  })

  test("singular proposal", () => {
    expect(parseProposalCount("Less than 5 proposal")).toBe(2)
  })

  test("returns null when no match", () => {
    expect(parseProposalCount("No proposals info here")).toBeNull()
  })

  test("returns null on empty string", () => {
    expect(parseProposalCount("")).toBeNull()
  })
})

// ---------- parsePostedAt ----------

describe("parsePostedAt", () => {
  const now = new Date("2026-07-19T12:00:00.000Z")

  test("posted X minutes ago", () => {
    const result = parsePostedAt("Posted 10 minutes ago", now)
    expect(result).toBe("2026-07-19T11:50:00.000Z")
  })

  test("posted 1 minute ago (singular)", () => {
    const result = parsePostedAt("Posted 1 minute ago", now)
    expect(result).toBe("2026-07-19T11:59:00.000Z")
  })

  test("posted X hours ago", () => {
    const result = parsePostedAt("Posted 2 hours ago", now)
    expect(result).toBe("2026-07-19T10:00:00.000Z")
  })

  test("hours ago without posted label", () => {
    const result = parsePostedAt("2 hours ago", now)
    expect(result).toBe("2026-07-19T10:00:00.000Z")
  })

  test("posted 1 hour ago (singular)", () => {
    const result = parsePostedAt("Posted 1 hour ago", now)
    expect(result).toBe("2026-07-19T11:00:00.000Z")
  })

  test("posted X days ago", () => {
    const result = parsePostedAt("Posted 3 days ago", now)
    expect(result).toBe("2026-07-16T12:00:00.000Z")
  })

  test("posted X weeks ago", () => {
    const result = parsePostedAt("Posted 2 weeks ago", now)
    expect(result).toBe("2026-07-05T12:00:00.000Z")
  })

  test("posted X months ago", () => {
    const result = parsePostedAt("Posted 1 month ago", now)
    expect(result).toBe("2026-06-19T12:00:00.000Z")
  })

  test("posted yesterday", () => {
    const result = parsePostedAt("Posted yesterday", now)
    expect(result).toBe("2026-07-18T12:00:00.000Z")
  })

  test("case insensitive yesterday", () => {
    const result = parsePostedAt("POSTED YESTERDAY", now)
    expect(result).toBe("2026-07-18T12:00:00.000Z")
  })

  test("returns null when no match", () => {
    expect(parsePostedAt("No time info here", now)).toBeNull()
  })

  test("returns null on empty string", () => {
    expect(parsePostedAt("", now)).toBeNull()
  })
})

// ---------- parseBudget ----------

describe("parseBudget", () => {
  test("hourly range", () => {
    const result = parseBudget("$40 - $60/hr")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(50)
  })

  test("hourly range with spaces around hr", () => {
    const result = parseBudget("$25 - $50 /hr")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(38) // Math.round((25+50)/2) = 38
  })

  test("single hourly value", () => {
    const result = parseBudget("$75/hr")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(75)
  })

  test("hourly rate with range and label", () => {
    const result = parseBudget("Budget: $12 - $15 hourly rate")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(14)
  })

  test("hourly rate with per hour wording", () => {
    const result = parseBudget("Rate: $12 to $15 per hour")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(14)
  })

  test("fixed-price with budget label", () => {
    const result = parseBudget("Fixed-price Budget: $1,500")
    expect(result.budgetType).toBe("fixed")
    expect(result.budgetAmount).toBe(1500)
  })

  test("does not confuse total spent with budget", () => {
    const result = parseBudget("$25k+ total spent")
    expect(result.budgetType).toBe("unknown")
    expect(result.budgetAmount).toBeNull()
  })

  test("est. budget label", () => {
    const result = parseBudget("Est. Budget $2,000 fixed-price")
    expect(result.budgetType).toBe("fixed")
    expect(result.budgetAmount).toBe(2000)
  })

  test("budget with decimal", () => {
    const result = parseBudget("Budget: $99.50 Fixed-price")
    expect(result.budgetType).toBe("fixed")
    expect(result.budgetAmount).toBe(99.5)
  })

  test("hourly wins over budget wording", () => {
    const result = parseBudget("Budget: $12-$15 hourly")
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(14)
  })

  test("returns unknown when no budget found", () => {
    const result = parseBudget("No budget information here")
    expect(result.budgetType).toBe("unknown")
    expect(result.budgetAmount).toBeNull()
  })

  test("returns unknown on empty string", () => {
    const result = parseBudget("")
    expect(result.budgetType).toBe("unknown")
    expect(result.budgetAmount).toBeNull()
  })
})

// ---------- parsePaymentVerified ----------

describe("parsePaymentVerified", () => {
  test("payment verified", () => {
    expect(parsePaymentVerified("Payment verified")).toBe("yes")
  })

  test("payment unverified", () => {
    expect(parsePaymentVerified("Payment unverified")).toBe("no")
  })

  test("payment not verified", () => {
    expect(parsePaymentVerified("Payment not verified")).toBe("no")
  })

  test("case insensitive", () => {
    expect(parsePaymentVerified("PAYMENT VERIFIED")).toBe("yes")
  })

  test("returns unknown when no match", () => {
    expect(parsePaymentVerified("No payment info")).toBe("unknown")
  })

  test("returns unknown on empty string", () => {
    expect(parsePaymentVerified("")).toBe("unknown")
  })
})

// ---------- parseClientRating ----------

describe("parseClientRating", () => {
  test("X.XX of 5", () => {
    expect(parseClientRating("4.92 of 5 reviews")).toBe(4.92)
  })

  test("X/5 format", () => {
    expect(parseClientRating("Rating: 4.5/5")).toBe(4.5)
  })

  test("X/5 format without label", () => {
    expect(parseClientRating("4.5/5")).toBe(4.5)
  })

  test("whole number", () => {
    expect(parseClientRating("5 of 5")).toBe(5)
  })

  test("low rating", () => {
    expect(parseClientRating("2.1 of 5")).toBe(2.1)
  })

  test("returns null when out of range", () => {
    expect(parseClientRating("6.0 of 5")).toBeNull()
  })

  test("returns null when no match", () => {
    expect(parseClientRating("No rating here")).toBeNull()
  })

  test("returns null on empty string", () => {
    expect(parseClientRating("")).toBeNull()
  })
})

// ---------- parseTotalClientSpend ----------

describe("parseTotalClientSpend", () => {
  test("$25k+ total spent", () => {
    expect(parseTotalClientSpend("$25k+ total spent")).toBe(25000)
  })

  test("$1M spent", () => {
    expect(parseTotalClientSpend("$1M spent")).toBe(1000000)
  })

  test("plain number spent", () => {
    expect(parseTotalClientSpend("$5,000 total spent")).toBe(5000)
  })

  test("with decimal and suffix", () => {
    expect(parseTotalClientSpend("$2.5k spent")).toBe(2500)
  })

  test("returns null when no match", () => {
    expect(parseTotalClientSpend("No spend info")).toBeNull()
  })

  test("returns null on empty string", () => {
    expect(parseTotalClientSpend("")).toBeNull()
  })
})

// ---------- parseClientHireCount ----------

describe("parseClientHireCount", () => {
  test("18 hires", () => {
    expect(parseClientHireCount("18 hires")).toBe(18)
  })

  test("1 hire (singular)", () => {
    expect(parseClientHireCount("1 hire")).toBe(1)
  })

  test("1,000 hires with comma", () => {
    expect(parseClientHireCount("1,000 hires")).toBe(1000)
  })

  test("returns null when no match", () => {
    expect(parseClientHireCount("No hire info")).toBeNull()
  })

  test("returns null on empty string", () => {
    expect(parseClientHireCount("")).toBeNull()
  })
})

// ---------- detectOffPlatformFlag ----------

describe("detectOffPlatformFlag", () => {
  test("detects skype", () => {
    expect(detectOffPlatformFlag("Contact me on Skype")).toBe(true)
  })

  test("detects telegram", () => {
    expect(detectOffPlatformFlag("Reach out via Telegram")).toBe(true)
  })

  test("detects whatsapp", () => {
    expect(detectOffPlatformFlag("Message me on WhatsApp")).toBe(true)
  })

  test("detects pay outside", () => {
    expect(detectOffPlatformFlag("We pay outside the platform")).toBe(true)
  })

  test("detects outside upwork", () => {
    expect(detectOffPlatformFlag("Work outside Upwork")).toBe(true)
  })

  test("detects direct payment", () => {
    expect(detectOffPlatformFlag("We do direct payment")).toBe(true)
  })

  test("detects wire transfer", () => {
    expect(detectOffPlatformFlag("Payment via wire transfer")).toBe(true)
  })

  test("returns false for clean text", () => {
    expect(detectOffPlatformFlag("We need a React developer for a web app")).toBe(false)
  })

  test("returns false on empty string", () => {
    expect(detectOffPlatformFlag("")).toBe(false)
  })
})

// ---------- detectUnpaidTestFlag ----------

describe("detectUnpaidTestFlag", () => {
  test("detects unpaid test", () => {
    expect(detectUnpaidTestFlag("Complete an unpaid test first")).toBe(true)
  })

  test("detects free sample", () => {
    expect(detectUnpaidTestFlag("Provide a free sample of your work")).toBe(true)
  })

  test("detects work for free", () => {
    expect(detectUnpaidTestFlag("You must work for free initially")).toBe(true)
  })

  test("returns false for clean text", () => {
    expect(detectUnpaidTestFlag("We have a paid trial period")).toBe(false)
  })

  test("returns false on empty string", () => {
    expect(detectUnpaidTestFlag("")).toBe(false)
  })
})
