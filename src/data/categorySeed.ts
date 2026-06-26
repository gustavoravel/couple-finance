import type { CategoryKind } from '@/types'

interface SeedSubcategory {
  name: string
}

interface SeedCategory {
  name: string
  kind: CategoryKind
  color: string
  icon: string
  subcategories: SeedSubcategory[]
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function buildCategorySeed(): Array<{
  name: string
  kind: CategoryKind
  color: string
  icon: string
  order: number
  subcategories: Array<{ id: string; name: string }>
}> {
  const raw: SeedCategory[] = [
    {
      name: 'Renda',
      kind: 'income',
      color: '#22C55E',
      icon: 'wallet',
      subcategories: [
        { name: 'Salário' },
        { name: 'Salário cônjuge' },
        { name: 'Salário outros' },
        { name: 'Aposentadoria de familiar' },
        { name: '13º salário/Férias' },
        { name: 'Bônus anual' },
        { name: 'Renda de imóveis alugados' },
        { name: 'Resgate de investimentos' },
        { name: 'Juros de investimentos' },
        { name: 'Rendas extras (bicos/temporários)' },
        { name: 'Vendas de bens ou objetos' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Despesas com a renda',
      kind: 'expense',
      color: '#EF4444',
      icon: 'receipt',
      subcategories: [
        { name: 'Imposto de renda' },
        { name: 'INSS' },
        { name: 'Tarifas bancárias' },
        { name: 'Outras' },
      ],
    },
    {
      name: 'Dívidas / negociações',
      kind: 'expense',
      color: '#F97316',
      icon: 'alert-circle',
      subcategories: [
        { name: 'Empréstimos pessoais e consignados' },
        { name: 'Financiamentos atrasados' },
        { name: 'Juros de cheque especial' },
        { name: 'Rotativo do cartão' },
        { name: 'Empréstimos familiares' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Despesas da casa',
      kind: 'expense',
      color: '#8B5CF6',
      icon: 'home',
      subcategories: [
        { name: 'Aluguel' },
        { name: 'Financiamento imobiliário' },
        { name: 'IPTU' },
        { name: 'Condomínio' },
        { name: 'Água' },
        { name: 'Luz' },
        { name: 'Gás' },
        { name: 'Mensalista/diarista' },
        { name: 'Internet/TV' },
        { name: 'Telefone fixo' },
        { name: 'Celular' },
        { name: 'Reformas/consertos' },
        { name: 'Seguro da casa' },
        { name: 'Animais de estimação' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Alimentação',
      kind: 'expense',
      color: '#F59E0B',
      icon: 'utensils',
      subcategories: [
        { name: 'Supermercado' },
        { name: 'Açougue' },
        { name: 'Hortifruti/feira' },
        { name: 'Padaria' },
        { name: 'Mercearia' },
        { name: 'Restaurante do dia a dia' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Saúde e proteção',
      kind: 'expense',
      color: '#EC4899',
      icon: 'heart-pulse',
      subcategories: [
        { name: 'Convênio médico' },
        { name: 'Médico' },
        { name: 'Dentista' },
        { name: 'Terapeuta' },
        { name: 'Medicamentos e tratamentos' },
        { name: 'Seguro de vida' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Transporte',
      kind: 'expense',
      color: '#3B82F6',
      icon: 'car',
      subcategories: [
        { name: 'Financiamento do automóvel' },
        { name: 'Combustível' },
        { name: 'Lavagens' },
        { name: 'Licenciamento' },
        { name: 'Seguro' },
        { name: 'IPVA' },
        { name: 'Mecânico' },
        { name: 'Estacionamento' },
        { name: 'Multas' },
        { name: 'Transporte público' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Educação',
      kind: 'expense',
      color: '#6366F1',
      icon: 'graduation-cap',
      subcategories: [
        { name: 'Matrícula' },
        { name: 'Mensalidade escolar' },
        { name: 'Material didático' },
        { name: 'Uniforme' },
        { name: 'Perua escolar' },
        { name: 'Cursos/línguas' },
        { name: 'Livros' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Cuidados pessoais, beleza e bem-estar',
      kind: 'expense',
      color: '#D946EF',
      icon: 'sparkles',
      subcategories: [
        { name: 'Higiene pessoal' },
        { name: 'Barbeiro/cabeleireiro' },
        { name: 'Manicure e depilação' },
        { name: 'Vestuário' },
        { name: 'Calçados' },
        { name: 'Acessórios' },
        { name: 'Academia' },
        { name: 'Lavanderia' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Celebrações e compromissos sociais',
      kind: 'expense',
      color: '#14B8A6',
      icon: 'gift',
      subcategories: [
        { name: 'Buffet/festas' },
        { name: 'Presentes' },
        { name: 'Aluguel de roupas' },
        { name: 'Celebrações no trabalho' },
        { name: 'Celebrações na igreja' },
        { name: 'Dízimos e doações' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Lazer e viagens',
      kind: 'expense',
      color: '#0EA5E9',
      icon: 'plane',
      subcategories: [
        { name: 'Restaurantes no fim de semana' },
        { name: 'Passeios/bares/cafés' },
        { name: 'Livraria' },
        { name: 'Cinema' },
        { name: 'Jogos' },
        { name: 'Assinaturas (Spotify, Netflix...)' },
        { name: 'Viagens' },
        { name: 'Outros' },
      ],
    },
    {
      name: 'Investimentos',
      kind: 'investment',
      color: '#7F3DFF',
      icon: 'trending-up',
      subcategories: [
        { name: 'Previdência' },
        { name: 'Poupança' },
        { name: 'Renda fixa (CDB, CDI...)' },
        { name: 'Fundos' },
        { name: 'Outros' },
      ],
    },
  ]

  return raw.map((cat, index) => ({
    name: cat.name,
    kind: cat.kind,
    color: cat.color,
    icon: cat.icon,
    order: index,
    subcategories: cat.subcategories.map((sub) => ({
      id: slugify(`${cat.name}-${sub.name}`),
      name: sub.name,
    })),
  }))
}
