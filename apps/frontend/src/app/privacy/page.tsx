export default function PrivacyPolicy() {
	return (
		<div
			style={{
				fontFamily: 'sans-serif',
				backgroundColor: '#020617',
				color: '#f8fafc',
				padding: '40px',
				minHeight: '100vh',
				lineHeight: '1.6',
			}}>
			<div style={{maxWidth: '600px', margin: '0 auto'}}>
				<h1 style={{color: '#22d3ee', borderBottom: '1px solid #1e293b', paddingBottom: '10px'}}>
					Privacy Policy for Black Shore
				</h1>
				<p style={{color: '#94a3b8', fontSize: '14px'}}>Last updated: October 2026</p>

				<h2 style={{marginTop: '24px', fontSize: '18px'}}>1. Data Collection</h2>
				<p>
					Black Shore uses Google OAuth to authenticate users. We only collect and store your{' '}
					<strong>email address, name, and profile picture</strong> provided by Google. We do not
					access your Google Drive, Gmail, or any other sensitive personal data.
				</p>

				<h2 style={{marginTop: '24px', fontSize: '18px'}}>2. Data Usage</h2>
				<p>
					The collected data is strictly used to identify you within the Black Shore system, isolate
					your financial records (transactions), and personalize your AI assistant experience.
				</p>

				<h2 style={{marginTop: '24px', fontSize: '18px'}}>3. Data Protection</h2>
				<p>
					Your financial data and conversation logs are isolated in a secure database and are only
					accessible by you. We do not sell, share, or distribute your data to any third parties.
				</p>

				<h2 style={{marginTop: '24px', fontSize: '18px'}}>4. Contact</h2>
				<p>
					If you have any questions or wish to delete your data, please contact the administrator
					(Iqbal Maulana).
				</p>
			</div>
		</div>
	);
}
