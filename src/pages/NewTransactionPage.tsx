import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createTransaction, createCardTransaction, updateTransaction } from '@/services/transactionService'
import { createTransfer } from '@/services/transferService'
import { createRecurrence } from '@/services/recurrenceService'
import { uploadAttachment } from '@/services/storageService'
import { initialNextRunDate } from '@/lib/recurrenceUtils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { toISODate } from '@/lib/format'

type EntryMode = 'expense' | 'income' | 'transfer'

const txSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  subcategoryId: z.string().optional(),
  paymentMethod: z.enum(['account', 'card']),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  installments: z.coerce.number().int().min(1).max(48).optional(),
  status: z.enum(['paid', 'pending']),
}).superRefine((data, ctx) => {
  if (data.paymentMethod === 'account' && !data.accountId) {
    ctx.addIssue({ code: 'custom', message: 'Selecione uma conta', path: ['accountId'] })
  }
  if (data.paymentMethod === 'card' && !data.cardId) {
    ctx.addIssue({ code: 'custom', message: 'Selecione um cartão', path: ['cardId'] })
  }
  if (data.type === 'income' && data.paymentMethod === 'card') {
    ctx.addIssue({ code: 'custom', message: 'Entradas não usam cartão', path: ['paymentMethod'] })
  }
})

const transferSchema = z.object({
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  description: z.string().optional(),
  fromAccountId: z.string().min(1, 'Selecione a conta de origem'),
  toAccountId: z.string().min(1, 'Selecione a conta de destino'),
}).refine((d) => d.fromAccountId !== d.toAccountId, {
  message: 'Contas devem ser diferentes',
  path: ['toAccountId'],
})

type TxFormData = z.infer<typeof txSchema>
type TransferFormData = z.infer<typeof transferSchema>

