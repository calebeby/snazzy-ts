import logUpdate from 'log-update'
import symbols from 'log-symbols'
import chalk from 'chalk'
import ora from 'ora'

let data: string[] = []

process.stdin.resume()
process.stdin.setEncoding('utf8')

const spinner = ora('Checking\n')

console.log('')

interface ParsedLine {
  file: string
  line: string
  col: string
  message: string
}

const position = ({ line, col }: { line: string; col: string }) =>
  chalk.gray(line.padStart(3) + chalk.dim(':') + col.padEnd(4))

const formatLine = (line: ParsedLine) =>
  ` ${symbols.error} ${position(line)} ${line.message}`

const parseLine = (input: string): ParsedLine => {
  const segments = input.split(':')
  const locationSegments = segments[0].split(/[(),]/)
  const file = locationSegments[0]
  const line = locationSegments[1]
  const col = locationSegments[2]
  const message = segments[2].trim()
  return {
    file,
    line,
    col,
    message,
  }
}

const formatFilename = (files: ParsedLine[]) =>
  chalk.hidden.dim.gray('./') +
  chalk.dim.underline(files[0].file) +
  chalk.hidden.dim.gray(`:${files[0].line}:${files[0].col}`)

const formatFileErrors = (files: ParsedLine[]) => `${formatFilename(files)}
${files.map(formatLine).join('\n')}`

const formatOutput = (input: string[], watch = false) => {
  if (input.length === 0) {
    logUpdate(symbols.success + ' No problems\n')
    return watch || logUpdate.done()
  }
  const lines = input.map(parseLine)
  const groupedLines = Object.values(
    lines.reduce<{ [file: string]: ParsedLine[] }>((errorFiles, line) => {
      errorFiles[line.file] = (errorFiles[line.file] || []).concat(line)
      return errorFiles
    }, {}),
  )
  const out = `${groupedLines.map(formatFileErrors).join('\n')}

 ${chalk.redBright(input.length + (input.length === 1 ? ' error' : ' errors'))}
`
  logUpdate(out)
  watch || logUpdate.done()
}

process.stdin.on('data', (paddedChunk: string) => {
  const chunk = paddedChunk.trim()
  if (
    chunk.endsWith('Starting incremental compilation...') ||
    chunk.endsWith('Starting compilation in watch mode...')
  ) {
    spinner.start()
    logUpdate.clear()
    return (data = [])
  }
  if (chunk.endsWith('Watching for file changes.')) {
    spinner.stop()
    return formatOutput(data, true)
  }
  data.push(chunk)
})

process.stdin.on('end', () => {
  formatOutput(data)
  if (data.length === 0) {
    process.exit(0)
  }
  process.exit(1)
})
