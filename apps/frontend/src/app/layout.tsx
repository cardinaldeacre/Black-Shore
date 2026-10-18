import type {Metadata} from 'next';
import {JetBrains_Mono} from 'next/font/google';
import {cn} from '@/lib/utils';
import './global.css';

const jetbrainsMono = JetBrains_Mono({subsets: ['latin'], variable: '--font-mono'});

export const metadata: Metadata = {
	title: 'Black Shore',
	description: 'AI-powered digital office agent',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
	return (
		<html lang="id" className={cn('font-mono', jetbrainsMono.variable)}>
			<body>{children}</body>
		</html>
	);
}
