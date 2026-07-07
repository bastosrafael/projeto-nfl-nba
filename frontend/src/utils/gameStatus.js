export function isLiveStatus(status) {
  const normalized = String(status || '').trim().toLowerCase()

  return [
    'status_in_progress',
    'status_halftime',
    'in progress',
    'live',
    'halftime'
  ].includes(normalized)
}

export function isFinalStatus(status) {
  return String(status || '').toLowerCase().includes('final')
}

export function isScheduledStatus(status) {
  const normalized = String(status || '').toLowerCase()
  return normalized.includes('scheduled')
}
