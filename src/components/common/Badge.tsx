import { tones } from '../../app-lib'
import type { Status } from '../../types'
import { badgeBase, badgeDot, badgeTones } from '../ui'

export function Badge({ status }: { status: Status }) { return <span className={`${badgeBase} ${badgeTones[tones[status]] ?? badgeTones.slate}`}><i className={badgeDot} />{status}</span> }
