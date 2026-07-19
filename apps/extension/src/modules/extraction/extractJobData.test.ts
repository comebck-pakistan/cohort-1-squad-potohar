import { describe, expect, test, vi } from "vitest"

import { extractJobData } from "./extractJobData"

describe("extractJobData", () => {
  test("extracts hourly job fields", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-07-19T12:00:00.000Z"))

    const result = extractJobData(`
      Payment verified
      4.92 of 5 reviews
      $40 - $60/hr
      10 to 15 proposals
      Posted 2 hours ago
      $25k+ total spent
      18 hires
      Need React and Node.js help.
    `)

    expect(result.paymentVerified).toBe("yes")
    expect(result.clientRating).toBe(4.92)
    expect(result.budgetType).toBe("hourly")
    expect(result.budgetAmount).toBe(50)
    expect(result.proposalCount).toBe(12)
    expect(result.totalClientSpend).toBe(25000)
    expect(result.clientHireCount).toBe(18)
    expect(result.postedAt).toBe("2026-07-19T10:00:00.000Z")

    vi.useRealTimers()
  })

  test("extracts fixed job fields and red flags", () => {
    const result = extractJobData(`
      Payment unverified
      Fixed-price
      Budget: $1,500
      Less than 5 proposals
      Posted yesterday
      Please contact me on Telegram for a free sample.
    `)

    expect(result.paymentVerified).toBe("no")
    expect(result.budgetType).toBe("fixed")
    expect(result.budgetAmount).toBe(1500)
    expect(result.proposalCount).toBe(2)
    expect(result.offPlatformFlag).toBe(true)
    expect(result.unpaidTestFlag).toBe(true)
  })
})
