'use client';

import {useState, useCallback} from 'react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import ChatRoom from '@/components/ChatRoom';
import Scene3D, {AgentId} from '@/components/Scene3D';
import {useAuthSession} from '@/hooks/use-auth-session';

export default function HomePage() {
	const [isChatOpen, setIsChatOpen] = useState(false);

	const [activeChatAgent, setActiveChatAgent] = useState<AgentId | null>(null);

	const [workingDemo, setWorkingDemo] = useState<Record<AgentId, boolean>>({
		lilly: false,
		momo: false,
	});

	const handleAutoOpen = useCallback(() => {
		setIsChatOpen(true);
	}, []);

	const {userId, userEmail, isConnected, loginWithGoogle, logoutGoogle} =
		useAuthSession(handleAutoOpen);

	const handleSelectAgent = useCallback((agentId: AgentId) => {
		setActiveChatAgent(agentId);
		setIsChatOpen(true);
	}, []);

	const handleChatOpenChange = useCallback((open: boolean) => {
		setIsChatOpen(open);
		if (!open) {
			setActiveChatAgent(null);
		}
	}, []);

	const toggleAgentDemo = (agentId: AgentId) => {
		setWorkingDemo((prev) => ({
			...prev,
			[agentId]: !prev[agentId],
		}));
	};

	const isLillyWorking =
		workingDemo.lilly ||
		(isChatOpen &&
			(activeChatAgent === 'lilly' ||
				(activeChatAgent === null && userEmail !== 'umifirlana4@gmail.com')));

	const isMomoWorking =
		workingDemo.momo ||
		(isChatOpen &&
			(activeChatAgent === 'momo' ||
				(activeChatAgent === null && userEmail === 'umifirlana4@gmail.com')));

	return (
		<main className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between overflow-hidden select-none">
			<header className="absolute top-6 left-6 right-6 flex flex-wrap justify-between items-center gap-4 z-20 pointer-events-none">
				<div className="pointer-events-auto">
					<h1 className="text-xl font-bold tracking-wider text-cyan-400 drop-shadow">
						BLACK SHORE // 3D OFFICE
					</h1>
					<p className="text-xs text-slate-400">
						Biro Asisten AI — Lilly (Asisten Ayy) & Momo (Asisten Umii)
					</p>
				</div>

				<div className="pointer-events-auto flex flex-wrap items-center gap-2.5">
					<Button
						size="sm"
						variant={isLillyWorking ? 'default' : 'outline'}
						onClick={() => toggleAgentDemo('lilly')}
						className={`h-8 text-xs border transition-all ${
							isLillyWorking
								? 'bg-cyan-600 hover:bg-cyan-500 text-white border-cyan-400'
								: 'bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-cyan-300'
						}`}>
						{isLillyWorking ? '☕ Rehatkan Lilly' : '💻 Suruh Lilly Kerja'}
					</Button>

					<Button
						size="sm"
						variant={isMomoWorking ? 'default' : 'outline'}
						onClick={() => toggleAgentDemo('momo')}
						className={`h-8 text-xs border transition-all ${
							isMomoWorking
								? 'bg-rose-600 hover:bg-rose-500 text-white border-rose-400'
								: 'bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-rose-300'
						}`}>
						{isMomoWorking ? '☕ Rehatkan Momo' : '💻 Suruh Momo Kerja'}
					</Button>

					<Badge
						variant="outline"
						className="bg-slate-900/80 border-slate-800 text-slate-300 px-3 py-1.5 backdrop-blur-md">
						Status OAuth:{' '}
						<span
							className={
								isConnected ? 'text-emerald-400 font-semibold ml-1' : 'text-slate-500 ml-1'
							}>
							{userEmail ?? 'Belum Terhubung'}
						</span>
					</Badge>
				</div>
			</header>

			<div className="absolute inset-0 z-0">
				<Scene3D
					onSelectAgent={handleSelectAgent}
					workingStates={{
						lilly: isLillyWorking,
						momo: isMomoWorking,
					}}
				/>
			</div>

			<footer className="absolute bottom-6 z-20 pointer-events-none text-center w-full px-4">
				<p className="text-xs text-slate-300 bg-slate-900/75 border border-slate-800 px-4 py-2 rounded-full inline-block backdrop-blur-md shadow-lg">
					💡 Klik <b>Lilly</b> atau <b>Momo</b> secara langsung untuk memanggil mereka ke meja kerja
					& membuka Chat!
				</p>
			</footer>

			<ChatRoom
				isOpen={isChatOpen}
				onOpenChange={handleChatOpenChange}
				userId={userId}
				userEmail={userEmail}
				onLoginGoogle={loginWithGoogle}
				onLogoutGoogle={logoutGoogle}
			/>
		</main>
	);
}
