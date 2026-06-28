import { formatCurrency, formatDate } from '@/lib/format'
import { filterTransactions } from '@/lib/transactionFilters'
import type { Account, Category, CreditCard, Transaction } from '@/types'
import type { FilterState, ListItem } from '@/lib/transactionFilters'

export interface ExportRow {
  date: string
  type: string
  description: string
  category: string
  subcategory: string
  amount: number
  payment: string
  status: string
  person: string
}

export function buildExportRows(
  items: ListItem[],
  categories: Category[],
  accounts: Account[],
  cards: CreditCard[],
  members: Array<{ uid: string; name: string }>,
): ExportRow[] {
  const getCategory = (id: string) => categories.find((c) => c.id === id)
  const getMember = (uid: string) => members.find((m) => m.uid === uid)?.name ?? ''

  return items.map((item) => {
    if (item.kind === 'transfer') {
      const tr = item.data
      const from = accounts.find((a) => a.id === tr.fromAccountId)?.name ?? ''
      const to = accounts.find((a) => a.id === tr.toAccountId)?.name ?? ''
      return {
        date: tr.date,
        type: 'Transferência',
        description: tr.description || 'Transferência',
        category: '',
        subcategory: '',
        amount: tr.amount,
        payment: `${from} → ${to}`,
        status: 'Efetivada',
        person: getMember(tr.createdBy),
      }
    }

    const tx = item.data
    const cat = getCategory(tx.categoryId)
    const sub = cat?.subcategories.find((s) => s.id === tx.subcategoryId)
    const payment =
      tx.paymentMethod === 'card'
        ? cards.find((c) => c.id === tx.cardId)?.name ?? 'Cartão'
        : accounts.find((a) => a.id === tx.accountId)?.name ?? 'Conta'

    return {
      date: tx.date,
      type: tx.type === 'income' ? 'Entrada' : 'Saída',
      description: tx.description || cat?.name || '',
      category: cat?.name ?? '',
      subcategory: sub?.name ?? '',
      amount: tx.amount,
      payment,
      status: tx.status === 'paid' ? 'Efetivada' : 'Prevista',
      person: getMember(tx.createdBy),
    }
  })
}

function escapeCsv(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes(';')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

export function exportToCsv(rows: ExportRow[], filename: string): void {
  const headers = ['Data', 'Tipo', 'Descrição', 'Categoria', 'Subcategoria', 'Valor', 'Pagamento', 'Status', 'Pessoa']
  const lines = [
    headers.join(';'),
    ...rows.map((r) =>
      [
        r.date,
        r.type,
        r.description,
        r.category,
        r.subcategory,
        r.amount.toFixed(2).replace('.', ','),
        r.payment,
        r.status,
        r.person,
      ]
        .map(escapeCsv)
        .join(';'),
    ),
  ]

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, filename)
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ReportSummary {
  income: number
  expense: number
  surplus: number
  count: number
}

export interface CategoryBreakdown {
  name: string
  amount: number
  pct: number
  color: string
}

export function categoryBreakdown(
  transactions: Transaction[],
  categories: Category[],
  filters: FilterState,
): CategoryBreakdown[] {
  const filtered = filterTransactions(transactions, filters).filter(
    (t) => t.type === 'expense' && t.status === 'paid',
  )
  const total = filtered.reduce((s, t) => s + t.amount, 0)
  const map = new Map<string, number>()

  filtered.forEach((t) => {
    const cat = categories.find((c) => c.id === t.categoryId)
    const name = cat?.name ?? 'Outros'
    map.set(name, (map.get(name) ?? 0) + t.amount)
  })

  return Array.from(map.entries())
    .map(([name, amount]) => {
      const cat = categories.find((c) => c.name === name)
      return {
        name,
        amount,
        pct: total > 0 ? (amount / total) * 100 : 0,
        color: cat?.color ?? '#94A3B8',
      }
    })
    .sort((a, b) => b.amount - a.amount)
}

export function exportToPdf(
  title: string,
  summary: ReportSummary,
  breakdown: CategoryBreakdown[],
  rows: ExportRow[],
  periodLabel: string,
): void {
  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 24px; color: #1a1a2e; font-size: 12px; }
    h1 { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #666; margin-bottom: 20px; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; }
    .summary div { flex: 1; padding: 12px; border-radius: 8px; background: #f5f5f7; }
    .summary strong { display: block; font-size: 16px; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; font-size: 11px; }
    .right { text-align: right; }
    .income { color: #16a34a; }
    .expense { color: #dc2626; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p class="meta">${periodLabel} · ${summary.count} registros · Gerado em ${new Date().toLocaleString('pt-BR')}</p>
  <div class="summary">
    <div><span>Entradas</span><strong class="income">${formatCurrency(summary.income)}</strong></div>
    <div><span>Saídas</span><strong class="expense">${formatCurrency(summary.expense)}</strong></div>
    <div><span>Sobra</span><strong>${formatCurrency(summary.surplus)}</strong></div>
  </div>
  <h2>Gastos por categoria</h2>
  <table>
    <thead><tr><th>Categoria</th><th class="right">Valor</th><th class="right">%</th></tr></thead>
    <tbody>
      ${breakdown
        .map(
          (b) =>
            `<tr><td>${b.name}</td><td class="right">${formatCurrency(b.amount)}</td><td class="right">${b.pct.toFixed(1)}%</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
  <h2 style="margin-top:24px">Lançamentos</h2>
  <table>
    <thead><tr><th>Data</th><th>Tipo</th><th>Descrição</th><th>Categoria</th><th class="right">Valor</th></tr></thead>
    <tbody>
      ${rows
        .slice(0, 200)
        .map(
          (r) =>
            `<tr><td>${formatDate(r.date)}</td><td>${r.type}</td><td>${r.description}</td><td>${r.category}</td><td class="right">${formatCurrency(r.amount)}</td></tr>`,
        )
        .join('')}
    </tbody>
  </table>
  ${rows.length > 200 ? `<p style="color:#666;margin-top:8px">… e mais ${rows.length - 200} registros</p>` : ''}
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) {
    alert('Permita pop-ups para exportar PDF')
    return
  }
  win.document.write(html)
  win.document.close()
}
