'use client';

import {useState, useCallback} from 'react';
import {Badge} from '@/components/ui/badge';
import ChatRoom from '@/components/ChatRoom';
import Scene3D from '@/components/Scene3D';
import {useAuthSession} from '@/hooks/use-auth-session';
import {useAgentChat} from '@/hooks/use-agent-chat';

export default function HomePage() {
	const [isChatOpen, setIsChatOpen] = useState(false);

	const handleAutoOpen = useCallback(() => {
		setIsChatOpen(true);
	}, []);

	const {userId, userEmail, isConnected, loginWithGoogle, logoutGoogle} =
		useAuthSession(handleAutoOpen);

	const {messages, input, setInput, loading, sendMessage, quickPrompts} = useAgentChat(userId);

	return (
		<main className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between overflow-hidden select-none">
			{/* Header / Top Bar */}
			<header className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 pointer-events-none">
				<div className="pointer-events-auto">
					<h1 className="text-xl font-bold tracking-wider text-cyan-400 drop-shadow">
						BLACK SHORE // 3D OFFICE
					</h1>
					<p className="text-xs text-slate-400">Virtual Agent Workspace v0.1</p>
				</div>

				<Badge
					variant="outline"
					className="pointer-events-auto bg-slate-900/80 border-slate-800 text-slate-300 px-3 py-1.5 backdrop-blur-md">
					Status OAuth:{' '}
					<span
						className={isConnected ? 'text-emerald-400 font-semibold ml-1' : 'text-slate-500 ml-1'}>
						{userEmail ?? 'Belum Terhubung'}
					</span>
				</Badge>
			</header>

			{/* Panggung Utama Three.js (Scene 3D) */}
			<div className="absolute inset-0 z-0">
				<Scene3D onSelectAgent={() => setIsChatOpen(true)} isWorking={loading} />
			</div>

			{/* Instruksi Bawah */}
			<footer className="absolute bottom-6 z-20 pointer-events-none text-center w-full">
				<p className="text-xs text-slate-400 bg-slate-900/60 border border-slate-800/80 px-4 py-2 rounded-full inline-block backdrop-blur-md">
					💡 Seret kursor untuk memutar kamera • Klik karakter agen untuk membuka ruang kerja
				</p>
			</footer>

			{/* Overlay Chat Room (shadcn/ui Dialog) */}
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
