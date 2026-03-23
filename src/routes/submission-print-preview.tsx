import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { ArrowLeft, AlertCircle, Loader2, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { SchoolLogo } from '@/components/shared/SchoolLogo'
import { useInlineImagePreview } from '@/hooks/use-inline-image-preview'
import {
  buildSubmissionPrintSections,
  formatPrintDate,
  getSubmissionStatusLabel,
  isImageUrl,
  resolveSubmissionPhotoField,
} from '@/lib/submission-print'
import type { SubmissionPrintItem } from '@/lib/submission-print'
import type { Form, FormField, Submission, SubmissionValue } from '@/types/database'

const APPLE_FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif'

function PrintPhotoPreview({
  url,
  alt,
}: {
  url: string
  alt: string
}) {
  const { previewUrl, isLoading } = useInlineImagePreview(url)

  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={alt}
        className="print-photo-image"
      />
    )
  }

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#8e8e93]">
        Preparing photo
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-4 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#8e8e93]">
        Open original file
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 text-[12px] font-medium text-gcu-maroon underline underline-offset-4"
      >
        View uploaded image
      </a>
    </div>
  )
}

function PrintMediaItemPreview({
  item,
}: {
  item: SubmissionPrintItem
}) {
  const fileUrl = item.fileUrl ?? ''
  const canPreviewInline = Boolean(fileUrl) && isImageUrl(fileUrl)
  const { previewUrl, isLoading } = useInlineImagePreview(
    canPreviewInline ? fileUrl : null,
  )

  if (!item.fileUrl) {
    return (
      <p className="mt-1.5 text-[15px] italic text-[#8e8e93]">
        —
      </p>
    )
  }

  if (!canPreviewInline) {
    return (
      <a
        href={fileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex break-all text-sm font-medium text-gcu-maroon underline underline-offset-4"
      >
        {item.fileName ?? fileUrl}
      </a>
    )
  }

  if (previewUrl) {
    return (
      <div className="print-section-image-frame">
        <div className="print-section-image-inner">
          <img
            src={previewUrl}
            alt={item.field.label}
            className="print-field-image"
          />
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="print-section-image-frame">
        <div className="print-section-image-inner flex items-center justify-center text-center text-[11px] font-medium uppercase tracking-[0.14em] text-[#8e8e93]">
          Preparing image
        </div>
      </div>
    )
  }

  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3 inline-flex break-all text-sm font-medium text-gcu-maroon underline underline-offset-4"
    >
      {item.fileName ?? fileUrl}
    </a>
  )
}

