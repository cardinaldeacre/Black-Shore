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

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const connected = params.get('connected')
        const urlUserId = params.get('userId')
        const urlEmail = params.get('email')

        if (connected === 'true' && urlUserId) {
            localStorage.setItem(STORAGE_KEYS.USER_ID, urlUserId)
            if (urlEmail) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, urlEmail)
            setUserId(urlUserId)
            setUserEmail(urlEmail)
            window.history.replaceState({}, '', '/')
            onLoginSuccess?.()
            return
        }

        const savedId = localStorage.getItem(STORAGE_KEYS.USER_ID)
        const savedEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL)
        if (savedId) setUserId(savedId)
        if (savedEmail) setUserEmail(savedEmail)
    }, [onLoginSuccess])

    const loginWithGoogle = useCallback(() => {
        window.location.href = apiService.getGoogleSignInUrl()
    }, [])

    const logoutGoogle = useCallback(async () => {
        await apiService.disconnectGoogle(userId)
        localStorage.removeItem(STORAGE_KEYS.USER_ID)
        localStorage.removeItem(STORAGE_KEYS.USER_EMAIL)
        setUserId('guest')
        setUserEmail(null)
    }, [userId])

    return {
        userId,
        userEmail,
        isConnected: Boolean(userEmail),
        loginWithGoogle,
        logoutGoogle,
    }
}