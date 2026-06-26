import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useHousehold } from '@/contexts/HouseholdContext'
import { createTransaction } from '@/services/transactionService'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Card } from '@/components/ui/Card'
import { toISODate } from '@/lib/format'

const schema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.coerce.number().positive('Valor deve ser positivo'),
  date: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().min(1, 'Selecione uma categoria'),
  subcategoryId: z.string().optional(),
  accountId: z.string().min(1, 'Selecione uma conta'),
  status: z.enum(['paid', 'pending']),
})

type FormData = z.infer<typeof schema>

export function NewTransactionPage() {
  const { user } = useAuth()
  const { household, accounts, categories } = useHousehold()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'expense',
      date: toISODate(new Date()),
      status: 'paid',
      accountId: accounts[0]?.id ?? '',
    },
  })

  const txType = watch('type')
  const categoryId = watch('categoryId')

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.kind === (txType === 'income' ? 'income' : 'expense')),
    [categories, txType],
  )

  const selectedCategory = categories.find((c) => c.id === categoryId)
  const subcategoryOptions = (selectedCategory?.subcategories ?? []).map((s) => ({
    value: s.id,
    label: s.name,
  }))

  const onSubmit = async (data: FormData) => {
    if (!household || !user) return
    setError('')
    setLoading(true)
    try {
      await createTransaction(household.id, {
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
      navigate('/lancamentos')
    } catch {
      setError('Erro ao salvar lançamento')
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
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setValue('type', t)
              setValue('categoryId', '')
            }}
            className={[
              'flex-1 py-3 rounded-xl text-sm font-semibold transition-colors',
              txType === t
                ? t === 'income'
                  ? 'bg-green-500 text-white'
                  : 'bg-red-500 text-white'
                : 'bg-white text-gray-600 border border-gray-200',
            ].join(' ')}
          >
            {t === 'income' ? 'Entrada' : 'Saída'}
          </button>
        ))}
      </div>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <input type="hidden" {...register('type')} />

          <Input
            label="Valor (R$)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0,00"
            error={errors.amount?.message}
            {...register('amount')}
          />

          <Input label="Data" type="date" error={errors.date?.message} {...register('date')} />

          <Input label="Descrição (opcional)" placeholder="Ex.: Supermercado" {...register('description')} />

          <Select
            label="Categoria"
            options={[
              { value: '', label: 'Selecione...' },
              ...filteredCategories.map((c) => ({ value: c.id, label: c.name })),
            ]}
            error={errors.categoryId?.message}
            {...register('categoryId')}
          />

          {subcategoryOptions.length > 0 && (
            <Select
              label="Subcategoria"
              options={[{ value: '', label: 'Selecione...' }, ...subcategoryOptions]}
              {...register('subcategoryId')}
            />
          )}

          <Select
            label="Conta"
            options={
              accounts.length > 0
                ? accounts.map((a) => ({ value: a.id, label: a.name }))
                : [{ value: '', label: 'Nenhuma conta cadastrada' }]
            }
            error={errors.accountId?.message}
            {...register('accountId')}
          />

          <Select
            label="Status"
            options={[
              { value: 'paid', label: 'Efetivada' },
              { value: 'pending', label: 'Prevista' },
            ]}
            {...register('status')}
          />

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" fullWidth size="lg" disabled={loading || accounts.length === 0}>
            {loading ? 'Salvando...' : 'Salvar lançamento'}
          </Button>

          {accounts.length === 0 && (
            <p className="text-sm text-amber-600 text-center">
              Cadastre uma conta antes de lançar movimentações
            </p>
          )}
        </form>
      </Card>
    </div>
  )
}
