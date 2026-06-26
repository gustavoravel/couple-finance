import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { getHousehold, getMemberProfiles } from '@/services/householdService'
import { subscribeAccounts } from '@/services/accountService'
import { subscribeCategories } from '@/services/categoryService'
import { subscribeTransactions } from '@/services/transactionService'
import { subscribeTransfers } from '@/services/transferService'
import type { Account, Category, Household, Transaction, Transfer } from '@/types'

export interface MemberInfo {
  uid: string
  name: string
}

interface HouseholdContextValue {
  household: Household | null
  accounts: Account[]
  categories: Category[]
  transactions: Transaction[]
  transfers: Transfer[]
  members: MemberInfo[]
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
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [members, setMembers] = useState<MemberInfo[]>([])
  const [loading, setLoading] = useState(true)

  const householdId = profile?.householdId

  useEffect(() => {
    if (!householdId) {
      setHousehold(null)
      setAccounts([])
      setCategories([])
      setTransactions([])
      setTransfers([])
      setMembers([])
      setLoading(false)
      return
    }

    setLoading(true)
    getHousehold(householdId).then(async (h) => {
      setHousehold(h)
      if (h) {
        const memberProfiles = await getMemberProfiles(h.members)
        setMembers(memberProfiles)
      }
      setLoading(false)
    })

    const unsubAccounts = subscribeAccounts(householdId, setAccounts)
    const unsubCategories = subscribeCategories(householdId, setCategories)
    const unsubTransactions = subscribeTransactions(householdId, setTransactions)
    const unsubTransfers = subscribeTransfers(householdId, setTransfers)

    return () => {
      unsubAccounts()
      unsubCategories()
      unsubTransactions()
      unsubTransfers()
    }
  }, [householdId])

  const refreshProfile = async () => {
    if (!user) return
    const { getUserProfile } = await import('@/services/householdService')
    const p = await getUserProfile(user.uid)
    if (p?.householdId) {
      const h = await getHousehold(p.householdId)
      setHousehold(h)
      if (h) {
        setMembers(await getMemberProfiles(h.members))
      }
    }
  }

  return (
    <HouseholdContext.Provider
      value={{
        household,
        accounts,
        categories,
        transactions,
        transfers,
        members,
        loading,
        refreshProfile,
      }}
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
