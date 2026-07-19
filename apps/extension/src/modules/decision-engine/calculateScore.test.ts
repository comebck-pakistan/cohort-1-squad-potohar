import { describe, expect, test } from "vitest"

import type {
  ExtractedJobData,
  FreelancerProfile
} from "./decisionTypes"
import { calculateScore } from "./calculateScore"

describe("Decision Engine", () => {
  const baseProfile: FreelancerProfile = {
    name: "Test Dev",
    skills: ["React", "TypeScript", "Node.js"],
    yearsExp: 5,
    targetRateHourly: 50,
    targetRateProject: 1000,
    portfolioUrls: [],
    bio: ""
  }

  const baseJob: ExtractedJobData = {
    sourcePlatform: "upwork",
    rawDescription: "This is a basic description with some words in it.",
    clientRating: 4.8,
    paymentVerified: "yes",
    proposalCount: 5,
    budgetAmount: 60,
    budgetType: "hourly",
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    totalClientSpend: 5000,
    clientHireCount: 10,
    offPlatformFlag: false,
    unpaidTestFlag: false,
    extractionMethod: "auto_scrape"
  }

  test("Hard disqualifier: off-platform", () => {
    const result = calculateScore(
      { ...baseJob, offPlatformFlag: true },
      baseProfile
    )
    expect(result.decision).toBe("Skip")
    expect(result.score).toBe(0)
    expect(result.reason).toContain("off-platform")
  })

  test("Hard disqualifier: unpaid test", () => {
    const result = calculateScore(
      { ...baseJob, unpaidTestFlag: true },
      baseProfile
    )
    expect(result.decision).toBe("Skip")
    expect(result.score).toBe(0)
    expect(result.reason).toContain("unpaid test")
  })

  test("Weighted score calculation for good match", () => {
    const result = calculateScore(
      {
        ...baseJob,
        rawDescription:
          "Looking for an expert in React and Node.js to build a TypeScript app. We need a long term partner."
      },
      baseProfile
    )

    expect(result.score).toBeGreaterThanOrEqual(70)
    expect(result.decision).toBe("Apply")
  })

  test("Low score yields Skip", () => {
    const result = calculateScore(
      {
        ...baseJob,
        clientRating: 2,
        paymentVerified: "no",
        proposalCount: 50,
        postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        budgetAmount: 10,
        rawDescription: "Fix bugs."
      },
      baseProfile
    )

    expect(result.score).toBeLessThan(40)
    expect(result.decision).toBe("Skip")
  })
})
