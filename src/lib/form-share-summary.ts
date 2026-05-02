import { supabase } from '@/lib/supabase'
import { fetchSuperAdminIdentitySets } from '@/lib/staff'
import type { FormField, SubmissionValue } from '@/types/database'

interface ShareableForm {
  id: string
  title: string
}

interface SubmissionRow {
  id: string
  user_id: string
  status: 'draft' | 'submitted' | 'update_requested'
  submitted_at: string | null
  created_at: string
  updated_at: string
}

interface FormStartRow {
  user_id: string
  started_at: string
}

interface ProfileRow {
  id: string
  full_name: string | null
  email: string
}

export interface CompletedSummaryEntry {
  name: string
  completedAt: string
  completedDateLabel: string
}

export interface PendingSummaryEntry {
  displayName: string | null
  email: string | null
  statusLabel: 'In progress' | 'Not started'
  activityDateLabel: string | null
}

export interface FormShareSummary {
  accountCount: number
  startedCount: number
  completedCount: number
  pendingCount: number
  startRate: number | null
  completionRate: number | null
  generatedAt: string
  generatedAtLabel: string
  completedEntries: CompletedSummaryEntry[]
  completedEntriesPreview: CompletedSummaryEntry[]
  completedEntriesOverflow: number
  pendingEntries: PendingSummaryEntry[]
  pendingEntriesPreview: PendingSummaryEntry[]
  pendingEntriesOverflow: number
  isApproximateHistorical: boolean
  shareText: string
}

const FULL_NAME_PATTERN = /\b(full[\s-]*name|name in full)\b/i
const FIRST_NAME_PATTERN = /\b(first|given|forename)\b/i
const MIDDLE_NAME_PATTERN = /\b(middle|other names?)\b/i
const LAST_NAME_PATTERN = /\b(surname|last|family)\b/i
const EMAIL_PATTERN = /\bemail\b/i

