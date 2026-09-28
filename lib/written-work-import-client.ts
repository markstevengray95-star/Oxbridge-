export type WrittenWorkImportResult = {
  text: string
  source: "text" | "docx" | "pdf"
  warning?: string
}

const MAX_PDF_BYTES = 3_000_000
const MAX_DOCX_BYTES = 12_000_000

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
}

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("DOCX extraction is not supported by this browser. Try Chrome, Edge or upload a PDF instead.")
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

function findEndOfCentralDirectory(data: DataView) {
  const minimum = Math.max(0, data.byteLength - 65_557)
  for (let offset = data.byteLength - 22; offset >= minimum; offset -= 1) {
    if (data.getUint32(offset, true) === 0x06054b50) return offset
  }
  return -1
}

async function extractDocxText(file: File) {
  if (file.size > MAX_DOCX_BYTES) throw new Error("DOCX files must be 12 MB or smaller.")
  const buffer = await file.arrayBuffer()
  const data = new DataView(buffer)
  const bytes = new Uint8Array(buffer)
  const eocd = findEndOfCentralDirectory(data)
  if (eocd < 0) throw new Error("This DOCX file could not be read as a valid Office document.")

  const entries = data.getUint16(eocd + 10, true)
  let offset = data.getUint32(eocd + 16, true)
  const decoder = new TextDecoder("utf-8")

  for (let index = 0; index < entries && offset + 46 <= data.byteLength; index += 1) {
    if (data.getUint32(offset, true) !== 0x02014b50) break
    const method = data.getUint16(offset + 10, true)
    const compressedSize = data.getUint32(offset + 20, true)
    const fileNameLength = data.getUint16(offset + 28, true)
    const extraLength = data.getUint16(offset + 30, true)
    const commentLength = data.getUint16(offset + 32, true)
    const localHeaderOffset = data.getUint32(offset + 42, true)
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength))

    if (name === "word/document.xml") {
      if (data.getUint32(localHeaderOffset, true) !== 0x04034b50) throw new Error("The DOCX document body could not be located.")
      const localNameLength = data.getUint16(localHeaderOffset + 26, true)
      const localExtraLength = data.getUint16(localHeaderOffset + 28, true)
      const start = localHeaderOffset + 30 + localNameLength + localExtraLength
      const compressed = bytes.slice(start, start + compressedSize)
      const xmlBytes = method === 0 ? compressed : method === 8 ? await inflateRaw(compressed) : null
      if (!xmlBytes) throw new Error("This DOCX uses an unsupported compression method.")
      const xml = decoder.decode(xmlBytes)
      const text = decodeXmlEntities(
        xml
          .replace(/<w:tab\b[^>]*\/>/g, "\t")
          .replace(/<w:br\b[^>]*\/>/g, "\n")
          .replace(/<\/w:p>/g, "\n")
          .replace(/<[^>]+>/g, "")
      )
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
      if (text.length < 20) throw new Error("Very little text could be extracted from this DOCX.")
      return text
    }

    offset += 46 + fileNameLength + extraLength + commentLength
  }

  throw new Error("The DOCX document body was not found.")
}

function toBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ""
  const chunk = 0x8000
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(bytes.length, offset + chunk)))
  }
  return btoa(binary)
}

async function extractPdfText(file: File) {
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF import currently supports files up to 3 MB. For a larger file, export just the submitted pages or paste the text.")
  const data = toBase64(await file.arrayBuffer())
  const response = await fetch("/api/extract-written-work", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, mimeType: "application/pdf", fileName: file.name }),
  })
  const payload = await response.json().catch(() => ({})) as { text?: string; error?: string }
  if (!response.ok || !payload.text?.trim()) throw new Error(payload.error || "The PDF text could not be extracted.")
  return payload.text.trim()
}

export async function readWrittenWorkFile(file: File): Promise<WrittenWorkImportResult> {
  const lower = file.name.toLowerCase()
  if (lower.endsWith(".txt") || lower.endsWith(".md") || file.type.startsWith("text/")) {
    return { text: await file.text(), source: "text" }
  }
  if (lower.endsWith(".docx") || file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    return { text: await extractDocxText(file), source: "docx" }
  }
  if (lower.endsWith(".pdf") || file.type === "application/pdf") {
    return { text: await extractPdfText(file), source: "pdf", warning: "PDF text is extracted through the configured document-analysis service; check equations and unusual formatting against the original." }
  }
  throw new Error("Use a PDF, DOCX, TXT or Markdown file.")
}
