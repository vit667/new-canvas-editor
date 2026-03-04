/**
 * Parse a Markdown table into an array of objects
 * Each object represents a row with headers as keys
 */
export function parseMarkdownTable(markdown: string): Record<string, string>[] {
  const lines = markdown.trim().split('\n').filter(line => line.trim())

  if (lines.length < 2) {
    return []
  }

  // Find the header line (first line with |)
  const headerLineIndex = lines.findIndex(line => line.includes('|'))
  if (headerLineIndex === -1) {
    return []
  }

  const headerLine = lines[headerLineIndex]
  const headers = parseLine(headerLine)

  if (headers.length === 0) {
    return []
  }

  // Skip separator line (contains dashes)
  const dataStartIndex = headerLineIndex + 1
  const separatorLine = lines[dataStartIndex]
  const hasSeparator = separatorLine && /^[\s|:-]+$/.test(separatorLine)
  const actualDataStart = hasSeparator ? dataStartIndex + 1 : dataStartIndex

  const result: Record<string, string>[] = []

  for (let i = actualDataStart; i < lines.length; i++) {
    const line = lines[i]
    if (!line.includes('|')) continue

    const values = parseLine(line)
    const row: Record<string, string> = {}

    headers.forEach((header, index) => {
      row[header] = values[index] || ''
    })

    result.push(row)
  }

  return result
}

/**
 * Parse a single line of Markdown table
 */
function parseLine(line: string): string[] {
  return line
    .split('|')
    .map(cell => cell.trim())
    .filter((_, index, arr) => {
      // Remove empty first/last cells from leading/trailing pipes
      if (index === 0 && arr[index] === '') return false
      if (index === arr.length - 1 && arr[index] === '') return false
      return true
    })
}

/**
 * Validate that markdown contains a valid table
 */
export function isValidMarkdownTable(markdown: string): boolean {
  const lines = markdown.trim().split('\n').filter(line => line.trim())

  if (lines.length < 2) return false

  const hasHeaders = lines.some(line => line.includes('|'))
  if (!hasHeaders) return false

  const headerLineIndex = lines.findIndex(line => line.includes('|'))
  const headerLine = lines[headerLineIndex]
  const headers = parseLine(headerLine)

  return headers.length > 0
}

/**
 * Get headers from markdown table
 */
export function getMarkdownTableHeaders(markdown: string): string[] {
  const lines = markdown.trim().split('\n').filter(line => line.trim())

  const headerLineIndex = lines.findIndex(line => line.includes('|'))
  if (headerLineIndex === -1) return []

  return parseLine(lines[headerLineIndex])
}
