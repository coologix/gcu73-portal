import type { FormField, Submission, SubmissionValue } from '@/types/database'
import {
  isHeicLikeUrl,
  isInlinePreviewableImageUrl,
} from '@/lib/media-files'

export interface SubmissionPrintItem {
  field: FormField
  value: SubmissionValue | null
  displayValue: string
  fileUrl: string | null
  fileName: string | null
  isWide: boolean
}

export interface SubmissionPrintSection {
  key: 'identity' | 'contact' | 'documents' | 'additional'
  title: string
  items: SubmissionPrintItem[]
}

const SECTION_TITLES: Record<SubmissionPrintSection['key'], string> = {
  identity: 'Identity',
  contact: 'Contact',
  documents: 'Documents',
  additional: 'Additional Information',
}

export function getUserSubmissionPrintPreviewPath(
  submissionId: string,
): string {
  return `/submissions/${submissionId}/print`
}

export function getAdminSubmissionPrintPreviewPath(
  formId: string,
  submissionId: string,
): string {
  return `/admin/forms/${formId}/submissions/${submissionId}/print`
}

export function formatPrintDate(value: string | null): string {
  if (!value) return 'Not available'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function getSubmissionStatusLabel(
  status: Submission['status'],
): string {
  return status.replace('_', ' ')
}

export function isImageUrl(url: string): boolean {
  return isInlinePreviewableImageUrl(url) || isHeicLikeUrl(url)
}

function getSectionKey(
  field: FormField,
): SubmissionPrintSection['key'] {
  const label = field.label.toLowerCase()

  if (
    field.field_type === 'media' ||
    /passport|photo|picture|document|upload|file/.test(label)
  ) {
    return 'documents'
  }

  if (/email|phone|mobile|address|contact|city|state|country/.test(label)) {
    return 'contact'
  }

  if (
    /surname|other names|first name|middle name|full name|birth|gender|nin|bvn|nationality|marital/.test(
      label,
    )
  ) {
    return 'identity'
  }

  return 'additional'
}

function getValueMap(
  values: SubmissionValue[],
): Map<string, SubmissionValue> {
  return new Map(values.map((value) => [value.field_id, value]))
}

export function resolveSubmissionPhotoField(
  fields: FormField[],
  values: SubmissionValue[],
): SubmissionPrintItem | null {
  const valueMap = getValueMap(values)

  const mediaItems = fields
    .map((field) => {
      const value = valueMap.get(field.id) ?? null
      return {
        field,
        value,
        displayValue: value?.value ?? '',
        fileUrl: value?.file_url ?? null,
        fileName: value?.file_name ?? null,
        isWide: false,
      } satisfies SubmissionPrintItem
    })
    .filter(
      (item) =>
        item.field.field_type === 'media' &&
        Boolean(item.fileUrl) &&
        isImageUrl(item.fileUrl ?? ''),
    )

  if (mediaItems.length === 0) {
    return null
  }

  const preferredItem = mediaItems.find((item) => {
    const label = item.field.label.toLowerCase()
    return (
      label.includes('passport') ||
      label.includes('photo') ||
      label.includes('picture') ||
      label.includes('headshot')
    )
  })

  return preferredItem ?? mediaItems[0]
}

export function buildSubmissionPrintSections(
  fields: FormField[],
  values: SubmissionValue[],
  options: { excludeFieldId?: string } = {},
): SubmissionPrintSection[] {
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)
  const valueMap = getValueMap(values)

  const sections = new Map<
    SubmissionPrintSection['key'],
    SubmissionPrintItem[]
  >([
    ['identity', []],
    ['contact', []],
    ['documents', []],
    ['additional', []],
  ])

  for (const field of sortedFields) {
    if (field.id === options.excludeFieldId) {
      continue
    }

    const value = valueMap.get(field.id) ?? null
    const item: SubmissionPrintItem = {
      field,
      value,
      displayValue: value?.value ?? '',
      fileUrl: value?.file_url ?? null,
      fileName: value?.file_name ?? null,
      isWide: field.field_type === 'textarea',
    }

    sections.get(getSectionKey(field))?.push(item)
  }

  return Array.from(sections.entries())
    .map(([key, items]) => ({
      key,
      title: SECTION_TITLES[key],
      items,
    }))
    .filter((section) => section.items.length > 0)
}
