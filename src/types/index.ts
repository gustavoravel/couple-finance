export type AccountType = 'checking' | 'savings' | 'wallet' | 'investment' | 'emergency_reserve'
export type CategoryKind = 'income' | 'expense' | 'investment'
export type TransactionType = 'income' | 'expense'
export type PaymentMethod = 'account' | 'card'
export type TransactionStatus = 'paid' | 'pending'

export interface UserProfile {
  displayName: string
  email: string
  photoUrl?: string
  householdId?: string
  preferences?: {
    theme?: 'light' | 'dark'
    defaultAccountId?: string
    notificationsEnabled?: boolean
    reminderDaysBefore?: number
  }
}

export interface Household {
  id: string
  name: string
  members: string[]
  currency: string
  inviteCode: string
  createdAt: string
}

export interface Subcategory {
  id: string
  name: string
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  color: string
  icon: string
  order: number
  subcategories: Subcategory[]
}

export interface Account {
  id: string
  name: string
  type: AccountType
  initialBalance: number
  currentBalance: number
  includeInTotal: boolean
  ownerUid: string | 'shared'
  color: string
  icon: string
  archived: boolean
  emergencyTargetMonths?: number
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  date: string
  description: string
  categoryId: string
  subcategoryId?: string
  paymentMethod: PaymentMethod
  accountId?: string
  cardId?: string
  invoiceId?: string
  status: TransactionStatus
  installment?: { groupId: string; current: number; total: number } | null
  recurrenceId?: string | null
  createdBy: string
  tags?: string[]
  attachmentUrl?: string
}

export interface CreditCard {
  id: string
  name: string
  brand: string
  limit: number
  closingDay: number
  dueDay: number
  paymentAccountId: string
  ownerUid: string | 'shared'
  color: string
  icon: string
}

export type InvoiceStatus = 'open' | 'closed' | 'paid'

export interface Invoice {
  id: string
  cardId: string
  competencia: string
  closingDate: string
  dueDate: string
  total: number
  /** Soma dos pagamentos/adiantamentos já feitos nesta fatura */
  paidAmount?: number
  status: InvoiceStatus
  paidAt?: string
  paidFromAccountId?: string
  paymentTransferId?: string
}

export interface Transfer {
  id: string
  fromAccountId: string
  toAccountId?: string
  cardId?: string
  amount: number
  date: string
  description: string
  createdBy: string
  kind: 'transfer' | 'invoice_payment'
}

export interface Goal {
  id: string
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string
  monthlyContribution: number
  linkedAccountId?: string | null
  icon: string
  color: string
}

export interface Budget {
  id: string
  categoryId: string
  competencia: string
  recurring: boolean
  plannedAmount: number
}

export type RecurrenceFrequency = 'monthly' | 'weekly' | 'yearly'

export interface RecurrenceTemplate {
  type: TransactionType
  amount: number
  categoryId: string
  subcategoryId?: string
  description: string
  paymentMethod: PaymentMethod
  accountId?: string
  cardId?: string
  status: TransactionStatus
}

export interface Recurrence {
  id: string
  template: RecurrenceTemplate
  frequency: RecurrenceFrequency
  dayOfMonth?: number
  dayOfWeek?: number
  nextRunDate: string
  active: boolean
  createdBy: string
}