export function NewTransactionPage() {
  const { user } = useAuth()
  const { household, accounts, cards, categories } = useHousehold()
  const navigate = useNavigate()
  const [mode, setMode] = useState<EntryMode>('expense')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [saveAsRecurrence, setSaveAsRecurrence] = useState(false)

  const txForm = useForm<TxFormData>({
    resolver: zodResolver(txSchema),
    defaultValues: {
      type: 'expense',
      date: toISODate(new Date()),
      status: 'paid',
      paymentMethod: 'account',
      accountId: accounts[0]?.id ?? '',
      cardId: cards[0]?.id ?? '',
      installments: 1,
    },
  })

  const transferForm = useForm<TransferFormData>({
    resolver: zodResolver(transferSchema),
    defaultValues: {
      date: toISODate(new Date()),
      fromAccountId: accounts[0]?.id ?? '',
      toAccountId: accounts[1]?.id ?? accounts[0]?.id ?? '',
    },
  })

  const txType = txForm.watch('type')
  const categoryId = txForm.watch('categoryId')
  const paymentMethod = txForm.watch('paymentMethod')

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === (txType === 'income' ? 'income' : 'expense')),
    [categories, txType],
  )

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subcategoryOptions = (selectedCategory?.subcategories ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))
  const cardOptions = cards.map((c) => ({ value: c.id, label: c.name }))

  const switchMode = (m: EntryMode) => {
    setMode(m)
    setError('')
    if (m !== 'transfer') {
      txForm.setValue('type', m)
      txForm.setValue('categoryId', '')
      if (m === 'income') {
        txForm.setValue('paymentMethod', 'account')
      }
    }
  }

  const onSubmitTx = async (data: TxFormData) => {
    if (!household || !user) return
    setError('')
    setLoading(true)
    try {
      let txId: string | undefined

      if (data.paymentMethod === 'card') {
        const card = cards.find((c) => c.id === data.cardId)
        if (!card) throw new Error('Cartão não encontrado')
        const ids = await createCardTransaction(household.id, card, {
          type: 'expense',
          amount: data.amount,
          date: data.date,
          description: data.description ?? '',
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          cardId: card.id,
          status: data.status,
          createdBy: user.uid,
          installments: data.installments ?? 1,
        })
        txId = ids[0]
      } else {
        txId = await createTransaction(household.id, {
          type: data.type,
          amount: data.amount,
          date: data.date,
          description: data.description ?? '',
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId,
          paymentMethod: 'account',
          accountId: data.accountId,
          status: data.status,
          createdBy: user.uid,
        })
      }

      if (attachment && txId) {
        const url = await uploadAttachment(household.id, txId, attachment)
        await updateTransaction(household.id, txId, { attachmentUrl: url })
      }

      if (saveAsRecurrence && data.paymentMethod === 'account') {
        const [, , day] = data.date.split('-').map(Number)
        await createRecurrence(household.id, {
          template: {
            type: data.type,
            amount: data.amount,
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId,
            description: data.description ?? (categories.find((c) => c.id === data.categoryId)?.name ?? 'Recorrente'),
            paymentMethod: 'account',
            accountId: data.accountId,
            status: data.status,
          },
          frequency: 'monthly',
          dayOfMonth: day,
          nextRunDate: initialNextRunDate('monthly', day),
          active: true,
          createdBy: user.uid,
        })
      }

      navigate('/lancamentos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar lançamento')
    } finally {
      setLoading(false)
    }
  }

  const onSubmitTransfer = async (data: TransferFormData) => {
    if (!household || !user) return
    setError('')
    setLoading(true)
    try {
      await createTransfer(household.id, {
        fromAccountId: data.fromAccountId,
        toAccountId: data.toAccountId,
        amount: data.amount,
        date: data.date,
        description: data.description ?? '',
        createdBy: user.uid,
        kind: 'transfer',
      })
      navigate('/lancamentos')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar transferência')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">Novo lançamento</h1>
      </header>

      <div className="flex gap-2">
        {([
          { key: 'expense' as const, label: 'Saída', active: 'bg-red-500 text-white' },
          { key: 'income' as const, label: 'Entrada', active: 'bg-green-500 text-white' },
          { key: 'transfer' as const, label: 'Transferência', active: 'bg-primary text-white' },
        ]).map(({ key, label, active }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchMode(key)}
            className={[
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors',
              mode === key ? active : 'bg-white text-gray-600 border border-gray-200',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === 'transfer' ? (
        <Card>
          <form onSubmit={transferForm.handleSubmit(onSubmitTransfer)} className="flex flex-col gap-4">
            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              error={transferForm.formState.errors.amount?.message}
              {...transferForm.register('amount')}
            />
            <Input
              label="Data"
              type="date"
              error={transferForm.formState.errors.date?.message}
              {...transferForm.register('date')}
            />
            <Input
              label="Descrição (opcional)"
              placeholder="Ex.: Reserva de emergência"
              {...transferForm.register('description')}
            />
            <Select
              label="De (origem)"
              options={accountOptions.length ? accountOptions : [{ value: '', label: 'Nenhuma conta' }]}
              error={transferForm.formState.errors.fromAccountId?.message}
              {...transferForm.register('fromAccountId')}
            />
            <Select
              label="Para (destino)"
              options={accountOptions.length ? accountOptions : [{ value: '', label: 'Nenhuma conta' }]}
              error={transferForm.formState.errors.toAccountId?.message}
              {...transferForm.register('toAccountId')}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" fullWidth size="lg" disabled={loading || accounts.length < 2}>
              {loading ? 'Salvando...' : 'Salvar transferência'}
            </Button>
            {accounts.length < 2 && (
              <p className="text-sm text-amber-600 text-center">
                Cadastre pelo menos duas contas para transferir
              </p>
            )}
          </form>
        </Card>
      ) : (
        <Card>
          <form onSubmit={txForm.handleSubmit(onSubmitTx)} className="flex flex-col gap-4">
            <input type="hidden" {...txForm.register('type')} />

            <Input
              label="Valor (R$)"
              type="number"
              step="0.01"
              min="0"
              error={txForm.formState.errors.amount?.message}
              {...txForm.register('amount')}
            />
            <Input label="Data" type="date" error={txForm.formState.errors.date?.message} {...txForm.register('date')} />
            <Input label="Descrição (opcional)" placeholder="Ex.: Supermercado" {...txForm.register('description')} />
            <Select
              label="Categoria"
              options={[
                { value: '', label: 'Selecione...' },
                ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
              ]}
              error={txForm.formState.errors.categoryId?.message}
              {...txForm.register('categoryId')}
            />
            {subcategoryOptions.length > 0 && (
              <Select
                label="Subcategoria"
                options={[{ value: '', label: 'Selecione...' }, ...subcategoryOptions]}
                {...txForm.register('subcategoryId')}
              />
            )}

            {txType === 'expense' && (
              <>
                <Select
                  label="Forma de pagamento"
                  options={[
                    { value: 'account', label: 'Conta / débito' },
                    { value: 'card', label: 'Cartão de crédito' },
                  ]}
                  error={txForm.formState.errors.paymentMethod?.message}
                  {...txForm.register('paymentMethod')}
                />
                {paymentMethod === 'card' && (
                  <>
                    <Select
                      label="Cartão"
                      options={
                        cardOptions.length
                          ? cardOptions
                          : [{ value: '', label: 'Cadastre um cartão primeiro' }]
                      }
                      error={txForm.formState.errors.cardId?.message}
                      {...txForm.register('cardId')}
                    />
                    <Input
                      label="Parcelas"
                      type="number"
                      min="1"
                      max="48"
                      error={txForm.formState.errors.installments?.message}
                      {...txForm.register('installments')}
                    />
                  </>
                )}
              </>
            )}

            {(txType === 'income' || paymentMethod === 'account') && (
              <Select
                label="Conta"
                options={accountOptions.length ? accountOptions : [{ value: '', label: 'Nenhuma conta' }]}
                error={txForm.formState.errors.accountId?.message}
                {...txForm.register('accountId')}
              />
            )}

            <Select
              label="Status"
              options={[
                { value: 'paid', label: 'Efetivada' },
                { value: 'pending', label: 'Prevista' },
              ]}
              {...txForm.register('status')}
            />

            {paymentMethod === 'account' && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveAsRecurrence}
                  onChange={(e) => setSaveAsRecurrence(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Repetir mensalmente (criar recorrência)</span>
              </label>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comprovante (opcional)
              </label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-primary-50 file:text-primary file:font-medium"
              />
              {attachment && (
                <p className="text-xs text-gray-400 mt-1">{attachment.name}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button
              type="submit"
              fullWidth
              size="lg"
              disabled={
                loading ||
                (paymentMethod === 'account' && accounts.length === 0) ||
                (paymentMethod === 'card' && cards.length === 0)
              }
            >
              {loading ? 'Salvando...' : 'Salvar lançamento'}
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}
