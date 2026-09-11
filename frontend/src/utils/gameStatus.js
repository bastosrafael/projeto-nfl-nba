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
  const normalized = String(status || '').toLowerCase()
  return normalized.includes('final') || normalized.includes('completed') || normalized.includes('post')
}

export function isScheduledStatus(status) {
  const normalized = String(status || '').toLowerCase()
  return normalized.includes('scheduled')
}
