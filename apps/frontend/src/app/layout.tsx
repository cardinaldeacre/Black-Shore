import type {Metadata} from 'next';

export const metadata: Metadata = {
	title: 'Black Shore',
	description: 'AI-powered digital office agent',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
	return (
		<html lang="id">
			<body>{children}</body>
		</html>
	);
}
