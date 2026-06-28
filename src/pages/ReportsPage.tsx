import { useMemo, useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { Download, FileText, Upload, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { FilterBar } from '@/components/filters/FilterBar'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/format'
import {
  defaultFilters,
  mergeAndSort,
  sumExpense,
  sumIncome,
} from '@/lib/transactionFilters'
import {
  buildExportRows,
  categoryBreakdown,
  exportToCsv,
  exportToPdf,
} from '@/lib/exportUtils'
import { downloadImportTemplate, parseImportCsv } from '@/lib/importUtils'
import { importTransactions } from '@/services/importService'

export function ReportsPage() {
  const { user } = useAuth()
  const { household, accounts, categories, cards, transactions, transfers, members } = useHousehold()
  const [filters, setFilters] = useState(defaultFilters)
  const [importPreview, setImportPreview] = useState<ReturnType<typeof parseImportCsv> | null>(null)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<string | null>(null)
  const [defaultAccountId, setDefaultAccountId] = useState(accounts[0]?.id ?? '')

  const items = useMemo(
    () => mergeAndSort(transactions, transfers, filters),
    [transactions, transfers, filters],
  )

  const income = sumIncome(transactions, filters)
  const expense = sumExpense(transactions, filters)
  const surplus = income - expense

  const breakdown = useMemo(
    () => categoryBreakdown(transactions, categories, filters),
    [transactions, categories, filters],
  )

  const exportRows = useMemo(
    () => buildExportRows(items, categories, accounts, cards, members),
    [items, categories, accounts, cards, members],
  )

  const periodLabel =
    filters.periodMode === 'month'
      ? new Date(filters.month + '-01').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      : filters.periodMode === 'year'
        ? String(filters.year)
        : `${filters.startDate || '…'} — ${filters.endDate || '…'}`

  const filenameBase = `financas-${filters.periodMode === 'month' ? filters.month : filters.year}`

  const handleExportCsv = () => {
    exportToCsv(exportRows, `${filenameBase}.csv`)
  }

  const handleExportPdf = () => {
    exportToPdf(
      'Relatório Financeiro',
      { income, expense, surplus, count: exportRows.length },
      breakdown,
      exportRows,
      periodLabel,
    )
  }

  const handleFileSelect = async (file: File) => {
    const text = await file.text()
    const preview = parseImportCsv(text, categories, accounts, defaultAccountId)
    setImportPreview(preview)
    setImportResult(null)
  }

  const handleImport = async () => {
    if (!household || !user || !importPreview?.valid.length) return
    setImporting(true)
    try {
      const count = await importTransactions(household.id, importPreview.valid, user.uid)
      setImportResult(`${count} lançamento(s) importado(s) com sucesso`)
      setImportPreview(null)
    } catch {
      setImportResult('Erro ao importar. Tente novamente.')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-sm text-gray-500">Análise, exportação e importação</p>
      </header>

      <FilterBar
        filters={filters}
        onChange={setFilters}
        categories={categories}
        accounts={accounts}
        cards={cards}
        members={members}
      />

      <div className="grid grid-cols-3 gap-2">
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Entradas</p>
          <p className="text-sm font-bold text-green-600">{formatCurrency(income)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Saídas</p>
          <p className="text-sm font-bold text-red-500">{formatCurrency(expense)}</p>
        </Card>
        <Card padding="sm" className="text-center">
          <p className="text-xs text-gray-400">Sobra</p>
          <p className={`text-sm font-bold ${surplus >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {formatCurrency(surplus)}
          </p>
        </Card>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={handleExportCsv} disabled={exportRows.length === 0}>
          <Download className="w-4 h-4" />
          Exportar CSV
        </Button>
        <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exportRows.length === 0}>
          <FileText className="w-4 h-4" />
          Exportar PDF
        </Button>
        <span className="text-xs text-gray-400 self-center">{exportRows.length} registros · {periodLabel}</span>
      </div>

      {breakdown.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <h2 className="font-semibold text-gray-900 mb-4">Gastos por categoria</h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={breakdown.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="amount"
                    nameKey="name"
                  >
                    {breakdown.slice(0, 8).map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900 mb-3">Ranking de gastos</h2>
            <div className="flex flex-col gap-2 max-h-52 overflow-y-auto">
              {breakdown.map((b) => (
                <div key={b.name} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="flex-1 text-sm text-gray-600 truncate">{b.name}</span>
                  <span className="text-sm font-medium text-gray-900 shrink-0">{formatCurrency(b.amount)}</span>
                  <span className="text-xs text-gray-400 w-10 text-right shrink-0">{b.pct.toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {breakdown.length > 0 && (
        <Card>
          <h2 className="font-semibold text-gray-900 mb-3">Comparativo por categoria</h2>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={breakdown.slice(0, 10)} layout="vertical" margin={{ left: 80, right: 16 }}>
                <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={75} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="amount" fill="#7F3DFF" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card>
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Importar planilha (CSV)
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Exporte sua planilha &quot;Meu Bolso em Dia&quot; como CSV (separador ; ) ou use o modelo abaixo.
        </p>

        <div className="flex gap-2 flex-wrap mb-4">
          <Button variant="ghost" size="sm" onClick={downloadImportTemplate}>
            Baixar modelo CSV
          </Button>
        </div>

        {accounts.length > 0 && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Conta padrão (quando não informada)</label>
            <select
              value={defaultAccountId}
              onChange={(e) => setDefaultAccountId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
        )}

        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFileSelect(file)
            e.target.value = ''
          }}
          className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary file:font-medium"
        />

        {importPreview && (
          <div className="mt-4 flex flex-col gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" />
                {importPreview.valid.length} válidos
              </span>
              {importPreview.invalid.length > 0 && (
                <span className="flex items-center gap-1 text-red-500">
                  <AlertCircle className="w-4 h-4" />
                  {importPreview.invalid.length} com erro
                </span>
              )}
            </div>

            {importPreview.invalid.length > 0 && (
              <div className="max-h-32 overflow-y-auto text-xs text-red-500 bg-red-50 rounded-lg p-3">
                {importPreview.invalid.slice(0, 10).map((row) => (
                  <p key={row.line}>Linha {row.line}: {row.errors.join(', ')}</p>
                ))}
                {importPreview.invalid.length > 10 && (
                  <p>… e mais {importPreview.invalid.length - 10} erros</p>
                )}
              </div>
            )}

            {importPreview.valid.length > 0 && (
              <Button fullWidth onClick={handleImport} disabled={importing}>
                {importing ? 'Importando...' : `Importar ${importPreview.valid.length} lançamento(s)`}
              </Button>
            )}
          </div>
        )}

        {importResult && (
          <p className={`text-sm mt-3 ${importResult.includes('sucesso') ? 'text-green-600' : 'text-red-500'}`}>
            {importResult}
          </p>
        )}
      </Card>
    </div>
  )
}
