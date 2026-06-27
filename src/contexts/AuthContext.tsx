import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { auth, googleProvider } from '@/lib/firebase'
import { getUserProfile, upsertUserProfile } from '@/services/householdService'
import type { UserProfile } from '@/types'

interface AuthContextValue {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser)
      if (firebaseUser) {
        let userProfile = await getUserProfile(firebaseUser.uid)
        if (!userProfile) {
          userProfile = {
            displayName: firebaseUser.displayName ?? '',
            email: firebaseUser.email ?? '',
            photoUrl: firebaseUser.photoURL ?? undefined,
          }
          await upsertUserProfile(firebaseUser.uid, userProfile)
        }
        setProfile(userProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })
  }, [])

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password)
  }

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await updateProfile(cred.user, { displayName })
    await upsertUserProfile(cred.user.uid, {
      displayName,
      email,
    })
  }

  const signInWithGoogle = async () => {
    const cred = await signInWithPopup(auth, googleProvider)
    await upsertUserProfile(cred.user.uid, {
      displayName: cred.user.displayName ?? '',
      email: cred.user.email ?? '',
      photoUrl: cred.user.photoURL ?? undefined,
    })
  }

  const logout = async () => {
    await signOut(auth)
  }

  const refreshProfile = async () => {
    if (!user) return
    const userProfile = await getUserProfile(user.uid)
    if (userProfile) setProfile(userProfile)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signUp, signInWithGoogle, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
