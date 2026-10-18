'use client';

import {useState, useCallback} from 'react';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import ChatRoom from '@/components/ChatRoom';
import Scene3D from '@/components/Scene3D';
import {useAuthSession} from '@/hooks/use-auth-session';

export default function HomePage() {
	const [isChatOpen, setIsChatOpen] = useState(false);
	const [isWorkingDemo, setIsWorkingDemo] = useState(false);

	const handleAutoOpen = useCallback(() => {
		setIsChatOpen(true);
	}, []);

	const {userId, userEmail, isConnected, loginWithGoogle, logoutGoogle} =
		useAuthSession(handleAutoOpen);

	return (
		<main className="relative min-h-screen bg-slate-950 text-white flex flex-col items-center justify-between overflow-hidden select-none">
			<header className="absolute top-6 left-6 right-6 flex justify-between items-center z-20 pointer-events-none">
				<div className="pointer-events-auto">
					<h1 className="text-xl font-bold tracking-wider text-cyan-400 drop-shadow">
						BLACK SHORE // 3D OFFICE
					</h1>
					<p className="text-xs text-slate-400">Isometric Voxel Agent Workspace</p>
				</div>

				<div className="pointer-events-auto flex items-center gap-3">
					<Button
						size="sm"
						variant={isWorkingDemo ? 'default' : 'outline'}
						onClick={() => setIsWorkingDemo((prev) => !prev)}
						className="h-8 text-xs bg-slate-900/90 border-slate-700 hover:bg-slate-800 text-cyan-300">
						{isWorkingDemo ? '☕ Suruh Rehat ke Sofa' : '💻 Suruh Kerja ke PC'}
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
					onSelectAgent={() => setIsChatOpen(true)}
					isWorking={isWorkingDemo || isChatOpen}
				/>
			</div>

			<footer className="absolute bottom-6 z-20 pointer-events-none text-center w-full">
				<p className="text-xs text-slate-300 bg-slate-900/75 border border-slate-800 px-4 py-2 rounded-full inline-block backdrop-blur-md shadow-lg">
					💡 Klik tombol <b>Suruh Kerja/Rehat</b> di kanan atas untuk melihat animasi jalan • Klik
					Agent untuk Chat
				</p>
			</footer>

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
