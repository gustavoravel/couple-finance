import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2, X } from 'lucide-react'
import { useHousehold } from '@/contexts/HouseholdContext'
import {
  addSubcategory,
  createCategory,
  deleteCategory,
  removeSubcategory,
  renameSubcategory,
  updateCategory,
} from '@/services/categoryService'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Icon } from '@/components/ui/Icon'
import { IconPicker } from '@/components/ui/IconPicker'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import type { Category, CategoryKind } from '@/types'

const kindLabels: Record<CategoryKind, string> = {
  income: 'Renda',
  expense: 'Despesa',
  investment: 'Investimento',
}

const kindOrder: CategoryKind[] = ['income', 'expense', 'investment']

const emptyForm = {
  name: '',
  kind: 'expense' as CategoryKind,
  color: '#7F3DFF',
  icon: 'tag',
}

export function CategoriesPage() {
  const { household, categories } = useHousehold()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [newSubName, setNewSubName] = useState('')
  const [editingSubId, setEditingSubId] = useState<string | null>(null)
  const [editingSubName, setEditingSubName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const grouped = useMemo(() => {
    return kindOrder.map((kind) => ({
      kind,
      items: categories.filter((c) => c.kind === kind),
    }))
  }, [categories])

  const resetForm = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
    setError('')
  }

  const openCreate = () => {
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(true)
    setError('')
  }

  const openEdit = (cat: Category) => {
    setForm({
      name: cat.name,
      kind: cat.kind,
      color: cat.color,
      icon: cat.icon,
    })
    setEditingId(cat.id)
    setShowForm(true)
    setError('')
  }

  const handleSave = async () => {
    if (!household || !form.name.trim()) return
    setLoading(true)
    setError('')
    try {
      if (editingId) {
        await updateCategory(household.id, editingId, {
          name: form.name.trim(),
          kind: form.kind,
          color: form.color,
          icon: form.icon,
        })
      } else {
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.order), -1)
        await createCategory(household.id, {
          name: form.name.trim(),
          kind: form.kind,
          color: form.color,
          icon: form.icon,
          order: maxOrder + 1,
          subcategories: [],
        })
      }
      resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar categoria')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (cat: Category) => {
    if (!household || !confirm(`Excluir a categoria "${cat.name}"?`)) return
    setError('')
    try {
      await deleteCategory(household.id, cat.id)
      if (expandedId === cat.id) setExpandedId(null)
      if (editingId === cat.id) resetForm()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir categoria')
    }
  }

  const handleAddSub = async (cat: Category) => {
    if (!household || !newSubName.trim()) return
    setError('')
    try {
      await addSubcategory(household.id, cat, newSubName)
      setNewSubName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao adicionar subcategoria')
    }
  }

  const handleRenameSub = async (cat: Category) => {
    if (!household || !editingSubId || !editingSubName.trim()) return
    setError('')
    try {
      await renameSubcategory(household.id, cat, editingSubId, editingSubName)
      setEditingSubId(null)
      setEditingSubName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao renomear subcategoria')
    }
  }

  const handleRemoveSub = async (cat: Category, subId: string, subName: string) => {
    if (!household || !confirm(`Excluir a subcategoria "${subName}"?`)) return
    setError('')
    try {
      await removeSubcategory(household.id, cat, subId)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao excluir subcategoria')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Categorias</h1>
          <p className="text-sm text-gray-500">{categories.length} categorias</p>
        </div>
        <Button size="sm" onClick={showForm && !editingId ? resetForm : openCreate}>
          <Plus className="w-4 h-4" />
          Nova
        </Button>
      </header>

      {error && (
        <Card padding="sm" className="bg-red-50 border-red-100">
          <p className="text-sm text-red-600">{error}</p>
        </Card>
      )}

      {showForm && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {editingId ? 'Editar categoria' : 'Nova categoria'}
            </h2>
            <button type="button" onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <Input
              label="Nome"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Ex.: Alimentação"
            />
            <Select
              label="Tipo"
              options={kindOrder.map((k) => ({ value: k, label: kindLabels[k] }))}
              value={form.kind}
              onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as CategoryKind }))}
            />
            <ColorPicker
              value={form.color}
              onChange={(color) => setForm((f) => ({ ...f, color }))}
            />
            <IconPicker
              value={form.icon}
              color={form.color}
              onChange={(icon) => setForm((f) => ({ ...f, icon }))}
            />
            <div className="flex gap-2 pt-1">
              <Button variant="ghost" onClick={resetForm}>
                Cancelar
              </Button>
              <Button fullWidth onClick={handleSave} disabled={loading || !form.name.trim()}>
                {loading ? 'Salvando...' : editingId ? 'Salvar' : 'Criar categoria'}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {grouped.map(({ kind, items }) =>
        items.length === 0 ? null : (
          <section key={kind} className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide px-1">
              {kindLabels[kind]}
            </h2>
            {items.map((cat) => {
              const expanded = expandedId === cat.id
              return (
                <Card key={cat.id} padding="sm" className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedId(expanded ? null : cat.id)}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${cat.color}22`, color: cat.color }}
                      >
                        <Icon name={cat.icon} size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{cat.name}</p>
                        <p className="text-xs text-gray-400">
                          {cat.subcategories.length} subcategoria
                          {cat.subcategories.length === 1 ? '' : 's'}
                        </p>
                      </div>
                      {expanded ? (
                        <ChevronDown className="w-4 h-4 text-gray-300 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      className="p-2 text-gray-300 hover:text-primary transition-colors"
                      aria-label="Editar"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                      aria-label="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {expanded && (
                    <div className="pl-2 border-t border-gray-50 pt-2 flex flex-col gap-2">
                      {cat.subcategories.map((sub) => (
                        <div key={sub.id} className="flex items-center gap-2">
                          {editingSubId === sub.id ? (
                            <>
                              <Input
                                value={editingSubName}
                                onChange={(e) => setEditingSubName(e.target.value)}
                                className="flex-1"
                              />
                              <Button size="sm" onClick={() => handleRenameSub(cat)}>
                                Ok
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setEditingSubId(null)
                                  setEditingSubName('')
                                }}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <p className="flex-1 text-sm text-gray-700 py-1.5 px-2">{sub.name}</p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSubId(sub.id)
                                  setEditingSubName(sub.name)
                                }}
                                className="p-1.5 text-gray-300 hover:text-primary"
                                aria-label="Renomear"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveSub(cat, sub.id, sub.name)}
                                className="p-1.5 text-gray-300 hover:text-red-500"
                                aria-label="Excluir subcategoria"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                      <div className="flex gap-2 items-end">
                        <Input
                          label="Nova subcategoria"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          placeholder="Ex.: Supermercado"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddSub(cat)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          className="mb-0.5 shrink-0"
                          onClick={() => handleAddSub(cat)}
                          disabled={!newSubName.trim()}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </Card>
              )
            })}
          </section>
        ),
      )}

      {categories.length === 0 && !showForm && (
        <Card>
          <p className="text-center text-gray-400 py-8">Nenhuma categoria cadastrada</p>
        </Card>
      )}
    </div>
  )
}