function trimValue(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function formatSummaryDate(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value)

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function resolveCompletionTimestamp(submission: SubmissionRow): string {
  return submission.submitted_at ?? submission.updated_at ?? submission.created_at
}

function resolveSubmittedName(
  fields: FormField[],
  values: SubmissionValue[],
): string | null {
  const fieldMap = new Map(fields.map((field) => [field.id, field]))
  const labeledValues = values.map((value) => ({
    label: fieldMap.get(value.field_id)?.label ?? '',
    value: trimValue(value.value),
  }))

  const fullNameValue = labeledValues.find(
    (entry) => FULL_NAME_PATTERN.test(entry.label) && entry.value,
  )?.value
  if (fullNameValue) {
    return fullNameValue
  }

  const firstName = labeledValues.find(
    (entry) => FIRST_NAME_PATTERN.test(entry.label) && entry.value,
  )?.value
  const middleNames = labeledValues
    .filter((entry) => MIDDLE_NAME_PATTERN.test(entry.label) && entry.value)
    .map((entry) => entry.value)
  const lastName = labeledValues.find(
    (entry) => LAST_NAME_PATTERN.test(entry.label) && entry.value,
  )?.value

  const composedName = [firstName, ...middleNames, lastName]
    .filter(Boolean)
    .join(' ')
    .trim()

  if (composedName) {
    return composedName
  }

  return null
}

function resolveSubmittedEmail(
  fields: FormField[],
  values: SubmissionValue[],
): string | null {
  const fieldMap = new Map(fields.map((field) => [field.id, field]))
  const labeledValues = values.map((value) => ({
    label: fieldMap.get(value.field_id)?.label ?? '',
    value: trimValue(value.value),
  }))

  const fieldEmail = labeledValues.find(
    (entry) => EMAIL_PATTERN.test(entry.label) && entry.value,
  )?.value

  return fieldEmail || null
}

function resolveNameFromSubmissionValues(
  fields: FormField[],
  values: SubmissionValue[],
  profile: ProfileRow | null,
): string | null {
  return (
    trimValue(profile?.full_name)
    || resolveSubmittedName(fields, values)
    || trimValue(profile?.email)
    || resolveSubmittedEmail(fields, values)
    || null
  )
}

function resolveEmailFromSubmissionValues(
  fields: FormField[],
  values: SubmissionValue[],
  profile: ProfileRow | null,
): string | null {
  return resolveSubmittedEmail(fields, values) || trimValue(profile?.email) || null
}

function formatPendingEntry(entry: PendingSummaryEntry): string {
  const identity = entry.displayName && entry.email
    ? `${entry.displayName} <${entry.email}>`
    : entry.email || entry.displayName || 'Unknown account'

  return entry.activityDateLabel
    ? `${identity} (${entry.statusLabel}, ${entry.activityDateLabel})`
    : `${identity} (${entry.statusLabel})`
}

function buildShareText(formTitle: string, summary: FormShareSummary): string {
  const lines = [
    `${formTitle} summary`,
    `As of: ${summary.generatedAtLabel}`,
    `Accounts: ${summary.accountCount}`,
    `Started: ${summary.startedCount}${summary.startRate !== null ? ` (${summary.startRate}% start rate)` : ''}`,
    `Completed: ${summary.completedCount}${summary.completionRate !== null ? ` (${summary.completionRate}% completion rate)` : ''}`,
    `Pending: ${summary.pendingCount}`,
  ]

  if (summary.completedEntriesPreview.length > 0) {
    lines.push('', 'Completed accounts:')
    for (const entry of summary.completedEntriesPreview) {
      lines.push(`- ${entry.name} (${entry.completedDateLabel})`)
    }

    if (summary.completedEntriesOverflow > 0) {
      lines.push(`- and ${summary.completedEntriesOverflow} more`)
    }
  }

  if (summary.pendingEntriesPreview.length > 0) {
    lines.push('', 'Pending accounts:')
    for (const entry of summary.pendingEntriesPreview) {
      lines.push(`- ${formatPendingEntry(entry)}`)
    }

    if (summary.pendingEntriesOverflow > 0) {
      lines.push(`- and ${summary.pendingEntriesOverflow} more`)
    }
  }

  return lines.join('\n')
}

export async function fetchFormShareSummary(
  form: ShareableForm,
  isSuperAdmin: boolean,
): Promise<FormShareSummary> {
  const superAdminIdentitySets = await fetchSuperAdminIdentitySets(isSuperAdmin)

  const [membersRes, startsRes, submissionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email'),
    supabase.from('form_starts').select('user_id, started_at').eq('form_id', form.id),
    supabase
      .from('submissions')
      .select('id, user_id, status, submitted_at, created_at, updated_at')
      .eq('form_id', form.id),
  ])

  if (membersRes.error) throw new Error(membersRes.error.message)
  if (startsRes.error) throw new Error(startsRes.error.message)
  if (submissionsRes.error) throw new Error(submissionsRes.error.message)

  const accountProfiles = ((membersRes.data ?? []) as ProfileRow[]).filter(
    (profile) => !superAdminIdentitySets.userIds.has(profile.id),
  )
  const profileMap = new Map(accountProfiles.map((profile) => [profile.id, profile]))

  const formStartUserIds = new Set(
    ((startsRes.data ?? []) as FormStartRow[])
      .map((start) => start.user_id)
      .filter((userId) => !superAdminIdentitySets.userIds.has(userId)),
  )

  const visibleSubmissions = ((submissionsRes.data ?? []) as SubmissionRow[]).filter(
    (submission) => !superAdminIdentitySets.userIds.has(submission.user_id),
  )

  const allAccountUserIds = new Set(accountProfiles.map((profile) => profile.id))
  for (const userId of formStartUserIds) {
    allAccountUserIds.add(userId)
  }
  for (const submission of visibleSubmissions) {
    allAccountUserIds.add(submission.user_id)
  }

  const startedUserIds = new Set(formStartUserIds)
  for (const submission of visibleSubmissions) {
    startedUserIds.add(submission.user_id)
  }

  const completedSubmissions = visibleSubmissions.filter(
    (submission) => submission.status === 'submitted',
  )
  const incompleteSubmissions = visibleSubmissions.filter(
    (submission) => submission.status !== 'submitted',
  )

  const historicalApproximation = completedSubmissions.some(
    (submission) => !formStartUserIds.has(submission.user_id),
  ) || visibleSubmissions.some(
    (submission) =>
      submission.status === 'update_requested' && !formStartUserIds.has(submission.user_id),
  )

  const completedSubmissionIds = completedSubmissions.map((submission) => submission.id)
  const incompleteSubmissionIds = incompleteSubmissions.map((submission) => submission.id)
  const relevantSubmissionIds = Array.from(
    new Set([...completedSubmissionIds, ...incompleteSubmissionIds]),
  )

  const [fieldsRes, valuesRes] = await Promise.all([
    relevantSubmissionIds.length > 0
      ? supabase
          .from('form_fields')
          .select('*')
          .eq('form_id', form.id)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    relevantSubmissionIds.length > 0
      ? supabase
          .from('submission_values')
          .select('*')
          .in('submission_id', relevantSubmissionIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (fieldsRes.error) throw new Error(fieldsRes.error.message)
  if (valuesRes.error) throw new Error(valuesRes.error.message)
  const completedUserIds = new Set(
    completedSubmissions.map((submission) => submission.user_id),
  )

  const fields = (fieldsRes.data ?? []) as FormField[]
  const submissionValues = (valuesRes.data ?? []) as SubmissionValue[]
  const valuesBySubmissionId = new Map<string, SubmissionValue[]>()

  for (const value of submissionValues) {
    const bucket = valuesBySubmissionId.get(value.submission_id) ?? []
    bucket.push(value)
    valuesBySubmissionId.set(value.submission_id, bucket)
  }

  const completedEntriesByUserId = new Map<string, CompletedSummaryEntry>()
  if (completedSubmissions.length > 0) {
    for (const submission of completedSubmissions) {
      const displayName = resolveNameFromSubmissionValues(
        fields,
        valuesBySubmissionId.get(submission.id) ?? [],
        profileMap.get(submission.user_id) ?? null,
      )

      if (displayName) {
        const completedAt = resolveCompletionTimestamp(submission)
        const nextEntry: CompletedSummaryEntry = {
          name: displayName,
          completedAt,
          completedDateLabel: formatSummaryDate(completedAt),
        }
        const existingEntry = completedEntriesByUserId.get(submission.user_id)

        if (!existingEntry || new Date(completedAt) > new Date(existingEntry.completedAt)) {
          completedEntriesByUserId.set(submission.user_id, nextEntry)
        }
      }
    }
  }

  const latestIncompleteSubmissionByUserId = new Map<string, SubmissionRow>()
  for (const submission of incompleteSubmissions) {
    const existing = latestIncompleteSubmissionByUserId.get(submission.user_id)
    const submissionTimestamp = new Date(submission.updated_at).getTime()
    const existingTimestamp = existing ? new Date(existing.updated_at).getTime() : -Infinity

    if (!existing || submissionTimestamp > existingTimestamp) {
      latestIncompleteSubmissionByUserId.set(submission.user_id, submission)
    }
  }

  const completedEntries = Array.from(completedEntriesByUserId.values()).sort((left, right) =>
    new Date(right.completedAt).getTime() - new Date(left.completedAt).getTime()
      || left.name.localeCompare(right.name),
  )
  const completedEntriesPreview = completedEntries.slice(0, 10)
  const completedEntriesOverflow = Math.max(completedEntries.length - completedEntriesPreview.length, 0)
  const accountCount = allAccountUserIds.size
  const pendingCount = Math.max(accountCount - completedUserIds.size, 0)
  const generatedAt = new Date().toISOString()

  const pendingEntries: PendingSummaryEntry[] = Array.from(allAccountUserIds)
    .filter((userId) => !completedUserIds.has(userId))
    .map((userId) => {
      const profile = profileMap.get(userId) ?? null
      const incompleteSubmission = latestIncompleteSubmissionByUserId.get(userId)
      const submissionValuesForUser = incompleteSubmission
        ? valuesBySubmissionId.get(incompleteSubmission.id) ?? []
        : []

      const submittedName = resolveSubmittedName(fields, submissionValuesForUser)
      const displayName = trimValue(profile?.full_name) || submittedName || null
      const email = resolveEmailFromSubmissionValues(
        fields,
        submissionValuesForUser,
        profile,
      )

      if (startedUserIds.has(userId)) {
        const activityAt = incompleteSubmission?.updated_at
          || incompleteSubmission?.created_at
          || ((startsRes.data ?? []) as FormStartRow[])
            .find((start) => start.user_id === userId)?.started_at
          || null

        return {
          displayName,
          email,
          statusLabel: 'In progress' as const,
          activityDateLabel: activityAt ? formatSummaryDate(activityAt) : null,
        }
      }

      return {
        displayName,
        email,
        statusLabel: 'Not started' as const,
        activityDateLabel: null,
      }
    })
    .sort((left, right) => {
      if (left.statusLabel !== right.statusLabel) {
        return left.statusLabel === 'In progress' ? -1 : 1
      }

      return (left.email || left.displayName || '').localeCompare(
        right.email || right.displayName || '',
      )
    })

  const pendingEntriesPreview = pendingEntries.slice(0, 10)
  const pendingEntriesOverflow = Math.max(pendingEntries.length - pendingEntriesPreview.length, 0)

  const summary: FormShareSummary = {
    accountCount,
    startedCount: startedUserIds.size,
    completedCount: completedUserIds.size,
    pendingCount,
    startRate:
      accountCount > 0
        ? Math.round((startedUserIds.size / accountCount) * 100)
        : null,
    completionRate:
      accountCount > 0
        ? Math.round((completedUserIds.size / accountCount) * 100)
        : null,
    generatedAt,
    generatedAtLabel: formatSummaryDate(generatedAt),
    completedEntries,
    completedEntriesPreview,
    completedEntriesOverflow,
    pendingEntries,
    pendingEntriesPreview,
    pendingEntriesOverflow,
    isApproximateHistorical: historicalApproximation,
    shareText: '',
  }

  return {
    ...summary,
    shareText: buildShareText(form.title, summary),
  }
}
