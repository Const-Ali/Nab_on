import { tones } from '../../app-lib'
import type { Status } from '../../types'
import { badgeBase, badgeTones } from '../ui'

export function Badge({ status, tone }: { status: Status; tone?: string }) {
  return <span className={`${badgeBase} ${badgeTones[tone ?? tones[status]] ?? badgeTones.slate}`}>{status}</span>
}
