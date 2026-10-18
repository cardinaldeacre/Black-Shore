'use client';

import {useRef, useEffect} from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Send, Link2, LogOut} from 'lucide-react';
import MessageBubble from './MessageBubble';
import {useAgentChat} from '@/hooks/use-agent-chat';

interface ChatRoomProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	userId: string;
	userEmail: string | null;
	onLoginGoogle: () => void;
	onLogoutGoogle: () => void;
}

export default function ChatRoom({
	isOpen,
	onOpenChange,
	userId,
	userEmail,
	onLoginGoogle,
	onLogoutGoogle,
}: ChatRoomProps) {
	const {messages, input, setInput, loading, sendMessage, quickPrompts} = useAgentChat(userId);
	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({behavior: 'smooth'});
	}, [messages, loading]);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		sendMessage();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl h-[82vh] flex flex-col p-0 gap-0 bg-slate-950 border-slate-800 text-slate-100 overflow-hidden">
				<DialogHeader className="px-6 py-4 bg-slate-900/70 border-b border-slate-800 flex flex-row items-center justify-between space-y-0">
					<div className="flex items-center gap-3">
						<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
						<div className="text-left">
							<DialogTitle className="text-base font-bold text-slate-100">
								Black Shore Agent
							</DialogTitle>
							<DialogDescription className="text-xs text-slate-400">
								Bendahara (D1) & Sekretaris (Google Docs)
							</DialogDescription>
						</div>
					</div>

					<div className="flex items-center gap-2 mr-6">
						{userEmail ? (
							<Badge
								variant="secondary"
								className="bg-emerald-950/70 border-emerald-800 text-emerald-300 px-3 py-1 flex items-center gap-2">
								<span className="truncate max-w-40">{userEmail}</span>
								<button
									onClick={onLogoutGoogle}
									className="text-rose-400 hover:text-rose-300 transition"
									title="Putuskan koneksi Google">
									<LogOut className="w-3.5 h-3.5" />
								</button>
							</Badge>
						) : (
							<Button
								size="sm"
								variant="secondary"
								onClick={onLoginGoogle}
								className="h-8 text-xs font-semibold gap-1.5">
								<Link2 className="w-3.5 h-3.5" />
								Connect Google
							</Button>
						)}
					</div>
				</DialogHeader>

				<ScrollArea className="flex-1 p-6">
					{messages.map((m) => (
						<MessageBubble key={m.id} msg={m} />
					))}
					{loading && (
						<p className="text-xs text-cyan-400 animate-pulse px-2">
							🌊 Black Shore sedang memproses permintaanmu...
						</p>
					)}
					<div ref={bottomRef} />
				</ScrollArea>

				<div className="px-4 py-2.5 bg-slate-900/40 border-t border-slate-800/80 flex gap-2 overflow-x-auto">
					{quickPrompts.map((item) => (
						<Button
							key={item.label}
							type="button"
							variant="outline"
							size="sm"
							disabled={loading}
							onClick={() => sendMessage(item.prompt)}
							className="h-7 text-xs rounded-full bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0">
							{item.label}
						</Button>
					))}
				</div>

				<form
					onSubmit={handleSubmit}
					className="p-4 bg-slate-900/70 border-t border-slate-800 flex gap-2">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ketik perintah keuangan atau dokumen..."
						className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-cyan-500"
					/>
					<Button
						type="submit"
						disabled={loading || !input.trim()}
						className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 px-5">
						<Send className="w-4 h-4" />
						Kirim
					</Button>
				</form>
			</DialogContent>
		</Dialog>
	);
}