export default function SubmissionPrintPreviewPage() {
  const { submissionId, formId, id } = useParams<{
    submissionId: string
    formId: string
    id: string
  }>()
  const navigate = useNavigate()
  const { user } = useAuth()

  const isAdminPreview = Boolean(formId && id)
  const resolvedSubmissionId = id ?? submissionId

  const [submission, setSubmission] = useState<Submission | null>(null)
  const [form, setForm] = useState<Form | null>(null)
  const [fields, setFields] = useState<FormField[]>([])
  const [values, setValues] = useState<SubmissionValue[]>([])
  const [submitterLabel, setSubmitterLabel] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!resolvedSubmissionId) return
    if (!isAdminPreview && !user) return

    let cancelled = false

    async function fetchPrintPreviewData() {
      setIsLoading(true)
      setError(null)

      try {
        let submissionQuery = supabase
          .from('submissions')
          .select('*')
          .eq('id', resolvedSubmissionId)

        if (!isAdminPreview && user) {
          submissionQuery = submissionQuery.eq('user_id', user.id)
        }

        const { data: submissionData, error: submissionError } =
          await submissionQuery.single()

        if (submissionError || !submissionData) {
          throw new Error(submissionError?.message ?? 'Submission not found')
        }

        if (formId && submissionData.form_id !== formId) {
          throw new Error('Submission does not belong to this form')
        }

        const effectiveFormId = formId ?? submissionData.form_id

        const [formRes, fieldsRes, valuesRes, profileRes] = await Promise.all([
          supabase.from('forms').select('*').eq('id', effectiveFormId).single(),
          supabase
            .from('form_fields')
            .select('*')
            .eq('form_id', effectiveFormId)
            .order('sort_order', { ascending: true }),
          supabase
            .from('submission_values')
            .select('*')
            .eq('submission_id', submissionData.id),
          supabase
            .from('profiles')
            .select('full_name, email')
            .eq('id', submissionData.user_id)
            .maybeSingle(),
        ])

        if (formRes.error || !formRes.data) {
          throw new Error(formRes.error?.message ?? 'Form not found')
        }

        if (fieldsRes.error) {
          throw new Error(fieldsRes.error.message)
        }

        if (valuesRes.error) {
          throw new Error(valuesRes.error.message)
        }

        if (!cancelled) {
          setSubmission(submissionData)
          setForm(formRes.data)
          setFields(fieldsRes.data ?? [])
          setValues(valuesRes.data ?? [])
          setSubmitterLabel(
            profileRes.data?.full_name ||
              profileRes.data?.email ||
              submissionData.user_id,
          )
        }
      } catch (err) {
        if (!cancelled) {
          const nextError =
            err instanceof Error ? err.message : 'Failed to load print preview'
          setError(nextError)
          toast.error(nextError)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    void fetchPrintPreviewData()

    return () => {
      cancelled = true
    }
  }, [formId, isAdminPreview, resolvedSubmissionId, user])

  const photoField = useMemo(
    () => resolveSubmissionPhotoField(fields, values),
    [fields, values],
  )

  const sections = useMemo(
    () =>
      buildSubmissionPrintSections(fields, values, {
        excludeFieldId: photoField?.field.id,
      }),
    [fields, values, photoField?.field.id],
  )

  const answeredCount = useMemo(
    () =>
      values.filter((value) => Boolean(value.file_url || value.value?.trim()))
        .length,
    [values],
  )

  const backHref =
    isAdminPreview && formId && id
      ? `/admin/forms/${formId}/submissions/${id}`
      : resolvedSubmissionId
        ? `/submissions/${resolvedSubmissionId}`
        : '/dashboard'

  function handlePrint() {
    window.print()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7]">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !submission || !form) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f5f7] px-6">
        <div className="max-w-md rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <AlertCircle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Unable to open preview</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {error ?? 'The print preview could not be loaded.'}
          </p>
          <Button
            type="button"
            className="mt-5"
            onClick={() => navigate(backHref)}
          >
            Back
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="print-preview-shell min-h-screen bg-[#f5f5f7] text-[#1d1d1f]"
      style={{ fontFamily: APPLE_FONT_STACK }}
    >
      <style>{`
        .print-preview-sheet {
          width: min(100%, 210mm);
        }

        .print-sheet-divider {
          height: 1px;
          background: #d1d1d6;
        }

        .print-sheet-header {
          display: grid;
          gap: 1.25rem;
          margin-top: 1.25rem;
        }

        .print-sheet-brand {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .print-sheet-title {
          margin-top: 1rem;
          font-size: 28px;
          line-height: 1.08;
          font-weight: 600;
          letter-spacing: -0.02em;
          color: #111111;
        }

        .print-sheet-meta-line {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 0.5rem;
          margin-top: 0.75rem;
          font-size: 13px;
          color: #6e6e73;
        }

        .print-sheet-meta-strip {
          display: grid;
          gap: 0;
          margin-top: 1.25rem;
          border-top: 1px solid rgba(17, 17, 17, 0.08);
          border-bottom: 1px solid rgba(17, 17, 17, 0.08);
        }

        .print-photo-frame {
          overflow: hidden;
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 8px;
          background: #f7f7f8;
        }

        .print-photo-inner {
          display: flex;
          align-items: center;
          justify-content: center;
          aspect-ratio: 4 / 5;
          padding: 0.75rem;
        }

        .print-photo-image,
        .print-field-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }

        .print-section-block {
          margin-top: 2rem;
        }

        .print-section-heading {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .print-section-grid {
          display: grid;
          gap: 0.75rem;
        }

        .print-section-item {
          padding: 0.75rem 0;
        }

        .print-section-image-frame {
          margin-top: 0.75rem;
          overflow: hidden;
          border: 1px solid rgba(17, 17, 17, 0.08);
          border-radius: 8px;
          background: #f7f7f8;
          padding: 0.75rem;
        }

        .print-section-image-inner {
          display: flex;
          min-height: 8rem;
          align-items: center;
          justify-content: center;
        }

        @media (min-width: 640px) {
          .print-sheet-meta-strip {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .print-sheet-header {
            grid-template-columns: minmax(0, 1fr) 156px;
          }

          .print-section-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @page {
          size: A4 portrait;
          margin: 0;
        }

        @media print {
          html,
          body {
            background: #ffffff !important;
          }

          body,
          body * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          .print-preview-chrome,
          .print-preview-sidebar {
            display: none !important;
          }

          .print-preview-shell,
          .print-preview-main,
          .print-preview-stage {
            background: #ffffff !important;
            padding: 0 !important;
            margin: 0 !important;
          }

          .print-preview-sheet {
            width: 210mm !important;
            max-width: none !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
          }

          .print-preview-sheet-inner {
            padding: 10mm 10mm 12mm !important;
          }

          .print-sheet-divider {
            background: #d1d1d6 !important;
          }

          .print-sheet-header {
            display: grid !important;
            grid-template-columns: minmax(0, 1fr) 42mm !important;
            gap: 5mm !important;
            margin-top: 5mm !important;
          }

          .print-sheet-brand {
            display: flex !important;
            align-items: center !important;
            gap: 3mm !important;
          }

          .print-sheet-title {
            margin-top: 4mm !important;
            font-size: 20pt !important;
            line-height: 1.12 !important;
            letter-spacing: -0.02em !important;
            color: #111111 !important;
          }

          .print-sheet-meta-line {
            display: flex !important;
            flex-wrap: wrap !important;
            align-items: center !important;
            gap: 2mm !important;
            margin-top: 3mm !important;
            font-size: 10.5pt !important;
            color: #6e6e73 !important;
          }

          .print-sheet-meta-strip {
            display: grid !important;
            grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
            gap: 0 !important;
            margin-top: 4mm !important;
            border-top: 1px solid rgba(17, 17, 17, 0.08) !important;
            border-bottom: 1px solid rgba(17, 17, 17, 0.08) !important;
          }

          .print-photo-frame,
          .print-section-image-frame {
            border: 1px solid rgba(17, 17, 17, 0.08) !important;
            border-radius: 0 !important;
            background: #f7f7f8 !important;
            overflow: hidden !important;
          }

          .print-photo-inner {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            aspect-ratio: 4 / 5 !important;
            padding: 3mm !important;
          }

          .print-photo-image,
          .print-field-image {
            max-width: 100% !important;
            max-height: 100% !important;
            object-fit: contain !important;
          }

          .print-section-block {
            margin-top: 6mm !important;
          }

          .print-section-heading {
            display: flex !important;
            align-items: center !important;
            gap: 4mm !important;
            margin-bottom: 2mm !important;
          }

          .print-section-grid {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 3mm !important;
          }

          .print-section-item {
            padding: 3mm 0 !important;
            break-inside: avoid !important;
          }

          .print-section-image-frame {
            margin-top: 3mm !important;
            padding: 3mm !important;
          }

          .print-section-image-inner {
            display: flex !important;
            min-height: 28mm !important;
            align-items: center !important;
            justify-content: center !important;
          }
        }
      `}</style>

      <header className="print-preview-chrome sticky top-0 z-40 border-b border-black/5 bg-white/82 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate(backHref)}
              className="inline-flex size-11 items-center justify-center rounded-full border border-black/8 bg-white text-[#1d1d1f] shadow-sm transition-colors hover:bg-black/[0.03]"
              aria-label="Back"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#8e8e93]">
                Print Preview
              </p>
              <h1 className="text-base font-semibold text-[#111111]">
                {form.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden rounded-full border border-black/8 bg-white px-4 py-2 text-sm text-[#6e6e73] shadow-sm md:block">
              A4 portrait
            </div>
            <Button
              type="button"
              onClick={handlePrint}
              className="rounded-full bg-[#111111] px-5 text-white hover:bg-black"
            >
              <Printer className="mr-2 size-4" />
              Print or Save PDF
            </Button>
          </div>
        </div>
      </header>

      <main className="print-preview-main mx-auto max-w-7xl px-5 py-6">
        <section className="print-preview-stage">
          <article className="print-preview-sheet mx-auto w-full max-w-[210mm] overflow-hidden rounded-[12px] border border-black/8 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.14)]">
            <div className="print-preview-sheet-inner px-5 py-5 sm:px-6 sm:py-6">
              <div className="print-sheet-divider" />

              <header className="print-sheet-header">
                <div>
                  <div className="print-sheet-brand">
                    <SchoolLogo className="size-10 rounded-[8px] border border-black/8 bg-white p-1 shadow-sm" />
                    <div>
                      <p className="text-[12px] font-medium text-[#6e6e73]">
                        Government College Umuahia
                      </p>
                      <p className="mt-0.5 text-[13px] text-[#6e6e73]">
                        GCU Class of Jan 1973
                      </p>
                    </div>
                  </div>

                  <h2 className="print-sheet-title">
                    {form.title}
                  </h2>

                  <div className="print-sheet-meta-line">
                    <span className="font-medium text-[#111111]">
                      {getSubmissionStatusLabel(submission.status)}
                    </span>
                    <span className="text-black/20">•</span>
                    <span>{submitterLabel}</span>
                    <span className="text-black/20">•</span>
                    <span>{formatPrintDate(submission.submitted_at)}</span>
                  </div>
                </div>

                <div className="print-photo-frame">
                <div className="print-photo-inner">
                  {photoField?.fileUrl ? (
                      <PrintPhotoPreview
                        url={photoField.fileUrl}
                        alt={photoField.field.label}
                      />
                    ) : (
                      <div className="text-center text-xs font-medium uppercase tracking-[0.18em] text-[#8e8e93]">
                        No photo
                      </div>
                    )}
                  </div>
                </div>
              </header>

              <section className="print-sheet-meta-strip">
                <div className="border-b border-black/8 px-0 py-3 sm:border-b-0 sm:border-r">
                  <p className="text-[12px] font-medium text-[#6e6e73]">
                    Created
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#111111]">
                    {formatPrintDate(submission.created_at)}
                  </p>
                </div>
                <div className="border-b border-black/8 px-0 py-3 sm:border-b-0 sm:border-r sm:px-4">
                  <p className="text-[12px] font-medium text-[#6e6e73]">
                    Updated
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#111111]">
                    {formatPrintDate(submission.updated_at)}
                  </p>
                </div>
                <div className="px-0 py-3 sm:px-4">
                  <p className="text-[12px] font-medium text-[#6e6e73]">
                    Fields
                  </p>
                  <p className="mt-1 text-[15px] font-medium text-[#111111]">
                    {answeredCount} of {fields.length}
                  </p>
                </div>
              </section>

              <div className="space-y-0">
                  {sections.map((section) => (
                    <section key={section.key} className="print-section-block">
                      <div className="print-section-heading">
                        <h3 className="text-[17px] font-semibold tracking-[-0.02em] text-[#111111]">
                          {section.title}
                        </h3>
                        <div className="h-px flex-1 bg-black/8" />
                      </div>

                      <div className="print-section-grid">
                        {section.items.map((item) => (
                          <div
                            key={item.field.id}
                            className={`print-section-item ${
                              item.isWide ? 'sm:col-span-2' : ''
                            }`}
                          >
                            <p className="text-[12px] font-medium text-[#6e6e73]">
                              {item.field.label}
                            </p>

                            {item.fileUrl ? (
                              <PrintMediaItemPreview item={item} />
                            ) : item.displayValue ? (
                              <p className="mt-1.5 whitespace-pre-wrap break-words text-[16px] leading-7 text-[#111111]">
                                {item.displayValue}
                              </p>
                            ) : (
                              <p className="mt-1.5 text-[15px] italic text-[#8e8e93]">
                                —
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <footer className="mt-8 pt-2 text-[11px] text-[#8e8e93]">
                  {formatPrintDate(new Date().toISOString())}
                </footer>
              </div>
          </article>
        </section>
      </main>
    </div>
  )
}
