import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getHousehold } from '@/services/householdService'
import { subscribeAccounts } from '@/services/accountService'
import { subscribeCategories } from '@/services/categoryService'
import { subscribeTransactions } from '@/services/transactionService'
import type { Account, Category, Household, Transaction } from '@/types'

interface HouseholdContextValue {
  household: Household | null
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  loading: boolean
  refreshProfile: () => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth()
  const [household, setHousehold] = useState<Household | null>(null)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  const householdId = profile?.householdId

  useEffect(() => {
    if (!householdId) {
      setHousehold(null)
      setAccounts([])
      setCategories([])
      setTransactions([])
      setLoading(false)
      return
    }

    setLoading(true)
    getHousehold(householdId).then((h) => {
      setHousehold(h)
      setLoading(false)
    })

    const unsubAccounts = subscribeAccounts(householdId, setAccounts)
    const unsubCategories = subscribeCategories(householdId, setCategories)
    const unsubTransactions = subscribeTransactions(householdId, setTransactions)

    return () => {
      unsubAccounts()
      unsubCategories()
      unsubTransactions()
    }
  }, [householdId])

  const refreshProfile = async () => {
    if (!user) return
    const { getUserProfile } = await import('@/services/householdService')
    const p = await getUserProfile(user.uid)
    if (p?.householdId) {
      const h = await getHousehold(p.householdId)
      setHousehold(h)
    }
  }

  return (
    <HouseholdContext.Provider
      value={{ household, accounts, categories, transactions, loading, refreshProfile }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold must be used within HouseholdProvider')
  return ctx
}
