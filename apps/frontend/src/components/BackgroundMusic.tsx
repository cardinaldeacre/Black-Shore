'use client';

import {useEffect, useRef, useState} from 'react';

export default function BackgroundMusic() {
	const audioRef = useRef<HTMLAudioElement | null>(null);
	const [isPlaying, setIsPlaying] = useState(false);

	useEffect(() => {
		const audio = new Audio('/audio/Elevator_Music.mp3');
		audio.loop = true;
		audio.volume = 0.25;
		audioRef.current = audio;

		const isMutedPref = localStorage.getItem('bs_bgm_muted') === 'true';

		const removeInteractionListeners = () => {
			window.removeEventListener('click', startAudioOnInteraction);
			window.removeEventListener('keydown', startAudioOnInteraction);
		};

		const startAudioOnInteraction = () => {
			if (!audioRef.current) return;
			audioRef.current
				.play()
				.then(() => {
					setIsPlaying(true);
					removeInteractionListeners();
				})
				.catch(() => {});
		};

		if (!isMutedPref) {
			audio
				.play()
				.then(() => {
					setIsPlaying(true);
				})
				.catch(() => {
					window.addEventListener('click', startAudioOnInteraction);
					window.addEventListener('keydown', startAudioOnInteraction);
				});
		}

		return () => {
			removeInteractionListeners();
			audio.pause();
			audioRef.current = null;
		};
	}, []);

	const toggleMusic = () => {
		if (!audioRef.current) return;

		if (isPlaying) {
			audioRef.current.pause();
			setIsPlaying(false);
			localStorage.setItem('bs_bgm_muted', 'true');
		} else {
			audioRef.current.play();
			setIsPlaying(true);
			localStorage.setItem('bs_bgm_muted', 'false');
		}
	};

	return (
		<button
			onClick={toggleMusic}
			title={isPlaying ? 'Matikan Musik Latar' : 'Putar Musik Latar'}
			className={`fixed bottom-5 left-5 z-50 flex items-center gap-2.5 px-3.5 py-2 rounded-full border backdrop-blur-md transition-all duration-200 shadow-lg cursor-pointer ${
				isPlaying
					? 'bg-slate-900/85 border-cyan-500/50 text-cyan-300 hover:border-cyan-400'
					: 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
			}`}>
			{isPlaying ? (
				<span className="flex items-end gap-0.5 h-3">
					<span className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
					<span className="w-0.5 h-2 bg-cyan-400 animate-bounce" />
					<span className="w-0.5 h-3 bg-cyan-400 animate-pulse" />
				</span>
			) : (
				<svg
					className="w-3.5 h-3.5 text-slate-500"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor">
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
					/>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
					/>
				</svg>
			)}
			<span className="text-xs font-mono tracking-wide">{isPlaying ? 'BGM: ON' : 'BGM: OFF'}</span>
		</button>
	);
}
