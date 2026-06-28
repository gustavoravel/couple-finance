import type { Account, Category, TransactionType, TransactionStatus } from '@/types'

export interface ParsedImportRow {
  line: number
  date: string
  type: TransactionType
  description: string
  categoryId: string
  subcategoryId?: string
  amount: number
  accountId?: string
  status: TransactionStatus
  errors: string[]
}

export interface ImportPreview {
  valid: ParsedImportRow[]
  invalid: ParsedImportRow[]
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function detectDelimiter(headerLine: string): string {
  const semicolons = (headerLine.match(/;/g) ?? []).length
  const commas = (headerLine.match(/,/g) ?? []).length
  return semicolons >= commas ? ';' : ','
}

function normalizeHeader(h: string): string {
  return h
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function parseAmount(raw: string): number {
  const cleaned = raw.replace(/[R$\s]/g, '').trim()
  if (!cleaned) return NaN
  if (cleaned.includes(',') && cleaned.includes('.')) {
    return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'))
  }
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'))
  }
  return parseFloat(cleaned)
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed

  const br = trimmed.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/)
  if (br) {
    const [, d, m, y] = br
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  return null
}

function parseType(raw: string): TransactionType | null {
  const v = normalizeHeader(raw)
  if (['entrada', 'income', 'receita', 'recebimento'].includes(v)) return 'income'
  if (['saida', 'expense', 'despesa', 'gasto', 'pagamento'].includes(v)) return 'expense'
  return null
}

function parseStatus(raw: string): TransactionStatus {
  const v = normalizeHeader(raw)
  if (['prevista', 'previsto', 'pending', 'pendente'].includes(v)) return 'pending'
  return 'paid'
}

function findCategory(
  categories: Category[],
  name: string,
): { categoryId: string; subcategoryId?: string } | null {
  const norm = normalizeHeader(name)
  if (!norm) return null

  for (const cat of categories) {
    if (normalizeHeader(cat.name) === norm) {
      return { categoryId: cat.id }
    }
    for (const sub of cat.subcategories) {
      if (normalizeHeader(sub.name) === norm) {
        return { categoryId: cat.id, subcategoryId: sub.id }
      }
    }
  }

  for (const cat of categories) {
    if (normalizeHeader(cat.name).includes(norm) || norm.includes(normalizeHeader(cat.name))) {
      return { categoryId: cat.id }
    }
  }

  return null
}

function findAccount(accounts: Account[], name: string): string | undefined {
  const norm = normalizeHeader(name)
  if (!norm) return undefined
  return accounts.find((a) => normalizeHeader(a.name) === norm)?.id
}

export function parseImportCsv(
  content: string,
  categories: Category[],
  accounts: Account[],
  defaultAccountId: string,
): ImportPreview {
  const lines = content.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length < 2) {
    return { valid: [], invalid: [] }
  }

  const delimiter = detectDelimiter(lines[0])
  const headers = parseCsvLine(lines[0], delimiter).map(normalizeHeader)

  const col = (names: string[]) => headers.findIndex((h) => names.some((n) => h.includes(n)))

  const dateCol = col(['data', 'date'])
  const typeCol = col(['tipo', 'type'])
  const descCol = col(['descricao', 'description', 'desc'])
  const catCol = col(['categoria', 'category'])
  const subCol = col(['subcategoria', 'subcategory', 'sub'])
  const amountCol = col(['valor', 'amount', 'value'])
  const accountCol = col(['conta', 'account'])
  const statusCol = col(['status', 'situacao'])

  const valid: ParsedImportRow[] = []
  const invalid: ParsedImportRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i], delimiter)
    const errors: string[] = []

    const dateRaw = dateCol >= 0 ? cells[dateCol] : ''
    const date = parseDate(dateRaw)
    if (!date) errors.push('Data inválida')

    const typeRaw = typeCol >= 0 ? cells[typeCol] : 'saida'
    const type = parseType(typeRaw)
    if (!type) errors.push('Tipo inválido')

    const amountRaw = amountCol >= 0 ? cells[amountCol] : ''
    const amount = parseAmount(amountRaw)
    if (!amount || amount <= 0 || Number.isNaN(amount)) errors.push('Valor inválido')

    const catName = catCol >= 0 ? cells[catCol] : ''
    const subName = subCol >= 0 ? cells[subCol] : ''
    const categoryMatch = findCategory(categories, subName || catName)
    if (!categoryMatch) errors.push(`Categoria não encontrada: ${subName || catName}`)

    const description = descCol >= 0 ? cells[descCol] : catName
    const accountId =
      accountCol >= 0 ? findAccount(accounts, cells[accountCol]) ?? defaultAccountId : defaultAccountId
    if (!accountId) errors.push('Conta não encontrada')

    const status = statusCol >= 0 ? parseStatus(cells[statusCol]) : 'paid'

    const row: ParsedImportRow = {
      line: i + 1,
      date: date ?? '',
      type: type ?? 'expense',
      description: description || catName || 'Importado',
      categoryId: categoryMatch?.categoryId ?? '',
      subcategoryId: categoryMatch?.subcategoryId,
      amount: amount || 0,
      accountId,
      status,
      errors,
    }

    if (errors.length) invalid.push(row)
    else valid.push(row)
  }

  return { valid, invalid }
}

export const IMPORT_CSV_TEMPLATE = `Data;Tipo;Descrição;Categoria;Subcategoria;Valor;Conta;Status
01/01/2027;Entrada;Salário;Renda;Salário;8500,00;Nubank;Efetivada
05/01/2027;Saída;Supermercado;Alimentação;Supermercado;450,50;Nubank;Efetivada
10/01/2027;Saída;Aluguel;Despesas da casa;Aluguel;2200,00;Nubank;Efetivada`

export function downloadImportTemplate(): void {
  const blob = new Blob(['\uFEFF' + IMPORT_CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modelo-importacao-financas.csv'
  a.click()
  URL.revokeObjectURL(url)
}
