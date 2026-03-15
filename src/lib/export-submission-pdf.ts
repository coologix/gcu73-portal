import type {
  Form,
  FormField,
  Submission,
  SubmissionValue,
} from '@/types/database'

interface ExportSubmissionToPDFOptions {
  form: Form
  fields: FormField[]
  submission: Submission
  values: SubmissionValue[]
}

const IMAGE_EXTENSION_PATTERN = /\.(avif|bmp|gif|jpe?g|png|svg|webp)$/i

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function isImageUrl(url: string): boolean {
  try {
    const pathname = new URL(url).pathname
    return IMAGE_EXTENSION_PATTERN.test(pathname)
  } catch {
    return IMAGE_EXTENSION_PATTERN.test(url)
  }
}

function formatDate(value: string | null): string {
  if (!value) return 'Not available'

  return new Date(value).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function sanitizeFileName(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || 'submission'
}

function resolvePhotoField(
  fields: FormField[],
  valueMap: Map<string, SubmissionValue>,
): { field: FormField; value: SubmissionValue } | null {
  const mediaFields = fields
    .map((field) => ({
      field,
      value: valueMap.get(field.id),
    }))
    .filter(
      (
        entry,
      ): entry is {
        field: FormField
        value: SubmissionValue
      } =>
        entry.field.field_type === 'media' &&
        Boolean(entry.value?.file_url) &&
        isImageUrl(entry.value.file_url ?? ''),
    )

  if (mediaFields.length === 0) {
    return null
  }

  const preferredPhoto = mediaFields.find(({ field }) => {
    const label = field.label.toLowerCase()
    return (
      label.includes('passport') ||
      label.includes('photo') ||
      label.includes('picture') ||
      label.includes('headshot')
    )
  })

  return preferredPhoto ?? mediaFields[0]
}

function buildFieldMarkup(
  field: FormField,
  submissionValue: SubmissionValue | undefined,
  photoFieldId?: string,
): string {
  let valueMarkup = '<span class="field-empty">Not provided</span>'
  const shouldSpanFullWidth = field.field_type === 'textarea'

  if (field.field_type === 'media') {
    if (field.id === photoFieldId && submissionValue?.file_url) {
      valueMarkup = '<span class="field-empty">Displayed in the header photo panel.</span>'
    } else if (submissionValue?.file_url) {
      const fileUrl = escapeHtml(submissionValue.file_url)
      const fileLabel = escapeHtml(
        submissionValue.file_name ?? 'Open uploaded file',
      )
      valueMarkup = `<a href="${fileUrl}" target="_blank" rel="noopener noreferrer">${fileLabel}</a>`
    }
  } else if (submissionValue?.value) {
    valueMarkup = escapeHtml(submissionValue.value)
  }

  return `
    <section class="field-card ${shouldSpanFullWidth ? 'field-card-wide' : ''}">
      <p class="field-label">${escapeHtml(field.label)}</p>
      <div class="field-value">${valueMarkup}</div>
    </section>
  `
}

function buildDocumentHtml({
  form,
  fields,
  submission,
  values,
}: ExportSubmissionToPDFOptions): string {
  const sortedFields = [...fields].sort((a, b) => a.sort_order - b.sort_order)
  const valueMap = new Map(values.map((value) => [value.field_id, value]))
  const photoField = resolvePhotoField(sortedFields, valueMap)
  const logoUrl = new URL('/school-logo.png', window.location.origin)
  const fileTitle = `${form.title} - completed form`

  const fieldMarkup = sortedFields
    .map((field) =>
      buildFieldMarkup(field, valueMap.get(field.id), photoField?.field.id),
    )
    .join('')

  const photoMarkup = photoField?.value.file_url
    ? `
        <aside class="photo-panel">
          <img src="${escapeHtml(photoField.value.file_url)}" alt="${escapeHtml(photoField.field.label)}" />
          <div class="photo-caption">${escapeHtml(photoField.field.label)}</div>
        </aside>
      `
    : `
        <aside class="photo-panel photo-panel-empty">
          <div class="photo-placeholder">No photo uploaded</div>
        </aside>
      `

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(fileTitle)}</title>
    <style>
      :root {
        color-scheme: light;
        --maroon: #6b1d1d;
        --maroon-dark: #451111;
        --gold: #b8932a;
        --brown: #7a4b3a;
        --cream: #f7f1ea;
        --cream-dark: #e8dbcf;
        --ink: #2f2220;
      }

      * {
        box-sizing: border-box;
      }

      @page {
        size: A4;
        margin: 0;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        background: #efe7de;
        color: var(--ink);
        font-family: "Segoe UI", Arial, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        padding: 0;
      }

      .sheet {
        width: 210mm;
        min-height: 297mm;
        margin: 0 auto;
        padding: 14mm;
        background: #ffffff;
      }

      .top-bar {
        height: 4mm;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--maroon), #9d2d2d, var(--gold));
      }

      .header {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 38mm;
        gap: 8mm;
        margin-top: 8mm;
        align-items: start;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 4mm;
      }

      .brand-logo {
        width: 16mm;
        height: 16mm;
        border-radius: 4mm;
        overflow: hidden;
        border: 1px solid var(--cream-dark);
        background: var(--cream);
        flex-shrink: 0;
      }

      .brand-logo img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .eyebrow {
        margin: 0 0 1.5mm;
        font-size: 11px;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--gold);
        font-weight: 700;
      }

      h1 {
        margin: 4mm 0 2mm;
        font-size: 25px;
        line-height: 1.15;
        color: var(--maroon-dark);
      }

      .subtitle {
        margin: 0;
        font-size: 13px;
        line-height: 1.6;
        color: var(--brown);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 4mm;
        margin-top: 8mm;
      }

      .meta-card {
        border: 1px solid var(--cream-dark);
        border-radius: 5mm;
        background: var(--cream);
        padding: 4mm;
      }

      .meta-label {
        margin: 0;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        color: var(--brown);
      }

      .meta-value {
        margin: 2mm 0 0;
        font-size: 13px;
        font-weight: 700;
        color: var(--maroon-dark);
      }

      .photo-panel {
        border: 1px solid var(--cream-dark);
        border-radius: 5mm;
        overflow: hidden;
        background: var(--cream);
      }

      .photo-panel img {
        display: block;
        width: 100%;
        aspect-ratio: 3 / 4;
        object-fit: cover;
        background: #ffffff;
      }

      .photo-caption,
      .photo-placeholder {
        padding: 3mm;
        font-size: 10px;
        text-align: center;
        color: var(--brown);
      }

      .photo-panel-empty {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 52mm;
      }

      .section-title {
        margin: 10mm 0 4mm;
        font-size: 15px;
        color: var(--maroon-dark);
      }

      .field-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 4mm;
      }

      .field-card {
        border: 1px solid var(--cream-dark);
        border-radius: 5mm;
        padding: 4mm;
        break-inside: avoid;
      }

      .field-card-wide {
        grid-column: 1 / -1;
      }

      .field-label {
        margin: 0 0 2mm;
        font-size: 11px;
        font-weight: 700;
        color: var(--brown);
      }

      .field-value {
        font-size: 13px;
        line-height: 1.6;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--ink);
      }

      .field-value a {
        color: var(--maroon);
        text-decoration: underline;
      }

      .field-empty {
        color: #8d756d;
        font-style: italic;
      }

      .footer {
        margin-top: 10mm;
        padding-top: 4mm;
        border-top: 1px solid var(--cream-dark);
        font-size: 11px;
        color: var(--brown);
      }

      @media print {
        body {
          background: #ffffff;
        }

        .sheet {
          margin: 0;
        }
      }

      @media screen and (max-width: 900px) {
        body {
          background: #ffffff;
        }

        .sheet {
          width: auto;
          min-height: auto;
          padding: 24px;
        }
      }
    </style>
  </head>
  <body>
    <main class="sheet">
      <div class="top-bar"></div>
      <header class="header">
        <section>
          <div class="brand">
            <div class="brand-logo">
              <img src="${escapeHtml(String(logoUrl))}" alt="Government College Umuahia logo" />
            </div>
            <div>
              <p class="eyebrow">Completed Form Export</p>
              <p class="subtitle">Government College Umuahia · GCU Class of Jan 1973</p>
            </div>
          </div>
          <h1>${escapeHtml(form.title)}</h1>
          <p class="subtitle">
            This completed form has been laid out for A4 export. The passport photo is shown in the top corner and the full submission appears below.
          </p>
          <div class="meta-grid">
            <article class="meta-card">
              <p class="meta-label">Status</p>
              <p class="meta-value">${escapeHtml(submission.status.replace('_', ' '))}</p>
            </article>
            <article class="meta-card">
              <p class="meta-label">Submitted</p>
              <p class="meta-value">${escapeHtml(formatDate(submission.submitted_at))}</p>
            </article>
            <article class="meta-card">
              <p class="meta-label">Last Updated</p>
              <p class="meta-value">${escapeHtml(formatDate(submission.updated_at))}</p>
            </article>
          </div>
        </section>
        ${photoMarkup}
      </header>

      <section>
        <h2 class="section-title">Submitted Information</h2>
        <div class="field-grid">
          ${fieldMarkup}
        </div>
      </section>

      <footer class="footer">
        Generated from the portal on ${escapeHtml(formatDate(new Date().toISOString()))}.
      </footer>
    </main>

    <script>
      async function waitForImages() {
        const images = Array.from(document.images);
        await Promise.all(
          images.map((image) => {
            if (image.complete) {
              return Promise.resolve();
            }

            return new Promise((resolve) => {
              image.addEventListener('load', resolve, { once: true });
              image.addEventListener('error', resolve, { once: true });
            });
          }),
        );
      }

      window.addEventListener('load', async () => {
        try {
          if (document.fonts && document.fonts.ready) {
            await document.fonts.ready;
          }
        } catch {}

        await waitForImages();

        setTimeout(() => {
          window.focus();
          window.print();
        }, 200);
      });

      window.addEventListener('afterprint', () => {
        setTimeout(() => window.close(), 100);
      });
    </script>
  </body>
</html>`
}

export function exportSubmissionToA4PDF(
  options: ExportSubmissionToPDFOptions,
): void {
  const printWindow = window.open('', '_blank')

  if (!printWindow) {
    throw new Error('Please allow pop-ups to export this completed form.')
  }

  const html = buildDocumentHtml(options)
  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.title = `${sanitizeFileName(options.form.title)}-completed-form`
  printWindow.document.close()
}
