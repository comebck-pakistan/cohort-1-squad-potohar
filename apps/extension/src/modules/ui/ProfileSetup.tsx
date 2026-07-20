import React, { useState } from "react"

import { SKILL_TAXONOMY } from "@shared/skillTaxonomy"
import type { FreelancerProfile } from "../profile/profileTypes"

interface Props {
  onSave: (profile: FreelancerProfile) => void
  initialProfile?: FreelancerProfile | null
}

export const ProfileSetup: React.FC<Props> = ({ onSave, initialProfile }) => {
  const [profile, setProfile] = useState<FreelancerProfile>(
    initialProfile || {
      name: "",
      skills: [],
      yearsExp: 1,
      targetRateHourly: null,
      targetRateProject: null,
      portfolioUrls: [],
      bio: ""
    }
  )

  const [error, setError] = useState("")

  const handleSave = () => {
    if (!profile.name || profile.skills.length === 0 || !profile.targetRateHourly) {
      setError("Name, at least one skill, and target hourly rate are required.")
      return
    }
    setError("")
    onSave(profile)
  }

  const toggleSkill = (skill: string) => {
    setProfile((p) => ({
      ...p,
      skills: p.skills.includes(skill)
        ? p.skills.filter((s) => s !== skill)
        : [...p.skills, skill]
    }))
  }

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-bold text-slate-800">
        {initialProfile ? "Edit Profile" : "Set Up Profile"}
      </h2>
      <p className="text-sm text-slate-600 mb-2">
        This info powers your score and AI proposals. It stays in your
        browser.
      </p>

      {error && <div className="text-red-500 text-xs mb-1">{error}</div>}

      <input
        className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        placeholder="Your Name"
        value={profile.name}
        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
      />

      <div className="flex gap-2">
        <input
          className="border border-slate-300 rounded px-2 py-1.5 text-sm w-1/2 outline-none focus:border-blue-500"
          placeholder="Hourly Rate ($)"
          type="number"
          value={profile.targetRateHourly || ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              targetRateHourly: Number(e.target.value) || null
            })
          }
        />
        <input
          className="border border-slate-300 rounded px-2 py-1.5 text-sm w-1/2 outline-none focus:border-blue-500"
          placeholder="Project Rate ($)"
          type="number"
          value={profile.targetRateProject || ""}
          onChange={(e) =>
            setProfile({
              ...profile,
              targetRateProject: Number(e.target.value) || null
            })
          }
        />
      </div>

      <input
        className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        placeholder="Years of Experience"
        type="number"
        value={profile.yearsExp}
        onChange={(e) =>
          setProfile({ ...profile, yearsExp: Number(e.target.value) || 1 })
        }
      />

      <div>
        <div className="text-xs font-semibold text-slate-700 mb-1">Select Skills</div>
        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-1 border border-slate-200 rounded">
          {SKILL_TAXONOMY.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`cursor-pointer px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                profile.skills.includes(skill) ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}>
              {skill}
            </button>
          ))}
        </div>
      </div>

      <textarea
        className="border border-slate-300 rounded px-2 py-1.5 text-sm min-h-16 outline-none focus:border-blue-500"
        placeholder="Short bio or positioning"
        value={profile.bio}
        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
      />

      <input
        className="border border-slate-300 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-500"
        placeholder="Portfolio URLs, comma-separated"
        value={profile.portfolioUrls.join(", ")}
        onChange={(e) =>
          setProfile({
            ...profile,
            portfolioUrls: e.target.value
              .split(",")
              .map((url) => url.trim())
              .filter(Boolean)
          })
        }
      />

      <button
        className="mt-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-1.5 rounded transition-colors"
        onClick={handleSave}>
        {initialProfile ? "Update Profile" : "Save Profile"}
      </button>
    </div>
  )
}
