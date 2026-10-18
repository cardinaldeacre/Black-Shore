'use client';

import {Badge} from '@/components/ui/badge';
import {Card} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {ExternalLink, FileText, Table} from 'lucide-react';
import type {ChatMessage} from '@/hooks/use-agent-chat';

export default function MessageBubble({msg}: {msg: ChatMessage}) {
	const isUser = msg.sender === 'user';

	return (
		<div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} mb-4`}>
			<div className="flex items-center gap-2 mb-1.5 px-1">
				<span className="text-xs font-medium text-muted-foreground">
					{isUser ? 'Kamu' : '🌊 Black Shore Agent'}
				</span>
				{msg.intent && !isUser && (
					<Badge
						variant="outline"
						className="text-[10px] border-cyan-800 text-cyan-400 bg-cyan-950/40">
						{msg.intent}
					</Badge>
				)}
			</div>

			<Card
				className={`max-w-[85%] px-4 py-3 text-sm leading-relaxed border ${
					isUser
						? 'bg-cyan-600 text-white border-cyan-500 rounded-2xl rounded-br-none'
						: 'bg-slate-900/90 text-slate-100 border-slate-800 rounded-2xl rounded-bl-none'
				}`}>
				<p className="whitespace-pre-wrap">{msg.text}</p>

				{msg.spreadsheetUrl && (
					<div className="mt-3 rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
						<div className="px-3 py-2 text-xs text-slate-300 flex justify-between items-center border-b border-slate-800">
							<span className="flex items-center gap-1.5 font-medium">
								<Table className="w-3.5 h-3.5 text-cyan-400" />
								Live Spreadsheet Keuangan
							</span>

							<Button
								render={<a href={msg.spreadsheetUrl} target="_blank" rel="noreferrer" />}
								variant="link"
								size="sm"
								className="h-auto p-0 text-xs text-cyan-400">
								Buka Penuh <ExternalLink className="w-3 h-3 ml-1" />
							</Button>
						</div>
						<iframe
							src={msg.spreadsheetUrl}
							className="w-full h-60 bg-white"
							title="Spreadsheet Keuangan"
						/>
					</div>
				)}

				{msg.documentUrl && (
					<Button
						render={<a href={msg.documentUrl} target="_blank" rel="noreferrer" />}
						variant="outline"
						className="mt-3 w-full justify-between h-auto py-3 px-4 bg-blue-950/40 border-blue-800/70 hover:bg-blue-900/50 text-blue-200">
						<span className="flex items-center gap-2.5 text-left">
							<FileText className="w-5 h-5 text-blue-400 shrink-0" />
							<span>
								<span className="block font-semibold text-xs">Dokumen Google Docs Siap!</span>
								<span className="block text-[11px] text-blue-400">Klik untuk membuka dokumen</span>
							</span>
						</span>
						<ExternalLink className="w-4 h-4 text-blue-400" />
					</Button>
				)}
			</Card>
		</div>
	);
}
