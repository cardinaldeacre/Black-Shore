'use client'

import { useState, useEffect, useCallback } from 'react'
import { apiService } from '@/lib/api'

const STORAGE_KEYS = {
    USER_ID: 'bs_user_id',
    USER_EMAIL: 'bs_user_email',
}

export function useAuthSession(onLoginSuccess?: () => void) {
    const [userId, setUserId] = useState<string>('guest')
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)

        if (params.get('connected') === 'true') {
            const urlEmail = params.get('email')
            const resolvedUserId = params.get('userId') || urlEmail || 'guest'

            localStorage.setItem(STORAGE_KEYS.USER_ID, resolvedUserId)
            if (urlEmail) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, urlEmail)

            setUserId(resolvedUserId)
            setUserEmail(urlEmail)
            window.history.replaceState({}, '', window.location.pathname)
            onLoginSuccess?.()
            return
        }

        const savedId = localStorage.getItem(STORAGE_KEYS.USER_ID)
        const savedEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL)
        if (savedId) setUserId(savedId)
        if (savedEmail) setUserEmail(savedEmail)
    }, [onLoginSuccess])

    useEffect(() => {
        if (userId === 'guest') {
            setIsConnected(false)
            return
        }

        let cancelled = false
        apiService
            .getStatus(userId)
            .then((res) => {
                if (cancelled) return
                setIsConnected(res.connected)
                if (!res.connected) {
                    localStorage.removeItem(STORAGE_KEYS.USER_ID)
                    localStorage.removeItem(STORAGE_KEYS.USER_EMAIL)
                    setUserId('guest')
                    setUserEmail(null)
                }
            })
            .catch((err) => {
                console.error('getStatus gagal:', err)
                if (!cancelled) setIsConnected(false)
            })

        return () => {
            cancelled = true
        }
    }, [userId])

    const loginWithGoogle = useCallback(() => {
        window.location.href = apiService.getGoogleSignInUrl()
    }, [])

    const logoutGoogle = useCallback(async () => {
        await apiService.disconnectGoogle(userId)
        localStorage.removeItem(STORAGE_KEYS.USER_ID)
        localStorage.removeItem(STORAGE_KEYS.USER_EMAIL)
        setUserId('guest')
        setUserEmail(null)
        setIsConnected(false)
    }, [userId])

    return { userId, userEmail, isConnected, loginWithGoogle, logoutGoogle }
}