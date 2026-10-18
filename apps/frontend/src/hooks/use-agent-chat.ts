'use client'

import { useState, useCallback } from 'react'
import { apiService } from '@/lib/api'

export interface ChatMessage {
    id: string
    sender: 'user' | 'agent'
    text: string
    intent?: string
    spreadsheetUrl?: string | null
    documentUrl?: string | null
}

export const QUICK_PROMPTS = [
    { label: '💰 Cek Saldo', prompt: 'Berapa sisa saldoku bulan ini?' },
    { label: '☕ Catat Kopi 25rb', prompt: 'Catat pengeluaran beli kopi 25 ribu' },
    { label: '📄 Buat Google Docs', prompt: 'Buatkan dokumen laporan keuangan bulan ini di Google Docs' },
]

const INITIAL_MESSAGE: ChatMessage = {
    id: 'welcome',
    sender: 'agent',
    text: 'Halo Bos! Aku Black Shore, Bendahara sekaligus Sekretaris pribadimu. Mau catat transaksi, cek saldo, atau bikin laporan ke Google Docs hari ini?',
}

export function useAgentChat(userId: string) {
    const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_MESSAGE])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)

    const sendMessage = useCallback(
        async (overrideText?: string) => {
            const textToSend = (overrideText ?? input).trim()
            if (!textToSend || loading) return

            const userMsg: ChatMessage = {
                id: crypto.randomUUID(),
                sender: 'user',
                text: textToSend,
            }

            setMessages((prev) => [...prev, userMsg])
            if (!overrideText) setInput('')
            setLoading(true)

            try {
                const res = await apiService.sendChat(textToSend, userId)
                const agentMsg: ChatMessage = {
                    id: crypto.randomUUID(),
                    sender: 'agent',
                    text: res.reply,
                    intent: res.intent,
                    spreadsheetUrl: apiService.resolveBackendUrl(res.spreadsheet_url),
                    documentUrl: res.document_url,
                }
                setMessages((prev) => [...prev, agentMsg])
            } catch (err: any) {
                setMessages((prev) => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        sender: 'agent',
                        text: `⚠️ Waduh, ada gangguan sistem: ${err.message}`,
                    },
                ])
            } finally {
                setLoading(false)
            }
        },
        [input, loading, userId]
    )

    return {
        messages,
        input,
        setInput,
        loading,
        sendMessage,
        quickPrompts: QUICK_PROMPTS,
    }
}