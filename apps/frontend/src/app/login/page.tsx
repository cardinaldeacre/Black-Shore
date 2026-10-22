'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';

export default function LoginPage() {
	const router = useRouter();
	const [isProcessing, setIsProcessing] = useState(true);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const urlToken = params.get('token');
		const error = params.get('error');

		if (error === 'unauthorized') {
			alert('Akses Ditolak: Email Anda tidak terdaftar di sistem Black Shore.');
			setIsProcessing(false);
			return;
		}

		if (urlToken) {
			localStorage.setItem('black_shore_session', urlToken);

			let extractedEmail = '';
			try {
				const base64Payload = urlToken.split('.')[1];
				if (base64Payload) {
					const normalizedBase64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
					const decodedPayload = JSON.parse(atob(normalizedBase64));
					if (decodedPayload.email) {
						extractedEmail = decodedPayload.email;
						localStorage.setItem('bs_user_id', extractedEmail);
						localStorage.setItem('bs_user_email', extractedEmail);
					}
				}
			} catch (e) {
				console.error('Gagal membaca payload token:', e);
			}

			if (extractedEmail) {
				window.location.replace(
					`/?connected=true&userId=${encodeURIComponent(extractedEmail)}&email=${encodeURIComponent(extractedEmail)}`
				);
			} else {
				window.location.replace('/');
			}
		}
	}, [router]);

	const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8787';

	if (isProcessing) {
		return (
			<div
				style={{
					backgroundColor: '#020617',
					height: '100vh',
					display: 'flex',
					justifyContent: 'center',
					alignItems: 'center',
					color: '#22d3ee',
					fontFamily: 'sans-serif',
				}}>
				Memproses kredensial keamanan...
			</div>
		);
	}

	return (
		<div
			style={{
				backgroundColor: '#020617',
				height: '100vh',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'center',
				alignItems: 'center',
				color: '#f8fafc',
				fontFamily: 'sans-serif',
			}}>
			<h1 style={{fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#22d3ee'}}>
				Black Shore HQ
			</h1>
			<p style={{color: '#94a3b8', marginBottom: '32px'}}>
				Area Terbatas. Silakan identifikasi diri Anda.
			</p>

			<button
				onClick={() => {
					window.location.href = `${backendUrl}/auth/google/signin`;
				}}
				style={{
					backgroundColor: '#f8fafc',
					color: '#0f172a',
					padding: '12px 24px',
					borderRadius: '8px',
					fontWeight: '600',
					border: 'none',
					cursor: 'pointer',
					boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
					display: 'flex',
					alignItems: 'center',
					gap: '8px',
				}}>
				<svg
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					xmlns="http://www.w3.org/2000/svg">
					<path
						d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
						fill="#4285F4"
					/>
					<path
						d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
						fill="#34A853"
					/>
					<path
						d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
						fill="#FBBC05"
					/>
					<path
						d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
						fill="#EA4335"
					/>
				</svg>
				Login Akses Google
			</button>
		</div>
	);
}
