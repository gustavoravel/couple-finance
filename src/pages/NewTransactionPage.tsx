import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import {
  createTransaction,
  createCardTransaction,
  editInstallmentGroup,
  editTransaction,
  stripInstallmentSuffix,
  updateTransaction,
} from '@/services/transactionService'
import { createTransfer } from '@/services/transferService'
import { createRecurrence } from '@/services/recurrenceService'
import { uploadAttachment } from '@/services/storageService'
import { advanceRunDate } from '@/lib/recurrenceUtils'
import type { Recurrence, Transaction } from '@/types'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { toISODate } from '@/lib/format'

type EntryMode = 'expense' | 'income' | 'transfer' | 'investment'

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

function resolveMode(tx: Transaction, categories: { id: string; kind: string }[]): EntryMode {
  if (tx.type === 'income') return 'income'
  const cat = categories.find((c) => c.id === tx.categoryId)
  if (cat?.kind === 'investment') return 'investment'
  return 'expense'
}

export function NewTransactionPage() {
  const { txId } = useParams<{ txId?: string }>()
  const isEdit = Boolean(txId)
  const { user } = useAuth()
  const { household, accounts, cards, categories, transactions } = useHousehold()
  const navigate = useNavigate()
  const [mode, setMode] = useState<EntryMode>('expense')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [attachment, setAttachment] = useState<File | null>(null)
  const [saveAsRecurrence, setSaveAsRecurrence] = useState(false)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [hydrated, setHydrated] = useState(!isEdit)

  const isInstallmentGroup = Boolean(
    editingTx?.installment && editingTx.installment.total > 1,
  )

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

  useEffect(() => {
    if (!isEdit || !txId) {
      setHydrated(true)
      return
    }
    const tx = transactions.find((t) => t.id === txId)
    if (!tx) {
      if (transactions.length > 0) {
        setError('Lançamento não encontrado')
        setHydrated(true)
      }
      return
    }

    setEditingTx(tx)
    const nextMode = resolveMode(tx, categories)
    setMode(nextMode)

    const amount =
      tx.installment && tx.installment.total > 1
        ? Math.round(tx.amount * tx.installment.total * 100) / 100
        : tx.amount

    txForm.reset({
      type: tx.type,
      amount,
      date: tx.date,
      description: stripInstallmentSuffix(tx.description),
      categoryId: tx.categoryId,
      subcategoryId: tx.subcategoryId ?? '',
      paymentMethod: tx.paymentMethod,
      accountId: tx.accountId ?? accounts[0]?.id ?? '',
      cardId: tx.cardId ?? cards[0]?.id ?? '',
      installments: tx.installment?.total ?? 1,
      status: tx.status,
    })
    setHydrated(true)
  }, [isEdit, txId, transactions, categories, accounts, cards, txForm])

  const txType = txForm.watch('type')
  const categoryId = txForm.watch('categoryId')
  const paymentMethod = txForm.watch('paymentMethod')

  const filteredCategories = useMemo(() => {
    if (mode === 'investment') return categories.filter((c) => c.kind === 'investment')
    return categories.filter((c) => c.kind === (txType === 'income' ? 'income' : 'expense'))
  }, [categories, txType, mode])

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subcategoryOptions = (selectedCategory?.subcategories ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const accountOptions = accounts.map((a) => ({ value: a.id, label: a.name }))
  const cardOptions = cards.map((c) => ({ value: c.id, label: c.name }))

  const switchMode = (m: EntryMode) => {
    if (isEdit) return
    setMode(m)
    setError('')
    if (m !== 'transfer') {
      txForm.setValue('type', m === 'investment' ? 'expense' : m)
      txForm.setValue('categoryId', '')
      if (m === 'income' || m === 'investment') {
        txForm.setValue('paymentMethod', 'account')
      }
    }
  }

  const onSubmitTx = async (data: TxFormData) => {
    if (!household || !user) return
    setError('')
    setLoading(true)
    try {
      if (isEdit && editingTx) {
        if (isInstallmentGroup) {
          await editInstallmentGroup(household.id, editingTx, {
            description: data.description ?? '',
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId || undefined,
            status: data.status,
            amountTotal: data.amount,
          })
        } else {
          await editTransaction(household.id, editingTx, {
            type: data.type,
            amount: data.amount,
            date: data.date,
            description: data.description ?? '',
            categoryId: data.categoryId,
            subcategoryId: data.subcategoryId || undefined,
            paymentMethod: data.paymentMethod,
            accountId: data.accountId,
            cardId: data.cardId,
            status: data.status,
          })
        }

        if (attachment) {
          const url = await uploadAttachment(household.id, editingTx.id, attachment)
          await updateTransaction(household.id, editingTx.id, { attachmentUrl: url })
        }

        navigate('/lancamentos')
        return
      }

      let newTxId: string | undefined

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
        newTxId = ids[0]
      } else {
        newTxId = await createTransaction(household.id, {
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

      if (attachment && newTxId) {
        const url = await uploadAttachment(household.id, newTxId, attachment)
        await updateTransaction(household.id, newTxId, { attachmentUrl: url })
      }

      if (saveAsRecurrence && data.paymentMethod === 'account') {
        const [, , day] = data.date.split('-').map(Number)
        const recurrenceBase = {
          id: '',
          template: {} as Recurrence['template'],
          frequency: 'monthly' as const,
          dayOfMonth: day,
          nextRunDate: data.date,
          active: true,
          createdBy: '',
        }
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
          nextRunDate: advanceRunDate(data.date, recurrenceBase),
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

  if (!hydrated) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <header>
        <h1 className="text-xl font-bold text-gray-900">
          {isEdit ? 'Editar lançamento' : 'Novo lançamento'}
        </h1>
        {isInstallmentGroup && editingTx?.installment && (
          <p className="text-sm text-amber-700 mt-1">
            Alterações serão aplicadas às {editingTx.installment.total} parcelas do grupo.
            Valor informado é o total da compra.
          </p>
        )}
      </header>

      {!isEdit && (
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'expense' as const, label: 'Saída', active: 'bg-red-500 text-white' },
            { key: 'income' as const, label: 'Entrada', active: 'bg-green-500 text-white' },
            { key: 'investment' as const, label: 'Investimento', active: 'bg-blue-600 text-white' },
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
      )}

      {mode === 'transfer' && !isEdit ? (
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
              label={isInstallmentGroup ? 'Valor total (R$)' : 'Valor (R$)'}
              type="number"
              step="0.01"
              min="0"
              error={txForm.formState.errors.amount?.message}
              {...txForm.register('amount')}
            />
            <Input
              label="Data"
              type="date"
              disabled={isInstallmentGroup}
              error={txForm.formState.errors.date?.message}
              {...txForm.register('date')}
            />
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

            {txType === 'expense' && mode !== 'investment' && (
              <>
                <Select
                  label="Forma de pagamento"
                  options={[
                    { value: 'account', label: 'Conta / débito' },
                    { value: 'card', label: 'Cartão de crédito' },
                  ]}
                  disabled={isEdit}
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
                      disabled={isEdit}
                      error={txForm.formState.errors.cardId?.message}
                      {...txForm.register('cardId')}
                    />
                    {!isEdit && (
                      <Input
                        label="Parcelas"
                        type="number"
                        min="1"
                        max="48"
                        error={txForm.formState.errors.installments?.message}
                        {...txForm.register('installments')}
                      />
                    )}
                    {isInstallmentGroup && editingTx?.installment && (
                      <p className="text-xs text-gray-500">
                        Parcelado em {editingTx.installment.total}x · cartão e faturas permanecem iguais
                      </p>
                    )}
                  </>
                )}
              </>
            )}

            {(txType === 'income' || paymentMethod === 'account' || mode === 'investment') && (
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

            {!isEdit && paymentMethod === 'account' && (
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
              {isEdit && editingTx?.attachmentUrl && !attachment && (
                <a
                  href={editingTx.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary mt-1 inline-block"
                >
                  Ver comprovante atual
                </a>
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
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Salvar lançamento'}
            </Button>
            {isEdit && (
              <Button type="button" variant="ghost" fullWidth onClick={() => navigate('/lancamentos')}>
                Cancelar
              </Button>
            )}
          </form>
        </Card>
      )}
    </div>
  )
}
