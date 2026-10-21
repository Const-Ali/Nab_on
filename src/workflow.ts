import type { Person } from './types'

export type ChecklistRule = { id: string; label: string }
export type ChecklistMark = { done: boolean; checkedBy?: string; checkedAt?: string }
export type WorkflowStage = {
  id: string
  label: string
  tone: string
  nextStageIds: string[]
  checklist: ChecklistRule[]
  isFinal?: boolean
  archived?: boolean
  metric?: 'active' | 'review' | 'rejected' | 'completed'
}
export type WorkflowConfig = { version: 1; startStageId: string; stages: WorkflowStage[] }

export const allowedWorkflowTones = ['blue', 'indigo', 'purple', 'amber', 'orange', 'green', 'cyan', 'red', 'pink', 'slate'] as const

export const defaultWorkflowConfig: WorkflowConfig = {
  version: 1,
  startStageId: 'request',
  stages: [
    { id: 'request', label: 'درخواست پرونده', tone: 'blue', nextStageIds: ['personnel'], checklist: [] },
    { id: 'personnel', label: 'پرونده پرسنلی', tone: 'indigo', nextStageIds: ['ordinary-card'], checklist: [] },
    { id: 'ordinary-card', label: 'کارت عادی', tone: 'purple', nextStageIds: ['three-page'], checklist: [] },
    { id: 'three-page', label: 'سه‌برگی عادی', tone: 'purple', nextStageIds: ['complete-info'], checklist: [] },
    { id: 'complete-info', label: 'تکمیل اطلاعات', tone: 'amber', nextStageIds: ['active'], checklist: [] },
    { id: 'active', label: 'پرونده فعال', tone: 'green', nextStageIds: ['center-sent'], checklist: [], metric: 'active' },
    { id: 'center-sent', label: 'ارسال به مرکز', tone: 'cyan', nextStageIds: ['center-review'], checklist: [] },
    { id: 'center-review', label: 'بررسی مرکز', tone: 'orange', nextStageIds: ['approved', 'rejected'], checklist: [], metric: 'review' },
    { id: 'approved', label: 'تأیید شده', tone: 'green', nextStageIds: ['company-sent'], checklist: [] },
    { id: 'rejected', label: 'رد شده', tone: 'red', nextStageIds: ['complete-info'], checklist: [], metric: 'rejected' },
    { id: 'company-sent', label: 'ارسال به شرکت', tone: 'pink', nextStageIds: ['completed'], checklist: [] },
    { id: 'completed', label: 'پایان کار', tone: 'slate', nextStageIds: [], checklist: [], isFinal: true, metric: 'completed' },
  ],
}

export function normalizeWorkflowConfig(input: unknown): WorkflowConfig {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return defaultWorkflowConfig
  const raw = input as Partial<WorkflowConfig>
  if (raw.version !== 1 || !Array.isArray(raw.stages)) return defaultWorkflowConfig
  const stages = raw.stages.filter((stage): stage is WorkflowStage => Boolean(stage && typeof stage === 'object' && !Array.isArray(stage)))
  if (!stages.length) return defaultWorkflowConfig
  return {
    version: 1,
    startStageId: typeof raw.startStageId === 'string' ? raw.startStageId : defaultWorkflowConfig.startStageId,
    stages: stages.map(stage => ({
      id: typeof stage.id === 'string' ? stage.id : '',
      label: typeof stage.label === 'string' ? stage.label : '',
      tone: allowedWorkflowTones.includes(stage.tone as typeof allowedWorkflowTones[number]) ? stage.tone : 'slate',
      nextStageIds: Array.isArray(stage.nextStageIds) ? stage.nextStageIds.filter((id): id is string => typeof id === 'string') : [],
      checklist: Array.isArray(stage.checklist) ? stage.checklist.filter((rule): rule is ChecklistRule => Boolean(rule && typeof rule.id === 'string' && typeof rule.label === 'string')) : [],
      isFinal: Boolean(stage.isFinal),
      archived: Boolean(stage.archived),
      metric: stage.metric,
    })),
  }
}

export function activeStages(config: WorkflowConfig): WorkflowStage[] {
  return config.stages.filter(stage => !stage.archived)
}

export function stageById(config: WorkflowConfig, id: string | undefined): WorkflowStage | undefined {
  return config.stages.find(stage => stage.id === id)
}

export function stageIdForPerson(person: Person, config: WorkflowConfig): string {
  if (person.stageId && config.stages.some(stage => stage.id === person.stageId)) return person.stageId
  const matching = config.stages.find(stage => stage.label === person.status)
  if (matching) return matching.id
  const legacy = defaultWorkflowConfig.stages.find(stage => stage.label === person.status)
  return legacy?.id ?? config.startStageId
}

export function stageLabelForPerson(person: Person, config: WorkflowConfig): string {
  return stageById(config, stageIdForPerson(person, config))?.label ?? person.status
}

export function checklistMissing(stage: WorkflowStage, person: Person): ChecklistRule[] {
  const marked = person.stageChecklist?.[stage.id] ?? {}
  return stage.checklist.filter(rule => !marked[rule.id]?.done)
}

export function insertStageAfter(config: WorkflowConfig, afterId: string, stage: WorkflowStage): WorkflowConfig {
  const current = config.stages.findIndex(item => item.id === afterId)
  if (current < 0 || config.stages[current].archived) throw new Error('مرحلهٔ انتخاب‌شده در گردش‌کار فعال نیست.')
  const stages = config.stages.map(item => ({ ...item, nextStageIds: [...item.nextStageIds], checklist: [...item.checklist] }))
  const source = stages[current]
  const nextIds = [...source.nextStageIds]
  const wasFinal = Boolean(source.isFinal)
  const nextStage = { ...stage, nextStageIds: nextIds, archived: false, isFinal: wasFinal, metric: stage.metric ?? (wasFinal ? source.metric : undefined) }
  source.nextStageIds = [stage.id]
  source.isFinal = false
  if (wasFinal) delete source.metric
  stages.splice(current + 1, 0, nextStage)
  return { ...config, stages }
}

export function archiveStage(config: WorkflowConfig, stageId: string): WorkflowConfig {
  if (stageId === config.startStageId) throw new Error('مرحلهٔ آغازین را نمی‌توان حذف یا بایگانی کرد.')
  const target = config.stages.find(stage => stage.id === stageId)
  if (!target || target.archived) return config
  const stages = config.stages.map(stage => {
    if (stage.id === stageId) return { ...stage, archived: true }
    if (!stage.nextStageIds.includes(stageId)) return { ...stage, nextStageIds: [...stage.nextStageIds] }
    const nextStageIds = stage.nextStageIds.flatMap(nextId => nextId === stageId ? target.nextStageIds : [nextId])
    const uniqueNextIds = [...new Set(nextStageIds)]
    const becomesFinal = uniqueNextIds.length === 0 && Boolean(target.isFinal)
    return { ...stage, nextStageIds: uniqueNextIds, isFinal: becomesFinal, metric: becomesFinal ? target.metric ?? stage.metric : stage.metric }
  })
  return { ...config, stages }
}
