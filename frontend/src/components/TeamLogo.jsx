import { useState } from 'react'
import { getTeamAbbreviation, getTeamInitials } from '../data/teamLogos'

const CDN_SIZES = {
  nba: 'https://a.espncdn.com/i/teamlogos/nba/500',
  nfl: 'https://a.espncdn.com/i/teamlogos/nfl/500',
}

function resolveLogoUrl(sport, team, name) {
  const league = sport?.toLowerCase()
  if (!team?.abbreviation && !name) return null
  const abbrev = (team?.abbreviation || getTeamAbbreviation(league, name) || '').toLowerCase()
  if (!abbrev || !CDN_SIZES[league]) return null
  return `${CDN_SIZES[league]}/${abbrev}.png`
}

export default function TeamLogo({ sport, team, name }) {
  const displayName = team?.displayName || team?.name || name || ''
  const logoFromApi = team?.logo || null
  const [src, setSrc] = useState(logoFromApi || resolveLogoUrl(sport, team, displayName) || null)
  const [failed, setFailed] = useState(!src)

  if (failed || !src) {
    return (
      <span className="team-logo team-logo--fallback" aria-hidden="true">
        {getTeamInitials(displayName)}
      </span>
    )
  }

  return (
    <img
      className="team-logo"
      src={src}
      alt={displayName}
      loading="lazy"
      onError={() => {
        setFailed(true)
        setSrc(null)
      }}
    />
  )
}
