'use client';

import {useState, useCallback} from 'react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import ChatRoom from '@/components/ChatRoom';
import {useAuthSession} from '@/hooks/use-auth-session';

export default function HomePage() {
	const [isChatOpen, setIsChatOpen] = useState(false);

	const handleAutoOpen = useCallback(() => {
		setIsChatOpen(true);
	}, []);

	const {userId, userEmail, isConnected, loginWithGoogle, logoutGoogle} =
		useAuthSession(handleAutoOpen);

	return (
		<main className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center overflow-hidden select-none">
			<div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.15)_0%,transparent_70%)] pointer-events-none" />

			<header className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
				<div>
					<h1 className="text-xl font-bold tracking-wider text-cyan-400">BLACK SHORE // OFFICE</h1>
					<p className="text-xs text-slate-400">Virtual Agent Workspace v0.1</p>
				</div>

				<Badge
					variant="outline"
					className="bg-slate-900/80 border-slate-800 text-slate-300 px-3 py-1.5">
					Status OAuth:{' '}
					<span
						className={isConnected ? 'text-emerald-400 font-semibold ml-1' : 'text-slate-500 ml-1'}>
						{userEmail ?? 'Belum Terhubung'}
					</span>
				</Badge>
			</header>

			<div
				onClick={() => setIsChatOpen(true)}
				className="group cursor-pointer flex flex-col items-center transition-transform duration-300 hover:scale-105 z-10">
				<div className="w-44 h-44 rounded-full bg-linear-to-b from-cyan-500/20 to-slate-900 border-2 border-cyan-500/50 group-hover:border-cyan-400 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex items-center justify-center text-6xl relative">
					🧑‍💼
					<Button
						size="sm"
						className="absolute -bottom-3 rounded-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs px-4 h-7 shadow">
						KLIK AGENT
					</Button>
				</div>
				<p className="mt-6 text-sm text-slate-400 group-hover:text-cyan-300 transition">
					Klik karakter untuk membuka meja kerja & ruang chat
				</p>
			</div>

			<ChatRoom
				isOpen={isChatOpen}
				onOpenChange={setIsChatOpen}
				userId={userId}
				userEmail={userEmail}
				onLoginGoogle={loginWithGoogle}
				onLogoutGoogle={logoutGoogle}
			/>
		</main>
	);
}
