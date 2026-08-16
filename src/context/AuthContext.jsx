import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [company, setCompany] = useState(null)
  const [employeeRecord, setEmployeeRecord] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (userId) => {
    const { data: profileRow } = await supabase
      .from('profiles')
      .select('id, full_name, email, company_id, is_platform_admin')
      .eq('id', userId)
      .single()

    setProfile(profileRow ?? null)

    if (profileRow?.company_id) {
      const { data: companyRow } = await supabase
        .from('companies')
        .select('*')
        .eq('id', profileRow.company_id)
        .single()
      setCompany(companyRow ?? null)
    } else {
      setCompany(null)
    }

    const { data: employeeRow, error: employeeError } = await supabase
      .from('employees')
      .select('id, employee_code, full_name, personal_email, phone, address, emergency_contact_name, emergency_contact_phone, bank_name, bank_account_number, bank_iban, joining_date, photo_url, department_id, designation_id, departments!employees_department_id_fkey(name), designations(name)')
      .eq('user_id', userId)
      .maybeSingle()

    if (employeeError) console.error('Failed to load employee record:', employeeError.message)
    setEmployeeRecord(employeeRow ?? null)
  }, [])

  useEffect(() => {
    let isMounted = true

    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
      if (!isMounted) return
      setSession(initialSession)
      if (initialSession?.user) {
        loadProfile(initialSession.user.id).finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
      if (newSession?.user) {
        loadProfile(newSession.user.id)
      } else {
        setProfile(null)
        setCompany(null)
        setEmployeeRecord(null)
      }
    })

    return () => {
      isMounted = false
      listener.subscription.unsubscribe()
    }
  }, [loadProfile])

  const refreshProfile = useCallback(() => {
    if (session?.user) return loadProfile(session.user.id)
  }, [session, loadProfile])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    company,
    employeeRecord,
    loading,
    signOut,
    refreshProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
