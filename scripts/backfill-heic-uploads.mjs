import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { execFile } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const execFileAsync = promisify(execFile)

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error(
    'VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.',
  )
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

function isHeicLikeRow(row) {
  return (
    /\.(heic|heif)(\?|$)/i.test(row.file_url ?? '') ||
    /\.(heic|heif)(\?|$)/i.test(row.file_name ?? '')
  )
}

function toJpegPath(fileUrl) {
  const prefix = '/storage/v1/object/public/submissions/'
  const pathname = new URL(fileUrl).pathname
  const objectPath = decodeURIComponent(pathname.split(prefix)[1] ?? '')

  if (!objectPath) {
    throw new Error(`Could not resolve storage path from ${fileUrl}`)
  }

  return objectPath.replace(/\.(heic|heif)$/i, '.jpg')
}

function toFileName(fileName, fileUrl) {
  if (fileName) {
    return fileName.replace(/\.(heic|heif)$/i, '.jpg')
  }

  const baseName = path.basename(new URL(fileUrl).pathname)
  return baseName.replace(/\.(heic|heif)$/i, '.jpg')
}

async function convertHeicToJpeg(sourcePath, outputPath) {
  await execFileAsync('sips', ['-s', 'format', 'jpeg', sourcePath, '--out', outputPath])
}

async function main() {
  const { data, error } = await supabase
    .from('submission_values')
    .select('id, value, file_url, file_name')
    .not('file_url', 'is', null)

  if (error) {
    throw new Error(error.message)
  }

  const heicRows = (data ?? []).filter(isHeicLikeRow)
  if (heicRows.length === 0) {
    console.log('No HEIC/HEIF uploads found.')
    return
  }

  console.log(`Found ${heicRows.length} HEIC/HEIF upload(s).`)

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'gcu73-heic-'))

  try {
    for (const row of heicRows) {
      if (!row.file_url) continue

      const objectPath = toJpegPath(row.file_url)
      const sourcePath = path.join(tempDir, `${row.id}.heic`)
      const outputPath = path.join(tempDir, `${row.id}.jpg`)

      console.log(`Converting ${row.file_url}`)

      const response = await fetch(row.file_url)
      if (!response.ok) {
        throw new Error(`Failed to download ${row.file_url}: ${response.status}`)
      }

      const bytes = Buffer.from(await response.arrayBuffer())
      await writeFile(sourcePath, bytes)
      await convertHeicToJpeg(sourcePath, outputPath)

      const jpegBytes = await readFile(outputPath)
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(objectPath, jpegBytes, {
          contentType: 'image/jpeg',
          upsert: true,
        })

      if (uploadError) {
        throw new Error(uploadError.message)
      }

      const { data: publicUrlData } = supabase.storage
        .from('submissions')
        .getPublicUrl(objectPath)

      const nextUrl = publicUrlData.publicUrl
      const nextFileName = toFileName(row.file_name, row.file_url)

      const { error: updateError } = await supabase
        .from('submission_values')
        .update({
          file_url: nextUrl,
          file_name: nextFileName,
          value: row.value === row.file_url ? nextUrl : row.value,
        })
        .eq('id', row.id)

      if (updateError) {
        throw new Error(updateError.message)
      }

      console.log(`Updated submission_values.${row.id} -> ${nextUrl}`)
    }
  } finally {
    await rm(tempDir, { recursive: true, force: true })
  }
}

await main()
