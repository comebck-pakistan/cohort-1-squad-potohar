import type { ExtractedJobData } from "@shared/types"
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

export function extractJobData(pageText: string): ExtractedJobData {
  const { budgetAmount, budgetType } = parseBudget(pageText)

  return {
    sourcePlatform: "upwork",
    rawDescription: pageText,
    clientRating: parseClientRating(pageText),
    paymentVerified: parsePaymentVerified(pageText),
    proposalCount: parseProposalCount(pageText),
    budgetAmount,
    budgetType,
    postedAt: parsePostedAt(pageText),
    totalClientSpend: parseTotalClientSpend(pageText),
    clientHireCount: parseClientHireCount(pageText),
    offPlatformFlag: detectOffPlatformFlag(pageText),
    unpaidTestFlag: detectUnpaidTestFlag(pageText),
    extractionMethod: "auto_scrape"
  }
}
