import type {
  DecisionResult,
  ExtractedJobData,
  FreelancerProfile
} from "./decisionTypes"

export function calculateScore(
  jobData: ExtractedJobData,
  profile: FreelancerProfile
): DecisionResult {
  if (jobData.offPlatformFlag) {
    return {
      score: 0,
      decision: "Skip",
      reason:
        "Requests off-platform payment/contact - against ToS, common scam pattern"
    }
  }

  if (jobData.unpaidTestFlag) {
    return {
      score: 0,
      decision: "Skip",
      reason: "Requires unpaid test work - against ToS"
    }
  }

  const wordCount = countWords(jobData.rawDescription)
  const targetRate =
    jobData.budgetType === "hourly"
      ? profile.targetRateHourly
      : profile.targetRateProject

  if (
    targetRate &&
    jobData.budgetAmount &&
    jobData.budgetAmount > 2 * targetRate &&
    wordCount < 40
  ) {
    return {
      score: 0,
      decision: "Skip",
      reason:
        "Pay rate far above market + vague description - likely too good to be true"
    }
  }

  const matchedKeywords = countMatchedSkills(jobData.rawDescription, profile)
  const clientQualityScore = calculateClientQualityScore(jobData)
  const competitionScore = calculateCompetitionScore(jobData)
  const budgetScore = calculateBudgetScore(jobData, targetRate)
  const scopeClarityScore = calculateScopeClarityScore(
    wordCount,
    matchedKeywords
  )
  const skillMatchScore = calculateSkillMatchScore(matchedKeywords, profile)

  const finalScore =
    (30 * clientQualityScore +
      25 * competitionScore +
      20 * budgetScore +
      15 * scopeClarityScore +
      10 * skillMatchScore) /
    100

  const score = Math.round(finalScore)
  const decision = getDecision(score)
  const factors = {
    clientQuality: clientQualityScore,
    competition: competitionScore,
    budget: budgetScore,
    scopeClarity: scopeClarityScore,
    skillMatch: skillMatchScore
  }

  return {
    score,
    decision,
    reason: getReason(decision, factors),
    factors
  }
}

function calculateClientQualityScore(jobData: ExtractedJobData): number {
  let score = 0

  if (jobData.paymentVerified === "yes") score += 50
  if (jobData.paymentVerified === "unknown") score += 25

  if (jobData.clientRating === null) {
    score += 10
  } else if (jobData.clientRating >= 4.5) {
    score += 50
  } else if (jobData.clientRating >= 3) {
    score += 30
  } else {
    score += 10
  }

  if (jobData.totalClientSpend !== null && jobData.clientHireCount !== null) {
    if (jobData.totalClientSpend > 1000 && jobData.clientHireCount > 0) {
      score += 10
    }

    if (jobData.totalClientSpend > 1000 && jobData.clientHireCount === 0) {
      score -= 10
    }
  }

  return clampScore(score)
}

function calculateCompetitionScore(jobData: ExtractedJobData): number {
  if (jobData.proposalCount === null || jobData.postedAt === null) return 50

  const postedDate = new Date(jobData.postedAt)
  if (Number.isNaN(postedDate.getTime())) return 50

  const hoursSincePosted =
    (Date.now() - postedDate.getTime()) / (1000 * 60 * 60)
  if (hoursSincePosted <= 0) return 50

  const proposalsPerHour = jobData.proposalCount / hoursSincePosted

  if (proposalsPerHour < 1) return 100
  if (proposalsPerHour <= 4) return 60
  return 20
}

function calculateBudgetScore(
  jobData: ExtractedJobData,
  targetRate: number | null
): number {
  if (jobData.budgetAmount === null || targetRate === null) return 50

  const adjustedBudget = jobData.budgetAmount * 1.3
  if (adjustedBudget >= targetRate) return 100
  if (adjustedBudget >= targetRate * 0.8) return 60
  return 20
}

function calculateScopeClarityScore(
  wordCount: number,
  matchedKeywords: number
): number {
  if (wordCount >= 100 && matchedKeywords >= 2) return 100
  if ((wordCount >= 50 && wordCount < 100) || matchedKeywords === 1) return 60
  return 20
}

function calculateSkillMatchScore(
  matchedKeywords: number,
  profile: FreelancerProfile
): number {
  if (profile.skills.length === 0) return 0

  const overlapRatio = matchedKeywords / profile.skills.length
  if (overlapRatio >= 0.4) return 100
  if (overlapRatio >= 0.15) return 60
  return 20
}

function countMatchedSkills(
  description: string,
  profile: FreelancerProfile
): number {
  const text = description.toLowerCase()

  return profile.skills.filter((skill) => text.includes(skill.toLowerCase()))
    .length
}

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function getDecision(score: number): DecisionResult["decision"] {
  if (score >= 70) return "Apply"
  if (score >= 40) return "Caution"
  return "Skip"
}

function getReason(
  decision: DecisionResult["decision"],
  factors: NonNullable<DecisionResult["factors"]>
): string {
  const factorLabels: Record<keyof typeof factors, string> = {
    clientQuality: "Client quality is the weakest factor.",
    competition: "High competition is the weakest factor.",
    budget: "Budget realism is the weakest factor.",
    scopeClarity: "Scope clarity is the weakest factor.",
    skillMatch: "Skill match is the weakest factor."
  }

  const lowestFactor = (Object.keys(factors) as (keyof typeof factors)[]).reduce(
    (lowest, factor) => (factors[factor] < factors[lowest] ? factor : lowest)
  )

  if (decision === "Skip") {
    return factorLabels[lowestFactor]
  }

  return factorLabels[lowestFactor] || "All factors look decent."
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score))
}
