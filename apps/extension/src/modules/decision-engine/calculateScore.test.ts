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

  // ---------- Hard Disqualifiers ----------

  describe("Hard Disqualifiers", () => {
    test("off-platform flag -> Skip with score 0", () => {
      const result = calculateScore(
        { ...baseJob, offPlatformFlag: true },
        baseProfile
      )
      expect(result.decision).toBe("Skip")
      expect(result.score).toBe(0)
      expect(result.reason).toContain("off-platform")
    })

    test("unpaid test flag -> Skip with score 0", () => {
      const result = calculateScore(
        { ...baseJob, unpaidTestFlag: true },
        baseProfile
      )
      expect(result.decision).toBe("Skip")
      expect(result.score).toBe(0)
      expect(result.reason).toContain("unpaid test")
    })

    test("pay rate anomaly: budget > 2x target + vague description -> Skip", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 150, // > 2 * 50
          rawDescription: "Fix my website quickly please.", // < 40 words
          budgetType: "hourly"
        },
        baseProfile
      )
      expect(result.decision).toBe("Skip")
      expect(result.score).toBe(0)
      expect(result.reason).toContain("too good to be true")
    })

    test("pay rate anomaly does not trigger when description is long", () => {
      const longDescription = Array(50).fill("word").join(" ") + " React Node.js TypeScript"
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 150,
          rawDescription: longDescription,
          budgetType: "hourly"
        },
        baseProfile
      )
      // Should NOT be a hard skip — goes to weighted scoring
      expect(result.score).toBeGreaterThan(0)
    })

    test("pay rate anomaly does not trigger when budget is within 2x", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 90, // < 2 * 50
          rawDescription: "Fix bugs.",
          budgetType: "hourly"
        },
        baseProfile
      )
      expect(result.score).toBeGreaterThan(0)
    })

    test("off-platform checked before weighted scoring", () => {
      // Even with a perfect profile match, off-platform should be Skip
      const result = calculateScore(
        {
          ...baseJob,
          offPlatformFlag: true,
          clientRating: 5,
          paymentVerified: "yes",
          budgetAmount: 100
        },
        baseProfile
      )
      expect(result.decision).toBe("Skip")
      expect(result.score).toBe(0)
      expect(result.factors).toBeUndefined()
    })
  })

  // ---------- Weighted Scoring Thresholds ----------

  describe("Decision Thresholds", () => {
    test("score >= 70 -> Apply", () => {
      const result = calculateScore(
        {
          ...baseJob,
          rawDescription:
            "Looking for an expert in React and Node.js to build a TypeScript app. We need someone with strong frontend experience for a long-term contract building scalable web applications with modern best practices."
        },
        baseProfile
      )
      expect(result.score).toBeGreaterThanOrEqual(70)
      expect(result.decision).toBe("Apply")
    })

    test("low quality signals -> Skip (score < 40)", () => {
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

  // ---------- Client Quality Sub-Score ----------

  describe("Client Quality Sub-Score", () => {
    test("payment verified + high rating -> high client quality", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "yes",
          clientRating: 4.8,
          totalClientSpend: 5000,
          clientHireCount: 10
        },
        baseProfile
      )
      // 50 (verified) + 50 (rating 4.5+) + 10 (good spend/hire ratio) = 110 clamped to 100
      expect(result.factors!.clientQuality).toBe(100)
    })

    test("payment unverified + no rating -> low client quality", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "no",
          clientRating: null,
          totalClientSpend: null,
          clientHireCount: null
        },
        baseProfile
      )
      // 0 (unverified) + 10 (null rating) = 10
      expect(result.factors!.clientQuality).toBe(10)
    })

    test("payment unknown -> 25 for payment component", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "unknown",
          clientRating: 4.8,
          totalClientSpend: null,
          clientHireCount: null
        },
        baseProfile
      )
      // 25 (unknown) + 50 (high rating) = 75
      expect(result.factors!.clientQuality).toBe(75)
    })

    test("high spend but zero hires -> -10 nudge", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "yes",
          clientRating: 4.8,
          totalClientSpend: 5000,
          clientHireCount: 0
        },
        baseProfile
      )
      // 50 + 50 - 10 = 90
      expect(result.factors!.clientQuality).toBe(90)
    })

    test("medium rating (3-4.49) -> 30 for rating", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "yes",
          clientRating: 3.5,
          totalClientSpend: null,
          clientHireCount: null
        },
        baseProfile
      )
      // 50 + 30 = 80
      expect(result.factors!.clientQuality).toBe(80)
    })

    test("low rating (<3) -> 10 for rating", () => {
      const result = calculateScore(
        {
          ...baseJob,
          paymentVerified: "yes",
          clientRating: 2.5,
          totalClientSpend: null,
          clientHireCount: null
        },
        baseProfile
      )
      // 50 + 10 = 60
      expect(result.factors!.clientQuality).toBe(60)
    })
  })

  // ---------- Competition Sub-Score ----------

  describe("Competition Sub-Score", () => {
    test("low proposals per hour (<1) -> 100", () => {
      const result = calculateScore(
        {
          ...baseJob,
          proposalCount: 3,
          postedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString() // 5 hours ago
        },
        baseProfile
      )
      // 3 / 5 = 0.6 < 1 -> 100
      expect(result.factors!.competition).toBe(100)
    })

    test("medium proposals per hour (1-4) -> 60", () => {
      const result = calculateScore(
        {
          ...baseJob,
          proposalCount: 6,
          postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        baseProfile
      )
      // 6 / 2 = 3 -> 60
      expect(result.factors!.competition).toBe(60)
    })

    test("high proposals per hour (4+) -> 20", () => {
      const result = calculateScore(
        {
          ...baseJob,
          proposalCount: 20,
          postedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
        },
        baseProfile
      )
      // 20 / 1 = 20 -> 20
      expect(result.factors!.competition).toBe(20)
    })

    test("unknown proposal count -> 50 (neutral)", () => {
      const result = calculateScore(
        {
          ...baseJob,
          proposalCount: null,
          postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        baseProfile
      )
      expect(result.factors!.competition).toBe(50)
    })

    test("unknown posted time -> 50 (neutral)", () => {
      const result = calculateScore(
        {
          ...baseJob,
          proposalCount: 10,
          postedAt: null
        },
        baseProfile
      )
      expect(result.factors!.competition).toBe(50)
    })
  })

  // ---------- Budget Sub-Score ----------

  describe("Budget Sub-Score", () => {
    test("adjusted budget >= target -> 100", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 50, // 50 * 1.3 = 65 >= 50
          budgetType: "hourly"
        },
        baseProfile
      )
      expect(result.factors!.budget).toBe(100)
    })

    test("adjusted budget within 20% below target -> 60", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 33, // 33 * 1.3 = 42.9, target * 0.8 = 40 -> within range
          budgetType: "hourly"
        },
        baseProfile
      )
      expect(result.factors!.budget).toBe(60)
    })

    test("adjusted budget more than 20% below target -> 20", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 20, // 20 * 1.3 = 26 < 40 (target * 0.8)
          budgetType: "hourly"
        },
        baseProfile
      )
      expect(result.factors!.budget).toBe(20)
    })

    test("null budget -> 50 (neutral)", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: null
        },
        baseProfile
      )
      expect(result.factors!.budget).toBe(50)
    })

    test("null target rate -> 50 (neutral)", () => {
      const result = calculateScore(
        baseJob,
        { ...baseProfile, targetRateHourly: null }
      )
      expect(result.factors!.budget).toBe(50)
    })

    test("fixed budget uses project rate", () => {
      const result = calculateScore(
        {
          ...baseJob,
          budgetAmount: 1000, // 1000 * 1.3 = 1300 >= 1000
          budgetType: "fixed"
        },
        baseProfile
      )
      expect(result.factors!.budget).toBe(100)
    })
  })

  // ---------- Scope Clarity Sub-Score ----------

  describe("Scope Clarity Sub-Score", () => {
    test(">= 100 words + >= 2 keywords -> 100", () => {
      const longDescription =
        Array(100).fill("word").join(" ") + " React Node.js"
      const result = calculateScore(
        { ...baseJob, rawDescription: longDescription },
        baseProfile
      )
      expect(result.factors!.scopeClarity).toBe(100)
    })

    test("50-99 words -> 60", () => {
      const medDescription =
        Array(60).fill("word").join(" ") + " React"
      const result = calculateScore(
        { ...baseJob, rawDescription: medDescription },
        baseProfile
      )
      expect(result.factors!.scopeClarity).toBe(60)
    })

    test("exactly 1 keyword regardless of word count -> 60", () => {
      const shortWithKeyword = "Fix React bugs"
      const result = calculateScore(
        { ...baseJob, rawDescription: shortWithKeyword },
        baseProfile
      )
      expect(result.factors!.scopeClarity).toBe(60)
    })

    test("< 50 words + 0 keywords -> 20", () => {
      const result = calculateScore(
        { ...baseJob, rawDescription: "Fix my website." },
        baseProfile
      )
      expect(result.factors!.scopeClarity).toBe(20)
    })
  })

  // ---------- Skill Match Sub-Score ----------

  describe("Skill Match Sub-Score", () => {
    test("overlap >= 0.4 -> 100", () => {
      // 3 skills: React, TypeScript, Node.js. Need 2+ matched (0.67 ratio)
      const result = calculateScore(
        {
          ...baseJob,
          rawDescription: "We need React and TypeScript expertise"
        },
        baseProfile
      )
      expect(result.factors!.skillMatch).toBe(100)
    })

    test("overlap 0.15-0.39 -> 60", () => {
      // 1 out of 3 = 0.33
      const result = calculateScore(
        {
          ...baseJob,
          rawDescription: "We need a React developer for frontend work on a web application project"
        },
        baseProfile
      )
      expect(result.factors!.skillMatch).toBe(60)
    })

    test("overlap < 0.15 -> 20", () => {
      // 0 out of 3 = 0
      const result = calculateScore(
        {
          ...baseJob,
          rawDescription: "We need a WordPress developer for a blog"
        },
        baseProfile
      )
      expect(result.factors!.skillMatch).toBe(20)
    })

    test("empty skills -> 0", () => {
      const result = calculateScore(baseJob, {
        ...baseProfile,
        skills: []
      })
      expect(result.factors!.skillMatch).toBe(0)
    })
  })

  // ---------- Reason / Factors ----------

  describe("Reason reports lowest factor", () => {
    test("returns factors object with all 5 dimensions", () => {
      const result = calculateScore(baseJob, baseProfile)
      expect(result.factors).toBeDefined()
      expect(result.factors).toHaveProperty("clientQuality")
      expect(result.factors).toHaveProperty("competition")
      expect(result.factors).toHaveProperty("budget")
      expect(result.factors).toHaveProperty("scopeClarity")
      expect(result.factors).toHaveProperty("skillMatch")
    })

    test("reason string is non-empty for all decision types", () => {
      const applyResult = calculateScore(
        {
          ...baseJob,
          rawDescription:
            "Looking for an expert in React and Node.js to build a TypeScript app. We need someone with strong frontend experience for a long-term contract building scalable web applications."
        },
        baseProfile
      )
      expect(applyResult.reason.length).toBeGreaterThan(0)

      const skipResult = calculateScore(
        {
          ...baseJob,
          offPlatformFlag: true
        },
        baseProfile
      )
      expect(skipResult.reason.length).toBeGreaterThan(0)
    })
  })
})
