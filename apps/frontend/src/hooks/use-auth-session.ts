'use client';

import {useState, useEffect, useCallback} from 'react';
import {apiService} from '@/lib/api';

const STORAGE_KEYS = {
	USER_ID: 'bs_user_id',
	USER_EMAIL: 'bs_user_email',
	SESSION_TOKEN: 'black_shore_session',
};

export function useAuthSession(onLoginSuccess?: () => void) {
	const [userId, setUserId] = useState<string>('guest');
	const [userEmail, setUserEmail] = useState<string | null>(null);
	const [isConnected, setIsConnected] = useState(false);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);

		if (params.get('connected') === 'true') {
			const urlEmail = params.get('email');
			const resolvedUserId = params.get('userId') || urlEmail || 'guest';

			localStorage.setItem(STORAGE_KEYS.USER_ID, resolvedUserId);
			if (urlEmail) localStorage.setItem(STORAGE_KEYS.USER_EMAIL, urlEmail);

			setUserId(resolvedUserId);
			setUserEmail(urlEmail);
			window.history.replaceState({}, '', window.location.pathname);
			onLoginSuccess?.();
			return;
		}

		let savedId = localStorage.getItem(STORAGE_KEYS.USER_ID);
		let savedEmail = localStorage.getItem(STORAGE_KEYS.USER_EMAIL);

		if (!savedId || savedId === 'guest') {
			const token = localStorage.getItem(STORAGE_KEYS.SESSION_TOKEN);
			if (token) {
				try {
					const base64Payload = token.split('.')[1];
					if (base64Payload) {
						const normalizedBase64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
						const decoded = JSON.parse(atob(normalizedBase64));
						if (decoded.email) {
							savedId = decoded.email;
							savedEmail = decoded.email;
							localStorage.setItem(STORAGE_KEYS.USER_ID, decoded.email);
							localStorage.setItem(STORAGE_KEYS.USER_EMAIL, decoded.email);
						}
					}
				} catch (e) {
					console.error('Gagal mengekstrak email dari JWT:', e);
				}
			}
		}

		if (savedId) setUserId(savedId);
		if (savedEmail) setUserEmail(savedEmail);
	}, [onLoginSuccess]);

	useEffect(() => {
		if (userId === 'guest') {
			setIsConnected(false);
			return;
		}

		let cancelled = false;
		apiService
			.getStatus(userId)
			.then((res) => {
				if (cancelled) return;
				setIsConnected(res.connected);
				if (!res.connected) {
					localStorage.removeItem(STORAGE_KEYS.USER_ID);
					localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
					setUserId('guest');
					setUserEmail(null);
				}
			})
			.catch((err) => {
				console.error('getStatus gagal:', err);
				if (!cancelled) setIsConnected(false);
			});

		return () => {
			cancelled = true;
		};
	}, [userId]);

	const loginWithGoogle = useCallback(() => {
		window.location.href = apiService.getGoogleSignInUrl();
	}, []);

	const logoutGoogle = useCallback(async () => {
		try {
			if (userId !== 'guest') {
				await apiService.disconnectGoogle(userId);
			}
		} catch (e) {
			console.error('Gagal disconnect:', e);
		} finally {
			localStorage.removeItem(STORAGE_KEYS.USER_ID);
			localStorage.removeItem(STORAGE_KEYS.USER_EMAIL);
			localStorage.removeItem(STORAGE_KEYS.SESSION_TOKEN);
			setUserId('guest');
			setUserEmail(null);
			setIsConnected(false);
			window.location.href = '/login';
		}
	}, [userId]);

	return {userId, userEmail, isConnected, loginWithGoogle, logoutGoogle};
}
