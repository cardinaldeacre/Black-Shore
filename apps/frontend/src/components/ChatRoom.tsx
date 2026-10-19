'use client';

import {useRef, useEffect} from 'react';
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
	SheetDescription,
} from '@/components/ui/sheet';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Badge} from '@/components/ui/badge';
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
		<Sheet open={isOpen} onOpenChange={onOpenChange}>
			<SheetContent
				side="right"
				className="data-[side=right]:w-3/4 data-[side=right]:md:w-1/3 data-[side=right]:sm:max-w-none data-[side=right]:md:min-w-80 p-0 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 text-slate-100 shadow-2xl">
				<SheetHeader className="px-5 py-4 bg-slate-900/80 border-b border-slate-800 flex flex-row items-center justify-between space-y-0 text-left">
					<div className="flex items-center gap-3">
						<span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
						<div className="text-left">
							<SheetTitle className="text-base font-bold text-slate-100">
								Black Shore Agent
							</SheetTitle>
							<SheetDescription className="text-xs text-slate-400">
								Bendahara (D1) & Sekretaris
							</SheetDescription>
						</div>
					</div>

					<div className="flex items-center gap-2 pr-6">
						{userEmail ? (
							<Badge
								variant="secondary"
								className="bg-emerald-950/70 border-emerald-800 text-emerald-300 px-3 py-1 flex items-center gap-2">
								<span className="truncate max-w-25 sm:max-w-35 text-[11px]">{userEmail}</span>
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
								Connect
							</Button>
						)}
					</div>
				</SheetHeader>
				<div className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
					<div className="flex flex-col gap-2">
						{messages.map((m) => (
							<MessageBubble key={m.id} msg={m} />
						))}
						{loading && (
							<p className="text-xs text-cyan-400 animate-pulse px-2 pb-2">
								🌊 Black Shore sedang memproses...
							</p>
						)}
						<div ref={bottomRef} className="h-2" />
					</div>
				</div>
				<div className="px-4 py-2.5 bg-slate-900/60 border-t border-slate-800/80 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
					{quickPrompts.map((item) => (
						<Button
							key={item.label}
							type="button"
							variant="outline"
							size="sm"
							disabled={loading}
							onClick={() => sendMessage(item.prompt)}
							className="h-7 text-[11px] rounded-full bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white shrink-0">
							{item.label}
						</Button>
					))}
				</div>
				<form
					onSubmit={handleSubmit}
					className="p-3 sm:p-4 bg-slate-900/90 border-t border-slate-800 flex gap-2 pb-[env(safe-area-inset-bottom,1rem)]">
					<Input
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder="Ketik perintah..."
						className="bg-slate-950 border-slate-800 text-slate-100 focus-visible:ring-cyan-500 text-sm h-10"
					/>
					<Button
						type="submit"
						disabled={loading || !input.trim()}
						className="bg-cyan-600 hover:bg-cyan-500 text-white gap-1.5 px-4 h-10 shrink-0">
						<Send className="w-4 h-4" />
						<span className="hidden sm:inline">Kirim</span>
					</Button>
				</form>
			</SheetContent>
		</Sheet>
	);
}
