import { jalaliJdn, jalaliToday, normalizeDigits } from './shared'

export type DocumentStage = {
  id: string
  label: string
  description: string
  tone: string
}

export type DocumentWorkflow = {
  version: 1
  startStageId: string
  stages: DocumentStage[]
}

export type DocumentHistoryEvent = {
  id: string
  type: 'created' | 'updated' | 'stage' | 'response'
  message: string
  createdAt: string
  createdBy: string
  ts: number
  fromStageId?: string
  toStageId?: string
}

export type DocumentRecord = {
  id: string
  title: string
  topic: string
  center: string
  referenceNumber: string
  sentDate: string
  responseDate: string
  centerResponse: string
  outcome: string
  assignee: string
  notes: string
  stageId: string
  history: DocumentHistoryEvent[]
  createdAt: string
  createdBy: string
  createdByName: string
  updatedAt: string
  updatedBy: string
  ts: number
}

export type DocumentDraft = Pick<DocumentRecord,
  'id' | 'title' | 'topic' | 'center' | 'referenceNumber' | 'sentDate' | 'responseDate' |
  'centerResponse' | 'outcome' | 'assignee' | 'notes' | 'stageId'
> & Partial<Pick<DocumentRecord, 'history' | 'createdAt' | 'createdBy' | 'createdByName' | 'updatedAt' | 'updatedBy' | 'ts'>>

export const documentTones = ['blue', 'indigo', 'purple', 'amber', 'orange', 'green', 'cyan', 'red', 'pink', 'slate'] as const

export const defaultDocumentWorkflow: DocumentWorkflow = {
  version: 1,
  startStageId: 'registered',
  stages: [
    { id: 'registered', label: 'ثبت اولیه', description: '', tone: 'blue' },
    { id: 'ready-to-send', label: 'آمادهٔ ارسال', description: '', tone: 'indigo' },
    { id: 'sent-to-center', label: 'ارسال به مرکز', description: '', tone: 'cyan' },
    { id: 'waiting-response', label: 'در انتظار پاسخ مرکز', description: '', tone: 'amber' },
    { id: 'response-received', label: 'پاسخ دریافت شد', description: '', tone: 'green' },
    { id: 'closed', label: 'مختومه', description: '', tone: 'slate' },
  ],
}

export function normalizeDocumentWorkflow(input: unknown): DocumentWorkflow {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaultDocumentWorkflow
  const raw = input as Partial<DocumentWorkflow>
  if (raw.version !== 1 || !Array.isArray(raw.stages) || raw.stages.length === 0) return defaultDocumentWorkflow
  const stages = raw.stages
    .filter((stage): stage is DocumentStage => Boolean(stage && typeof stage === 'object' && !Array.isArray(stage)))
    .map((stage, index) => ({
      id: typeof stage.id === 'string' ? stage.id : `stage-${index + 1}`,
      label: typeof stage.label === 'string' ? stage.label : '',
      description: typeof stage.description === 'string' ? stage.description : '',
      tone: documentTones.includes(stage.tone as typeof documentTones[number]) ? stage.tone : 'slate',
    }))
    .filter(stage => stage.id && stage.label)
  if (stages.length === 0) return defaultDocumentWorkflow
  const startStageId = typeof raw.startStageId === 'string' && stages.some(stage => stage.id === raw.startStageId)
    ? raw.startStageId
    : stages[0].id
  return { version: 1, startStageId, stages }
}

export function normalizeDocumentRecord(input: unknown, workflow: DocumentWorkflow): DocumentRecord | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return null
  const raw = input as Partial<DocumentRecord>
  if (typeof raw.id !== 'string' || typeof raw.title !== 'string') return null
  const stageId = typeof raw.stageId === 'string' && workflow.stages.some(stage => stage.id === raw.stageId)
    ? raw.stageId
    : workflow.startStageId
  return {
    id: raw.id,
    title: raw.title,
    topic: typeof raw.topic === 'string' ? raw.topic : '',
    center: typeof raw.center === 'string' ? raw.center : '',
    referenceNumber: typeof raw.referenceNumber === 'string' ? raw.referenceNumber : '',
    sentDate: typeof raw.sentDate === 'string' ? raw.sentDate : '',
    responseDate: typeof raw.responseDate === 'string' ? raw.responseDate : '',
    centerResponse: typeof raw.centerResponse === 'string' ? raw.centerResponse : '',
    outcome: typeof raw.outcome === 'string' ? raw.outcome : '',
    assignee: typeof raw.assignee === 'string' ? raw.assignee : '',
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    stageId,
    history: Array.isArray(raw.history)
      ? raw.history.filter((event): event is DocumentHistoryEvent => Boolean(event && typeof event === 'object' && typeof event.id === 'string' && typeof event.message === 'string'))
      : [],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : '',
    createdBy: typeof raw.createdBy === 'string' ? raw.createdBy : '',
    createdByName: typeof raw.createdByName === 'string' ? raw.createdByName : '',
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : '',
    updatedBy: typeof raw.updatedBy === 'string' ? raw.updatedBy : '',
    ts: typeof raw.ts === 'number' ? raw.ts : 0,
  }
}

export function documentDurationDays(document: Pick<DocumentRecord, 'sentDate' | 'responseDate'>, today = jalaliToday()): number | null {
  const parse = (value: string): number | null => {
    const match = normalizeDigits(value.trim()).match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/)
    if (!match) return null
    try {
      return jalaliJdn(Number(match[1]), Number(match[2]), Number(match[3]))
    } catch {
      return null
    }
  }
  const sent = parse(document.sentDate)
  const end = parse(document.responseDate) ?? parse(today)
  if (sent === null || end === null || end < sent) return null
  return end - sent
}

export function blankDocumentDraft(stageId: string, id: string): DocumentDraft {
  return {
    id,
    title: '',
    topic: '',
    center: '',
    referenceNumber: '',
    sentDate: '',
    responseDate: '',
    centerResponse: '',
    outcome: '',
    assignee: '',
    notes: '',
    stageId,
  }
}
