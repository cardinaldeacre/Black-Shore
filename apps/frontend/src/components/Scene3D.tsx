'use client';

import {useRef, useState, useMemo, useEffect} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import {OrbitControls, Html, ContactShadows, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';

export type AgentId = 'lilly' | 'momo';

interface Scene3DProps {
	onSelectAgent: (agentId: AgentId) => void;
	workingStates: Record<AgentId, boolean>;
}

interface AgentConfig {
	id: AgentId;
	name: string;
	role: string;
	gender: 'female' | 'male';
	hairColor: string;
	jacketColor: string;
	shirtColor: string;
	tieColor: string;
	pantsColor: string;
	mugColor: string;
	borderHoverClass: string;
	dotWorkingClass: string;
	roleBadgeClass: string;
	glasses: boolean;
	speed: number;
	waypoints: THREE.Vector3[];
}

// =========================================================
// KONFIGURASI LILLY & MOMO DENGAN JALUR ANTI-TABRAKAN
// =========================================================
const AGENTS_CONFIG: AgentConfig[] = [
	{
		id: 'lilly',
		name: 'Lilly',
		role: "Umii's Assistant",
		gender: 'female',
		hairColor: '#1e1b4b', // Indigo-hitam elegan
		jacketColor: '#0f172a', // Slate gelap keren
		shirtColor: '#f8fafc',
		tieColor: '#06b6d4', // Aksen Cyan
		pantsColor: '#1e293b',
		mugColor: '#cffafe',
		borderHoverClass: 'border-cyan-400',
		dotWorkingClass: 'bg-cyan-400',
		roleBadgeClass: 'text-cyan-300',
		glasses: true,
		speed: 2.55,
		// Jalur Luar (Dari dudukan kanan sofa -> memutar ke kursi kerja kiri)
		waypoints: [
			new THREE.Vector3(1.92, 0.44, 1.08), // [0] Duduk di Sofa Kanan
			new THREE.Vector3(1.92, 0.56, 1.68), // [1] Berdiri di celah depan Sofa Kanan
			new THREE.Vector3(0.45, 0.56, 1.68), // [2] Geser keluar melewati meja kopi
			new THREE.Vector3(-0.45, 0.56, 0.85), // [3] Diagonal jalur luar (bawah/depan)
			new THREE.Vector3(-1.75, 0.56, 0.25), // [4] Siap di belakang Kursi Kerja Kiri
			new THREE.Vector3(-1.75, 0.48, -0.48), // [5] Masuk & Duduk di Kursi Kerja Kiri
		],
	},
	{
		id: 'momo',
		name: 'Momo',
		role: "Maul's Assistant",
		gender: 'male',
		hairColor: '#451a03', // Coklat hangat
		jacketColor: '#31102f', // Plum/Maroon gelap manis
		shirtColor: '#fff1f2',
		tieColor: '#f43f5e', // Aksen Rose/Pink manis
		pantsColor: '#27272a',
		mugColor: '#ffe4e6',
		borderHoverClass: 'border-rose-400',
		dotWorkingClass: 'bg-rose-400',
		roleBadgeClass: 'text-rose-300',
		glasses: false,
		speed: 2.4,
		// Jalur Dalam (Dari dudukan kiri sofa -> jalur tengah -> kursi kerja kanan)
		waypoints: [
			new THREE.Vector3(1.18, 0.44, 1.08), // [0] Duduk di Sofa Kiri
			new THREE.Vector3(1.18, 0.56, 1.52), // [1] Berdiri di depan Sofa Kiri
			new THREE.Vector3(0.35, 0.56, 1.15), // [2] Keluar lewat samping kiri sofa
			new THREE.Vector3(-0.15, 0.56, 0.25), // [3] Diagonal jalur dalam (tengah ruangan)
			new THREE.Vector3(-0.65, 0.56, 0.15), // [4] Siap di belakang Kursi Kerja Kanan
			new THREE.Vector3(-0.65, 0.48, -0.48), // [5] Masuk & Duduk di Kursi Kerja Kanan
		],
	},
];

// =========================================================
// 1. KOMPONEN AGEN VOXEL (LILLY & MOMO)
// =========================================================
function VoxelAgent({
	config,
	isWorking,
	onClick,
}: {
	config: AgentConfig;
	isWorking: boolean;
	onClick: () => void;
}) {
	const rootRef = useRef<THREE.Group>(null);
	const headRef = useRef<THREE.Group>(null);
	const leftArmRef = useRef<THREE.Group>(null);
	const rightArmRef = useRef<THREE.Group>(null);
	const leftLegRef = useRef<THREE.Group>(null);
	const rightLegRef = useRef<THREE.Group>(null);
	const steamRef = useRef<THREE.Mesh>(null);

	const [hovered, setHovered] = useState(false);
	const [agentState, setAgentState] = useState<'resting' | 'walking' | 'working'>('resting');
	const [isHtmlReady, setIsHtmlReady] = useState(false);

	useEffect(() => {
		const timer = setTimeout(() => setIsHtmlReady(true), 100);
		return () => clearTimeout(timer);
	}, []);

	const waypoints = useMemo(() => config.waypoints, [config.waypoints]);
	const waypointIdxRef = useRef<number>(0);
	const prevWorkingRef = useRef<boolean>(isWorking);
	const isInitializedRef = useRef<boolean>(false);

	const animOffset = useMemo(() => (config.id === 'momo' ? 2.5 : 0), [config.id]);

	useFrame((state, delta) => {
		if (!rootRef.current) return;

		if (!isInitializedRef.current) {
			const initialWaypoint = waypoints[0];
			if (!initialWaypoint) return;
			rootRef.current.position.copy(initialWaypoint);
			isInitializedRef.current = true;
		}

		const t = state.clock.getElapsedTime() + animOffset;
		const finalIdx = isWorking ? waypoints.length - 1 : 0;

		if (prevWorkingRef.current !== isWorking) {
			prevWorkingRef.current = isWorking;
			const currentTarget = waypoints[waypointIdxRef.current];
			if (!currentTarget) return;
			const distToCurrent = Math.hypot(
				currentTarget.x - rootRef.current.position.x,
				currentTarget.z - rootRef.current.position.z
			);
			if (distToCurrent > 0.05) {
				waypointIdxRef.current = isWorking
					? Math.min(waypoints.length - 1, waypointIdxRef.current + 1)
					: Math.max(0, waypointIdxRef.current - 1);
			}
		}

		const activeTarget = waypoints[waypointIdxRef.current];
		if (!activeTarget) return;
		const dx = activeTarget.x - rootRef.current.position.x;
		const dz = activeTarget.z - rootRef.current.position.z;
		const distXZ = Math.hypot(dx, dz);

		const isAtFinalDestination = waypointIdxRef.current === finalIdx && distXZ <= 0.04;

		if (!isAtFinalDestination) {
			if (distXZ <= 0.04) {
				waypointIdxRef.current = isWorking
					? Math.min(waypoints.length - 1, waypointIdxRef.current + 1)
					: Math.max(0, waypointIdxRef.current - 1);
				return;
			}

			if (agentState !== 'walking') setAgentState('walking');

			const step = Math.min(distXZ, delta * config.speed);
			rootRef.current.position.x += (dx / distXZ) * step;
			rootRef.current.position.z += (dz / distXZ) * step;

			rootRef.current.position.y = THREE.MathUtils.lerp(
				rootRef.current.position.y,
				0.56 + Math.abs(Math.sin(t * 13)) * 0.05,
				delta * 15
			);

			const targetAngle = Math.atan2(dx, dz);
			let angleDiff = targetAngle - rootRef.current.rotation.y;
			while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
			while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
			rootRef.current.rotation.y += angleDiff * Math.min(1, delta * 12);

			const swing = Math.sin(t * 13) * 0.65;
			if (leftArmRef.current) leftArmRef.current.rotation.x = swing;
			if (rightArmRef.current) rightArmRef.current.rotation.x = -swing;
			if (leftLegRef.current) leftLegRef.current.rotation.x = -swing;
			if (rightLegRef.current) rightLegRef.current.rotation.x = swing;
			if (headRef.current) {
				headRef.current.rotation.x = THREE.MathUtils.lerp(headRef.current.rotation.x, 0, delta * 8);
				headRef.current.rotation.y = Math.sin(t * 6) * 0.08;
			}
		} else {
			rootRef.current.position.x = activeTarget.x;
			rootRef.current.position.z = activeTarget.z;
			rootRef.current.position.y = THREE.MathUtils.lerp(
				rootRef.current.position.y,
				activeTarget.y,
				delta * 12
			);

			if (leftLegRef.current) {
				leftLegRef.current.rotation.x = THREE.MathUtils.lerp(
					leftLegRef.current.rotation.x,
					-Math.PI / 2.1,
					delta * 12
				);
			}
			if (rightLegRef.current) {
				rightLegRef.current.rotation.x = THREE.MathUtils.lerp(
					rightLegRef.current.rotation.x,
					-Math.PI / 2.1,
					delta * 12
				);
			}

			if (isWorking) {
				if (agentState !== 'working') setAgentState('working');

				let angleDiff = Math.PI - rootRef.current.rotation.y;
				while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
				while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
				rootRef.current.rotation.y += angleDiff * Math.min(1, delta * 10);

				if (leftArmRef.current) {
					leftArmRef.current.rotation.x = -1.05 + Math.sin(t * 20) * 0.1;
				}
				if (rightArmRef.current) {
					rightArmRef.current.rotation.x = -1.05 + Math.cos(t * 20) * 0.1;
				}
				if (headRef.current) {
					headRef.current.rotation.y = Math.sin(t * 2) * 0.12;
					headRef.current.rotation.x = 0.08;
				}
			} else {
				if (agentState !== 'resting') setAgentState('resting');

				let angleDiff = 0 - rootRef.current.rotation.y;
				while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
				while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
				rootRef.current.rotation.y += angleDiff * Math.min(1, delta * 10);

				if (leftArmRef.current) {
					leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
						leftArmRef.current.rotation.x,
						-0.35,
						delta * 8
					);
				}

				const sipCycle = Math.max(0, Math.sin(t * 1.5));
				if (rightArmRef.current) {
					rightArmRef.current.rotation.x = THREE.MathUtils.lerp(
						rightArmRef.current.rotation.x,
						-0.75 - sipCycle * 0.8,
						delta * 8
					);
				}
				if (headRef.current) {
					headRef.current.rotation.x = -sipCycle * 0.18;
					headRef.current.rotation.y = Math.sin(t * 0.8) * 0.15;
				}
				if (steamRef.current) {
					steamRef.current.position.y = 0.18 + ((t * 0.15) % 0.15);
				}
			}
		}
	});

	return (
		<group
			ref={rootRef}
			frustumCulled={false}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onPointerOver={(e) => {
				e.stopPropagation();
				setHovered(true);
				document.body.style.cursor = 'pointer';
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = 'auto';
			}}>
			{isHtmlReady && (
				<group position={[0, 1.28, 0]}>
					<Html
						key={`label-${config.id}`}
						center
						distanceFactor={10}
						occlude={false}
						style={{
							pointerEvents: 'auto',
							userSelect: 'none',
							zIndex: config.id === 'lilly' ? 100 : 101,
						}}>
						<div
							onClick={(e) => {
								e.stopPropagation();
								onClick();
							}}
							onMouseEnter={() => {
								setHovered(true);
								document.body.style.cursor = 'pointer';
							}}
							onMouseLeave={() => {
								setHovered(false);
								document.body.style.cursor = 'auto';
							}}
							className={`flex flex-col items-center px-3 py-1 rounded-md border shadow-xl cursor-pointer transition-transform duration-150 whitespace-nowrap ${
								hovered
									? `bg-slate-900 ${config.borderHoverClass} scale-110`
									: 'bg-slate-950/90 border-slate-700/80'
							}`}>
							<div className="flex items-center gap-1.5">
								<span className="text-xs font-bold tracking-wide text-white">{config.name}</span>
								<span
									className={`w-2 h-2 rounded-full ${
										agentState === 'working'
											? `${config.dotWorkingClass} animate-ping`
											: agentState === 'walking'
												? 'bg-amber-400'
												: 'bg-emerald-400'
									}`}
								/>
							</div>
							<span className={`text-[9px] font-mono leading-tight ${config.roleBadgeClass}`}>
								{config.role}
							</span>
						</div>
					</Html>
				</group>
			)}

			{/* === KEPALA & DETAIL WAJAH TIMBUL 3D === */}
			<group ref={headRef} position={[0, 0.52, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.42, 0.42, 0.42]} />
					<meshStandardMaterial color="#f5cba7" roughness={0.6} />
				</mesh>

				{/* Rambut Atas & Poni */}
				<mesh position={[0, 0.22, 0]} castShadow>
					<boxGeometry args={[0.46, 0.1, 0.46]} />
					<meshStandardMaterial color={config.hairColor} />
				</mesh>
				<mesh position={[0, 0.14, 0.21]} castShadow>
					<boxGeometry args={[0.44, 0.1, 0.08]} />
					<meshStandardMaterial color={config.hairColor} />
				</mesh>

				{config.gender === 'female' ? (
					<>
						<mesh position={[0, -0.12, -0.22]} castShadow>
							<boxGeometry args={[0.44, 0.75, 0.1]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[0, -0.42, -0.28]} castShadow>
							<boxGeometry args={[0.36, 0.55, 0.08]} />
							<meshStandardMaterial color={config.hairColor} roughness={0.5} />
						</mesh>
						<mesh position={[-0.22, -0.12, 0.02]} castShadow>
							<boxGeometry args={[0.07, 0.62, 0.44]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[0.22, -0.12, 0.02]} castShadow>
							<boxGeometry args={[0.07, 0.62, 0.44]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
					</>
				) : (
					<>
						<mesh position={[0, 0.04, -0.21]} castShadow>
							<boxGeometry args={[0.46, 0.32, 0.06]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[-0.22, 0.08, 0]} castShadow>
							<boxGeometry args={[0.05, 0.24, 0.44]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[0.22, 0.08, 0]} castShadow>
							<boxGeometry args={[0.05, 0.24, 0.44]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
					</>
				)}

				{/* Telinga 3D Timbul */}
				<mesh position={[-0.23, -0.02, 0]}>
					<boxGeometry args={[0.06, 0.1, 0.08]} />
					<meshStandardMaterial color="#eab68c" />
				</mesh>
				<mesh position={[0.23, -0.02, 0]}>
					<boxGeometry args={[0.06, 0.1, 0.08]} />
					<meshStandardMaterial color="#eab68c" />
				</mesh>

				{/* Alis 3D Timbul */}
				<mesh position={[-0.09, 0.06, 0.22]}>
					<boxGeometry args={[0.1, 0.03, 0.03]} />
					<meshStandardMaterial color={config.hairColor} />
				</mesh>
				<mesh position={[0.09, 0.06, 0.22]}>
					<boxGeometry args={[0.1, 0.03, 0.03]} />
					<meshStandardMaterial color={config.hairColor} />
				</mesh>

				{/* Mata 3D */}
				<mesh position={[-0.09, 0.0, 0.215]}>
					<boxGeometry args={[0.08, 0.06, 0.02]} />
					<meshStandardMaterial color="#ffffff" />
				</mesh>
				<mesh position={[-0.09, 0.0, 0.225]}>
					<boxGeometry args={[0.04, 0.05, 0.02]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				<mesh position={[0.09, 0.0, 0.215]}>
					<boxGeometry args={[0.08, 0.06, 0.02]} />
					<meshStandardMaterial color="#ffffff" />
				</mesh>
				<mesh position={[0.09, 0.0, 0.225]}>
					<boxGeometry args={[0.04, 0.05, 0.02]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>

				{/* Hidung & Mulut 3D Timbul */}
				<mesh position={[0, -0.05, 0.23]}>
					<boxGeometry args={[0.06, 0.06, 0.05]} />
					<meshStandardMaterial color="#e0a97e" />
				</mesh>
				<mesh position={[0, -0.13, 0.22]}>
					<boxGeometry args={[0.1, 0.03, 0.02]} />
					<meshStandardMaterial color={config.gender === 'female' ? '#e11d48' : '#9a3412'} />
				</mesh>
			</group>

			{/* === BADAN & JAKET LAYER TIMBUL 3D === */}
			<group position={[0, 0.08, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.38, 0.46, 0.22]} />
					<meshStandardMaterial color={config.shirtColor} />
				</mesh>
				<mesh position={[0, 0.04, 0.12]}>
					<boxGeometry args={[0.06, 0.26, 0.02]} />
					<meshStandardMaterial color={config.tieColor} />
				</mesh>
				<mesh position={[-0.13, 0, 0.01]} castShadow>
					<boxGeometry args={[0.14, 0.47, 0.26]} />
					<meshStandardMaterial color={config.jacketColor} />
				</mesh>
				<mesh position={[0.13, 0, 0.01]} castShadow>
					<boxGeometry args={[0.14, 0.47, 0.26]} />
					<meshStandardMaterial color={config.jacketColor} />
				</mesh>
				<mesh position={[0, 0, -0.02]} castShadow>
					<boxGeometry args={[0.4, 0.47, 0.2]} />
					<meshStandardMaterial color={config.jacketColor} />
				</mesh>
			</group>

			{/* === LENGAN KIRI === */}
			<group ref={leftArmRef} position={[-0.27, 0.26, 0]}>
				<mesh position={[0, -0.12, 0]} castShadow>
					<boxGeometry args={[0.14, 0.28, 0.16]} />
					<meshStandardMaterial color={config.jacketColor} />
				</mesh>
				<mesh position={[0, -0.3, 0]} castShadow>
					<boxGeometry args={[0.11, 0.12, 0.12]} />
					<meshStandardMaterial color="#f5cba7" />
				</mesh>
			</group>

			{/* === LENGAN KANAN + CANGKIR KOPI === */}
			<group ref={rightArmRef} position={[0.27, 0.26, 0]}>
				<mesh position={[0, -0.12, 0]} castShadow>
					<boxGeometry args={[0.14, 0.28, 0.16]} />
					<meshStandardMaterial color={config.jacketColor} />
				</mesh>
				<mesh position={[0, -0.3, 0]} castShadow>
					<boxGeometry args={[0.11, 0.12, 0.12]} />
					<meshStandardMaterial color="#f5cba7" />
				</mesh>

				{agentState === 'resting' && (
					<group position={[0, -0.32, 0.14]} rotation={[Math.PI / 3, 0, 0]}>
						<mesh castShadow>
							<cylinderGeometry args={[0.055, 0.045, 0.11, 12]} />
							<meshStandardMaterial color={config.mugColor} />
						</mesh>
						<mesh position={[0, 0.05, 0]}>
							<cylinderGeometry args={[0.048, 0.048, 0.02, 12]} />
							<meshStandardMaterial color="#451a03" />
						</mesh>
						<mesh ref={steamRef} position={[0, 0.18, 0]}>
							<boxGeometry args={[0.03, 0.06, 0.03]} />
							<meshStandardMaterial color="#ffffff" transparent opacity={0.45} />
						</mesh>
					</group>
				)}
			</group>

			{/* === KAKI KIRI & SEPATU TIMBUL === */}
			<group ref={leftLegRef} position={[-0.1, -0.15, 0]}>
				<mesh position={[0, -0.15, 0]} castShadow>
					<boxGeometry args={[0.16, 0.3, 0.18]} />
					<meshStandardMaterial color={config.pantsColor} />
				</mesh>
				<mesh position={[0, -0.31, 0.03]} castShadow>
					<boxGeometry args={[0.17, 0.09, 0.24]} />
					<meshStandardMaterial color="#090d16" />
				</mesh>
			</group>

			{/* === KAKI KANAN & SEPATU TIMBUL === */}
			<group ref={rightLegRef} position={[0.1, -0.15, 0]}>
				<mesh position={[0, -0.15, 0]} castShadow>
					<boxGeometry args={[0.16, 0.3, 0.18]} />
					<meshStandardMaterial color={config.pantsColor} />
				</mesh>
				<mesh position={[0, -0.31, 0.03]} castShadow>
					<boxGeometry args={[0.17, 0.09, 0.24]} />
					<meshStandardMaterial color="#090d16" />
				</mesh>
			</group>
		</group>
	);
}

// =========================================================
// 2. KUCING VOXEL OREN INTERAKTIF (SESUAI GAMBAR REFERENSI)
// =========================================================
function VoxelCat({position}: {position: [number, number, number]}) {
	const catRootRef = useRef<THREE.Group>(null);
	const bodyGroupRef = useRef<THREE.Group>(null);
	const headGroupRef = useRef<THREE.Group>(null);
	const tailGroupRef = useRef<THREE.Group>(null);
	const frontLeftLegRef = useRef<THREE.Group>(null);
	const frontRightLegRef = useRef<THREE.Group>(null);
	const backLeftLegRef = useRef<THREE.Group>(null);
	const backRightLegRef = useRef<THREE.Group>(null);

	const [isStretching, setIsStretching] = useState(false);
	const [hovered, setHovered] = useState(false);
	const [isHtmlReady, setIsHtmlReady] = useState(false);
	const stretchTimerRef = useRef<number>(0);

	useEffect(() => {
		const timer = setTimeout(() => setIsHtmlReady(true), 120);
		return () => clearTimeout(timer);
	}, []);

	const triggerStretch = () => {
		if (!isStretching) {
			setIsStretching(true);
			stretchTimerRef.current = 0;
		}
	};

	useFrame((state, delta) => {
		const t = state.clock.getElapsedTime();

		if (isStretching) {
			stretchTimerRef.current += delta;
			const p = stretchTimerRef.current;

			// Durasi total stretching: 2.6 detik
			if (p >= 2.6) {
				setIsStretching(false);
				stretchTimerRef.current = 0;
			} else {
				// Kurva intensitas stretching (naik mulus, tahan sebentar, kembali ke normal)
				const stretchFactor =
					p < 0.6
						? THREE.MathUtils.smoothstep(p, 0, 0.6)
						: p < 1.85
							? 1
							: 1 - THREE.MathUtils.smoothstep(p, 1.85, 2.6);

				// Badan menukik ke depan bawah (peregangan kucing klasik)
				if (bodyGroupRef.current) {
					bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(0, 0.38, stretchFactor);
					bodyGroupRef.current.position.y = THREE.MathUtils.lerp(0.24, 0.17, stretchFactor);
					bodyGroupRef.current.position.z = THREE.MathUtils.lerp(0, -0.05, stretchFactor);
				}

				// Kepala mendongak manis saat stretching
				if (headGroupRef.current) {
					headGroupRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.45, stretchFactor);
					headGroupRef.current.position.y = THREE.MathUtils.lerp(0.16, 0.12, stretchFactor);
					headGroupRef.current.position.z = THREE.MathUtils.lerp(0.24, 0.28, stretchFactor);
				}

				// Kaki depan selonjor jauh ke depan
				if (frontLeftLegRef.current && frontRightLegRef.current) {
					frontLeftLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -1.15, stretchFactor);
					frontRightLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -1.15, stretchFactor);
				}

				// Kaki belakang menahan pinggul tetap tinggi
				if (backLeftLegRef.current && backRightLegRef.current) {
					backLeftLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.25, stretchFactor);
					backRightLegRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.25, stretchFactor);
				}

				// Ekor bergoyang cepat senang saat di-klik
				if (tailGroupRef.current) {
					tailGroupRef.current.rotation.z = Math.sin(t * 22) * 0.35 * stretchFactor;
					tailGroupRef.current.rotation.x = THREE.MathUtils.lerp(0, -0.3, stretchFactor);
				}
				return;
			}
		}

		// Animasi Idle (Santai di atas karpet: napas halus & goyang ekor pelan)
		if (bodyGroupRef.current) {
			bodyGroupRef.current.rotation.x = THREE.MathUtils.lerp(
				bodyGroupRef.current.rotation.x,
				0,
				delta * 8
			);
			bodyGroupRef.current.position.y = THREE.MathUtils.lerp(
				bodyGroupRef.current.position.y,
				0.24 + Math.sin(t * 2.5) * 0.008,
				delta * 8
			);
			bodyGroupRef.current.position.z = THREE.MathUtils.lerp(
				bodyGroupRef.current.position.z,
				0,
				delta * 8
			);
		}
		if (headGroupRef.current) {
			headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
				headGroupRef.current.rotation.x,
				Math.sin(t * 1.4) * 0.04,
				delta * 8
			);
			headGroupRef.current.rotation.y = Math.sin(t * 0.9) * 0.08;
			headGroupRef.current.position.y = THREE.MathUtils.lerp(
				headGroupRef.current.position.y,
				0.16,
				delta * 8
			);
			headGroupRef.current.position.z = THREE.MathUtils.lerp(
				headGroupRef.current.position.z,
				0.24,
				delta * 8
			);
		}
		if (frontLeftLegRef.current && frontRightLegRef.current) {
			frontLeftLegRef.current.rotation.x = THREE.MathUtils.lerp(
				frontLeftLegRef.current.rotation.x,
				0,
				delta * 8
			);
			frontRightLegRef.current.rotation.x = THREE.MathUtils.lerp(
				frontRightLegRef.current.rotation.x,
				0,
				delta * 8
			);
		}
		if (backLeftLegRef.current && backRightLegRef.current) {
			backLeftLegRef.current.rotation.x = THREE.MathUtils.lerp(
				backLeftLegRef.current.rotation.x,
				0,
				delta * 8
			);
			backRightLegRef.current.rotation.x = THREE.MathUtils.lerp(
				backRightLegRef.current.rotation.x,
				0,
				delta * 8
			);
		}
		if (tailGroupRef.current) {
			tailGroupRef.current.rotation.z = Math.sin(t * 2.8) * 0.14;
			tailGroupRef.current.rotation.x = THREE.MathUtils.lerp(
				tailGroupRef.current.rotation.x,
				0,
				delta * 8
			);
		}
	});

	const catOrange = '#f59e0b';
	const catInnerEar = '#d97706';
	const catFeatureBlack = '#111827';

	return (
		<group
			ref={catRootRef}
			position={position}
			rotation={[0, -0.35, 0]}
			onClick={(e) => {
				e.stopPropagation();
				triggerStretch();
			}}
			onPointerOver={(e) => {
				e.stopPropagation();
				setHovered(true);
				document.body.style.cursor = 'pointer';
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = 'auto';
			}}>
			{/* Label Interaktif Kucing saat Hover atau Stretching */}
			{isHtmlReady && (hovered || isStretching) && (
				<group position={[0, 0.78, 0.1]}>
					<Html center distanceFactor={10} style={{pointerEvents: 'none', userSelect: 'none'}}>
						<div className="px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-400/90 shadow-lg whitespace-nowrap flex items-center gap-1.5">
							<span className="text-[10px] font-bold text-amber-300">
								{isStretching ? 'Biiig Stretch~ 🐾' : 'Oyen (Klik Aku!) 🐱'}
							</span>
						</div>
					</Html>
				</group>
			)}

			<group ref={bodyGroupRef} position={[0, 0.24, 0]}>
				{/* === BADAN VOXEL KUCING === */}
				<RoundedBox args={[0.28, 0.22, 0.44]} position={[0, 0, 0]} radius={0.02} castShadow>
					<meshStandardMaterial color={catOrange} roughness={0.45} />
				</RoundedBox>

				{/* === KEPALA VOXEL PERSIS GAMBAR REFERENSI === */}
				<group ref={headGroupRef} position={[0, 0.16, 0.24]}>
					{/* Blok Wajah Utama */}
					<RoundedBox args={[0.42, 0.29, 0.28]} position={[0, 0, 0]} radius={0.02} castShadow>
						<meshStandardMaterial color={catOrange} roughness={0.42} />
					</RoundedBox>
					{/* Step Pixel Atas Kepala (Dahi Bertingkat) */}
					<RoundedBox args={[0.34, 0.05, 0.26]} position={[0, 0.16, 0]} radius={0.015} castShadow>
						<meshStandardMaterial color={catOrange} roughness={0.42} />
					</RoundedBox>

					{/* --- TELINGA KIRI BERTINGKAT (STEPPED VOXEL EAR) --- */}
					<group position={[-0.13, 0.2, 0]}>
						<mesh position={[0, 0, 0]} castShadow>
							<boxGeometry args={[0.12, 0.06, 0.12]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						<mesh position={[-0.01, 0.05, 0]} castShadow>
							<boxGeometry args={[0.09, 0.06, 0.11]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						<mesh position={[-0.02, 0.095, 0]} castShadow>
							<boxGeometry args={[0.06, 0.05, 0.1]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						{/* Lekukan Dalam Telinga Kiri */}
						<mesh position={[0.01, 0.02, 0.055]}>
							<boxGeometry args={[0.055, 0.06, 0.02]} />
							<meshStandardMaterial color={catInnerEar} />
						</mesh>
					</group>

					{/* --- TELINGA KANAN BERTINGKAT (STEPPED VOXEL EAR) --- */}
					<group position={[0.13, 0.2, 0]}>
						<mesh position={[0, 0, 0]} castShadow>
							<boxGeometry args={[0.12, 0.06, 0.12]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						<mesh position={[0.01, 0.05, 0]} castShadow>
							<boxGeometry args={[0.09, 0.06, 0.11]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						<mesh position={[0.02, 0.095, 0]} castShadow>
							<boxGeometry args={[0.06, 0.05, 0.1]} />
							<meshStandardMaterial color={catOrange} />
						</mesh>
						{/* Lekukan Dalam Telinga Kanan */}
						<mesh position={[-0.01, 0.02, 0.055]}>
							<boxGeometry args={[0.055, 0.06, 0.02]} />
							<meshStandardMaterial color={catInnerEar} />
						</mesh>
					</group>

					{/* --- KUMIS PIPI VOXEL TIMBUL (2 BARIS KIRI & KANAN) --- */}
					{/* Pipi Kiri */}
					<mesh position={[-0.23, -0.02, 0.03]} castShadow>
						<boxGeometry args={[0.07, 0.042, 0.1]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[-0.23, -0.09, 0.03]} castShadow>
						<boxGeometry args={[0.07, 0.042, 0.1]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					{/* Pipi Kanan */}
					<mesh position={[0.23, -0.02, 0.03]} castShadow>
						<boxGeometry args={[0.07, 0.042, 0.1]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[0.23, -0.09, 0.03]} castShadow>
						<boxGeometry args={[0.07, 0.042, 0.1]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>

					{/* --- MATA HITAM VERTIKAL --- */}
					<mesh position={[-0.095, 0.03, 0.142]}>
						<boxGeometry args={[0.048, 0.078, 0.015]} />
						<meshStandardMaterial color={catFeatureBlack} roughness={0.2} />
					</mesh>
					<mesh position={[0.095, 0.03, 0.142]}>
						<boxGeometry args={[0.048, 0.078, 0.015]} />
						<meshStandardMaterial color={catFeatureBlack} roughness={0.2} />
					</mesh>

					{/* --- HIDUNG & MULUT SENYUM HITAM (BENTUK ω) --- */}
					{/* Hidung */}
					<mesh position={[0, -0.025, 0.145]}>
						<boxGeometry args={[0.068, 0.042, 0.02]} />
						<meshStandardMaterial color={catFeatureBlack} />
					</mesh>
					{/* Garis Tengah Bawah Hidung */}
					<mesh position={[0, -0.062, 0.144]}>
						<boxGeometry args={[0.03, 0.045, 0.018]} />
						<meshStandardMaterial color={catFeatureBlack} />
					</mesh>
					{/* Garis Senyum Bawah */}
					<mesh position={[0, -0.088, 0.144]}>
						<boxGeometry args={[0.15, 0.028, 0.018]} />
						<meshStandardMaterial color={catFeatureBlack} />
					</mesh>
					{/* Ujung Senyum Naik Kiri & Kanan */}
					<mesh position={[-0.065, -0.068, 0.144]}>
						<boxGeometry args={[0.028, 0.042, 0.018]} />
						<meshStandardMaterial color={catFeatureBlack} />
					</mesh>
					<mesh position={[0.065, -0.068, 0.144]}>
						<boxGeometry args={[0.028, 0.042, 0.018]} />
						<meshStandardMaterial color={catFeatureBlack} />
					</mesh>
				</group>

				{/* === 4 KAKI VOXEL DENGAN PAW TIMBUL === */}
				{/* Kaki Depan Kiri */}
				<group ref={frontLeftLegRef} position={[-0.085, -0.08, 0.14]}>
					<mesh position={[0, -0.08, 0]} castShadow>
						<boxGeometry args={[0.09, 0.18, 0.09]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[0, -0.15, 0.02]} castShadow>
						<boxGeometry args={[0.095, 0.055, 0.12]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
				</group>

				{/* Kaki Depan Kanan */}
				<group ref={frontRightLegRef} position={[0.085, -0.08, 0.14]}>
					<mesh position={[0, -0.08, 0]} castShadow>
						<boxGeometry args={[0.09, 0.18, 0.09]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[0, -0.15, 0.02]} castShadow>
						<boxGeometry args={[0.095, 0.055, 0.12]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
				</group>

				{/* Kaki Belakang Kiri */}
				<group ref={backLeftLegRef} position={[-0.085, -0.08, -0.14]}>
					<mesh position={[0, -0.08, 0]} castShadow>
						<boxGeometry args={[0.09, 0.18, 0.09]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[0, -0.15, 0.02]} castShadow>
						<boxGeometry args={[0.095, 0.055, 0.12]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
				</group>

				{/* Kaki Belakang Kanan */}
				<group ref={backRightLegRef} position={[0.085, -0.08, -0.14]}>
					<mesh position={[0, -0.08, 0]} castShadow>
						<boxGeometry args={[0.09, 0.18, 0.09]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					<mesh position={[0, -0.15, 0.02]} castShadow>
						<boxGeometry args={[0.095, 0.055, 0.12]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
				</group>

				{/* === EKOR TEGAK MELENGKUNG (HOOKED VOXEL TAIL) === */}
				<group ref={tailGroupRef} position={[0, 0.04, -0.22]}>
					{/* Pangkal Ekor */}
					<mesh position={[0, 0, -0.04]} castShadow>
						<boxGeometry args={[0.065, 0.065, 0.09]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					{/* Batang Ekor Vertikal */}
					<mesh position={[0, 0.14, -0.07]} castShadow>
						<boxGeometry args={[0.065, 0.28, 0.065]} />
						<meshStandardMaterial color={catOrange} />
					</mesh>
					{/* Ujung Ekor Kotak Melengkung ke Depan */}
					<RoundedBox
						args={[0.085, 0.085, 0.12]}
						position={[0, 0.26, -0.03]}
						radius={0.015}
						castShadow>
						<meshStandardMaterial color={catOrange} />
					</RoundedBox>
				</group>
			</group>
		</group>
	);
}

// =========================================================
// 3. MEJA BARU & AKUARIUM DENGAN IKAN BERGERAK
// =========================================================
function AquariumTable({position}: {position: [number, number, number]}) {
	const fish1Ref = useRef<THREE.Group>(null);
	const fish1TailRef = useRef<THREE.Mesh>(null);
	const fish2Ref = useRef<THREE.Group>(null);
	const fish2TailRef = useRef<THREE.Mesh>(null);
	const fish3Ref = useRef<THREE.Group>(null);
	const fish3TailRef = useRef<THREE.Mesh>(null);

	const bubble1Ref = useRef<THREE.Mesh>(null);
	const bubble2Ref = useRef<THREE.Mesh>(null);
	const bubble3Ref = useRef<THREE.Mesh>(null);

	useFrame((state) => {
		const t = state.clock.getElapsedTime();

		// Ikan 1 (Clownfish Oranye) - Berenang lintasan elips utama
		if (fish1Ref.current) {
			const speed1 = 1.15;
			const x = Math.sin(t * speed1) * 0.42;
			const z = Math.cos(t * speed1) * 0.14;
			const y = 1.14 + Math.sin(t * 2.3) * 0.06;

			const dx = Math.cos(t * speed1) * speed1 * 0.42;
			const dz = -Math.sin(t * speed1) * speed1 * 0.14;

			fish1Ref.current.position.set(x, y, z);
			fish1Ref.current.rotation.y = Math.atan2(dx, dz);
		}
		if (fish1TailRef.current) {
			fish1TailRef.current.rotation.y = Math.sin(t * 16) * 0.45;
		}

		// Ikan 2 (Blue Tang Cyan) - Berenang arah sebaliknya di lapisan atas
		if (fish2Ref.current) {
			const speed2 = 0.9;
			const x = Math.cos(t * speed2 + 1.5) * 0.36;
			const z = Math.sin(t * speed2 + 1.5) * 0.13;
			const y = 1.24 + Math.cos(t * 1.9) * 0.05;

			const dx = -Math.sin(t * speed2 + 1.5) * speed2 * 0.36;
			const dz = Math.cos(t * speed2 + 1.5) * speed2 * 0.13;

			fish2Ref.current.position.set(x, y, z);
			fish2Ref.current.rotation.y = Math.atan2(dx, dz);
		}
		if (fish2TailRef.current) {
			fish2TailRef.current.rotation.y = Math.cos(t * 14) * 0.45;
		}

		// Ikan 3 (Goldfish Kuning Emas) - Berenang santai di dekat karang bawah
		if (fish3Ref.current) {
			const speed3 = 1.35;
			const x = Math.sin(t * speed3 + 3.2) * 0.3;
			const z = Math.sin(t * speed3 * 2 + 3.2) * 0.11;
			const y = 1.05 + Math.sin(t * 2.8) * 0.035;

			const dx = Math.cos(t * speed3 + 3.2) * speed3 * 0.3;
			const dz = Math.cos(t * speed3 * 2 + 3.2) * (speed3 * 2) * 0.11;

			fish3Ref.current.position.set(x, y, z);
			fish3Ref.current.rotation.y = Math.atan2(dx, dz);
		}
		if (fish3TailRef.current) {
			fish3TailRef.current.rotation.y = Math.sin(t * 18) * 0.5;
		}

		// Animasi Gelembung Udara Naik
		if (bubble1Ref.current) {
			bubble1Ref.current.position.y = 0.96 + ((t * 0.22) % 0.42);
		}
		if (bubble2Ref.current) {
			bubble2Ref.current.position.y = 0.96 + (((t + 0.8) * 0.18) % 0.42);
		}
		if (bubble3Ref.current) {
			bubble3Ref.current.position.y = 0.96 + (((t + 1.6) * 0.25) % 0.42);
		}
	});

	return (
		<group position={position}>
			{/* === MEJA KABINET PENYANGGA AKUARIUM === */}
			{/* Daun Meja Kayu Tebal */}
			<RoundedBox
				args={[1.55, 0.08, 0.72]}
				position={[0, 0.78, 0]}
				radius={0.02}
				castShadow
				receiveShadow>
				<meshStandardMaterial color="#854d0e" roughness={0.55} />
			</RoundedBox>

			{/* Bodi Kabinet Bawah */}
			<RoundedBox
				args={[1.42, 0.68, 0.62]}
				position={[0, 0.4, 0]}
				radius={0.02}
				castShadow
				receiveShadow>
				<meshStandardMaterial color="#1e293b" roughness={0.7} />
			</RoundedBox>

			{/* Pintu Kabinet Kiri & Kanan + Handle Emas */}
			<mesh position={[-0.34, 0.4, 0.315]}>
				<boxGeometry args={[0.62, 0.56, 0.02]} />
				<meshStandardMaterial color="#334155" />
			</mesh>
			<mesh position={[0.34, 0.4, 0.315]}>
				<boxGeometry args={[0.62, 0.56, 0.02]} />
				<meshStandardMaterial color="#334155" />
			</mesh>
			<mesh position={[-0.08, 0.4, 0.33]}>
				<boxGeometry args={[0.025, 0.14, 0.02]} />
				<meshStandardMaterial color="#fbbf24" />
			</mesh>
			<mesh position={[0.08, 0.4, 0.33]}>
				<boxGeometry args={[0.025, 0.14, 0.02]} />
				<meshStandardMaterial color="#fbbf24" />
			</mesh>

			{/* === TANGKI AKUARIUM KACA === */}
			{/* Frame Bawah Akuarium */}
			<mesh position={[0, 0.84, 0]} castShadow>
				<boxGeometry args={[1.28, 0.05, 0.54]} />
				<meshStandardMaterial color="#0f172a" />
			</mesh>

			{/* Pasir Dasar Akuarium */}
			<mesh position={[0, 0.89, 0]}>
				<boxGeometry args={[1.22, 0.06, 0.48]} />
				<meshStandardMaterial color="#fde68a" roughness={0.9} />
			</mesh>

			{/* Dekorasi Karang, Batu & Tanaman Air di Dalam Akuarium */}
			{/* Batu Karang Pink/Coral */}
			<mesh position={[-0.38, 0.98, -0.06]} castShadow>
				<boxGeometry args={[0.14, 0.14, 0.12]} />
				<meshStandardMaterial color="#f43f5e" />
			</mesh>
			<mesh position={[-0.28, 0.95, 0.04]} castShadow>
				<boxGeometry args={[0.1, 0.09, 0.1]} />
				<meshStandardMaterial color="#a855f7" />
			</mesh>
			{/* Batu Abu-abu + Airstone Gelembung */}
			<mesh position={[0.32, 0.96, -0.05]} castShadow>
				<boxGeometry args={[0.18, 0.11, 0.14]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>
			{/* Tanaman Rumput Laut Hijau */}
			<mesh position={[-0.46, 1.08, -0.1]}>
				<boxGeometry args={[0.05, 0.32, 0.05]} />
				<meshStandardMaterial color="#10b981" />
			</mesh>
			<mesh position={[0.45, 1.06, -0.08]}>
				<boxGeometry args={[0.05, 0.28, 0.05]} />
				<meshStandardMaterial color="#22c55e" />
			</mesh>
			<mesh position={[0.38, 1.02, 0.08]}>
				<boxGeometry args={[0.04, 0.2, 0.04]} />
				<meshStandardMaterial color="#16a34a" />
			</mesh>

			{/* Gelembung Udara (Bubbles) */}
			<mesh ref={bubble1Ref} position={[0.32, 1.0, -0.02]}>
				<boxGeometry args={[0.028, 0.028, 0.028]} />
				<meshStandardMaterial color="#e0f2fe" transparent opacity={0.75} />
			</mesh>
			<mesh ref={bubble2Ref} position={[0.28, 1.1, 0.02]}>
				<boxGeometry args={[0.022, 0.022, 0.022]} />
				<meshStandardMaterial color="#bae6fd" transparent opacity={0.7} />
			</mesh>
			<mesh ref={bubble3Ref} position={[0.35, 1.2, -0.04]}>
				<boxGeometry args={[0.025, 0.025, 0.025]} />
				<meshStandardMaterial color="#e0f2fe" transparent opacity={0.75} />
			</mesh>

			{/* --- IKAN 1: CLOWNFISH ORANYE --- */}
			<group ref={fish1Ref} position={[0, 1.14, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.045, 0.065, 0.12]} />
					<meshStandardMaterial color="#f97316" />
				</mesh>
				{/* Belang Putih Clownfish */}
				<mesh position={[0, 0, 0.01]}>
					<boxGeometry args={[0.048, 0.066, 0.025]} />
					<meshStandardMaterial color="#ffffff" />
				</mesh>
				{/* Mata Ikan */}
				<mesh position={[0.024, 0.01, 0.04]}>
					<boxGeometry args={[0.008, 0.014, 0.014]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				<mesh position={[-0.024, 0.01, 0.04]}>
					<boxGeometry args={[0.008, 0.014, 0.014]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				{/* Sirip Ekor Bergerak */}
				<mesh ref={fish1TailRef} position={[0, 0, -0.075]}>
					<boxGeometry args={[0.015, 0.055, 0.045]} />
					<meshStandardMaterial color="#fb923c" />
				</mesh>
			</group>

			{/* --- IKAN 2: NEON TETRA / BLUE TANG CYAN --- */}
			<group ref={fish2Ref} position={[0.2, 1.24, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.04, 0.058, 0.105]} />
					<meshStandardMaterial color="#06b6d4" emissive="#0891b2" emissiveIntensity={0.3} />
				</mesh>
				<mesh position={[0.022, 0.01, 0.035]}>
					<boxGeometry args={[0.008, 0.012, 0.012]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				<mesh position={[-0.022, 0.01, 0.035]}>
					<boxGeometry args={[0.008, 0.012, 0.012]} />
					<meshStandardMaterial color="#0f172a" />
				</mesh>
				<mesh ref={fish2TailRef} position={[0, 0, -0.065]}>
					<boxGeometry args={[0.014, 0.05, 0.04]} />
					<meshStandardMaterial color="#fde047" />
				</mesh>
			</group>

			{/* --- IKAN 3: GOLDFISH KUNING EMAS --- */}
			<group ref={fish3Ref} position={[-0.2, 1.05, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.038, 0.052, 0.095]} />
					<meshStandardMaterial color="#eab308" />
				</mesh>
				<mesh ref={fish3TailRef} position={[0, 0, -0.06]}>
					<boxGeometry args={[0.012, 0.048, 0.038]} />
					<meshStandardMaterial color="#fef08a" />
				</mesh>
			</group>

			{/* Kaca Air Akuarium Transparan */}
			<mesh position={[0, 1.15, 0]}>
				<boxGeometry args={[1.24, 0.56, 0.5]} />
				<meshStandardMaterial
					color="#38bdf8"
					transparent
					opacity={0.26}
					roughness={0.08}
					metalness={0.1}
				/>
			</mesh>

			{/* Penutup Atas Akuarium + Lampu LED Aquatic */}
			<mesh position={[0, 1.45, 0]} castShadow>
				<boxGeometry args={[1.28, 0.06, 0.54]} />
				<meshStandardMaterial color="#0f172a" />
			</mesh>
			<mesh position={[0, 1.415, 0]}>
				<boxGeometry args={[1.05, 0.015, 0.2]} />
				<meshStandardMaterial color="#67e8f9" emissive="#22d3ee" emissiveIntensity={1.4} />
			</mesh>
		</group>
	);
}

// =========================================================
// 4. RUANGAN MINIATUR KANTOR YANG LEBIH LUAS (8.6m x 8.6m)
// =========================================================
function MiniatureOffice({workingStates}: {workingStates: Record<AgentId, boolean>}) {
	return (
		<group>
			{/* LANTAI DIORAMA TEBAL DIPERLUAS (8.6 x 8.6) */}
			<RoundedBox args={[8.6, 0.3, 8.6]} position={[0, -0.15, 0]} radius={0.06} receiveShadow>
				<meshStandardMaterial color="#e5dec9" roughness={0.75} />
			</RoundedBox>

			{/* ListPlank / Baseboard Dinding */}
			<mesh position={[0, 0.08, -4.12]} receiveShadow>
				<boxGeometry args={[8.3, 0.16, 0.06]} />
				<meshStandardMaterial color="#94a3b8" />
			</mesh>
			<mesh position={[-4.12, 0.08, 0]} receiveShadow>
				<boxGeometry args={[0.06, 0.16, 8.3]} />
				<meshStandardMaterial color="#94a3b8" />
			</mesh>

			{/* DINDING BELAKANG & KIRI DIPERLUAS */}
			<mesh position={[0, 1.6, -4.22]} receiveShadow castShadow>
				<boxGeometry args={[8.6, 3.2, 0.24]} />
				<meshStandardMaterial color="#f1ede2" roughness={0.85} />
			</mesh>
			<mesh position={[0, 3.23, -4.22]}>
				<boxGeometry args={[8.64, 0.08, 0.28]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>

			<mesh position={[-4.22, 1.6, 0]} receiveShadow castShadow>
				<boxGeometry args={[0.24, 3.2, 8.6]} />
				<meshStandardMaterial color="#e8e2d5" roughness={0.85} />
			</mesh>
			<mesh position={[-4.22, 3.23, 0]}>
				<boxGeometry args={[0.28, 0.08, 8.64]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>

			{/* === JENDELA KANTOR BESAR DI DINDING BELAKANG === */}
			<group position={[1.85, 1.85, -4.08]}>
				<mesh castShadow>
					<boxGeometry args={[2.5, 1.6, 0.12]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, 0, 0.02]}>
					<boxGeometry args={[2.3, 1.4, 0.1]} />
					<meshStandardMaterial
						color="#7dd3fc"
						emissive="#38bdf8"
						emissiveIntensity={0.45}
						roughness={0.1}
					/>
				</mesh>
				<mesh position={[0, 0, 0.06]}>
					<boxGeometry args={[0.06, 1.45, 0.06]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, 0, 0.06]}>
					<boxGeometry args={[2.35, 0.06, 0.06]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, -0.82, 0.08]} castShadow>
					<boxGeometry args={[2.65, 0.08, 0.24]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
			</group>

			{/* === RAK DINDING & BINGKAI HIASAN DI DINDING KIRI === */}
			<group position={[-4.06, 1.75, -0.4]}>
				<mesh position={[0, 0, 0]} castShadow>
					<boxGeometry args={[0.22, 0.06, 1.6]} />
					<meshStandardMaterial color="#9a6b44" />
				</mesh>
				{/* Buku-buku Miniatur di Atas Rak */}
				<mesh position={[0, 0.12, -0.45]} castShadow>
					<boxGeometry args={[0.16, 0.18, 0.06]} />
					<meshStandardMaterial color="#06b6d4" />
				</mesh>
				<mesh position={[0, 0.11, -0.37]} castShadow>
					<boxGeometry args={[0.16, 0.16, 0.06]} />
					<meshStandardMaterial color="#f43f5e" />
				</mesh>
				<mesh position={[0, 0.13, -0.29]} castShadow>
					<boxGeometry args={[0.16, 0.2, 0.06]} />
					<meshStandardMaterial color="#fbbf24" />
				</mesh>
				{/* Tanaman Kecil di Rak */}
				<mesh position={[0, 0.09, 0.38]} castShadow>
					<boxGeometry args={[0.14, 0.12, 0.14]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
				<mesh position={[0, 0.2, 0.38]} castShadow>
					<boxGeometry args={[0.16, 0.14, 0.16]} />
					<meshStandardMaterial color="#22c55e" />
				</mesh>
			</group>

			{/* === MEJA BARU DENGAN AKUARIUM IKAN BERGERAK === */}
			<AquariumTable position={[1.95, 0, -2.25]} />

			{/* === AREA WORKDESK DUAL WORKSTATION (UNTUK LILLY & MOMO) === */}
			<group position={[-1.2, 0, -1.35]}>
				{/* Daun Meja Panjang 2.6m */}
				<RoundedBox
					args={[2.6, 0.09, 1.05]}
					position={[0, 0.74, 0]}
					radius={0.02}
					castShadow
					receiveShadow>
					<meshStandardMaterial color="#b4835b" roughness={0.55} />
				</RoundedBox>

				{/* Laci Kabinet Kanan */}
				<mesh position={[0.98, 0.36, 0]} castShadow receiveShadow>
					<boxGeometry args={[0.5, 0.7, 0.95]} />
					<meshStandardMaterial color="#9a6b44" />
				</mesh>

				{/* Kaki Meja Besi Kiri */}
				<mesh position={[-1.18, 0.36, -0.42]} castShadow>
					<boxGeometry args={[0.08, 0.7, 0.08]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[-1.18, 0.36, 0.42]} castShadow>
					<boxGeometry args={[0.08, 0.7, 0.08]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>

				{/* --- WORKSTATION 1 (KIRI - LILLY / CYAN) --- */}
				<group position={[-0.55, 0.79, -0.22]}>
					<mesh position={[0, 0.01, 0]}>
						<boxGeometry args={[0.28, 0.03, 0.2]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0, 0.16, -0.05]}>
						<boxGeometry args={[0.06, 0.3, 0.05]} />
						<meshStandardMaterial color="#334155" />
					</mesh>
					<mesh position={[0, 0.34, 0]} castShadow>
						<boxGeometry args={[0.78, 0.44, 0.05]} />
						<meshStandardMaterial color="#0f172a" />
					</mesh>
					<mesh position={[0, 0.34, 0.028]}>
						<planeGeometry args={[0.72, 0.38]} />
						<meshStandardMaterial
							color={workingStates.lilly ? '#06b6d4' : '#0f172a'}
							emissive={workingStates.lilly ? '#22d3ee' : '#0284c7'}
							emissiveIntensity={workingStates.lilly ? 0.95 : 0.2}
						/>
					</mesh>
				</group>
				{/* Keyboard & Mouse Lilly */}
				<mesh position={[-0.55, 0.79, 0.18]}>
					<boxGeometry args={[0.68, 0.01, 0.3]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[-0.6, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.34, 0.025, 0.13]} />
					<meshStandardMaterial color="#e2e8f0" />
				</mesh>
				<mesh position={[-0.32, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.06, 0.025, 0.1]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>

				{/* --- WORKSTATION 2 (KANAN - MOMO / ROSE) --- */}
				<group position={[0.55, 0.79, -0.22]}>
					<mesh position={[0, 0.01, 0]}>
						<boxGeometry args={[0.28, 0.03, 0.2]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0, 0.16, -0.05]}>
						<boxGeometry args={[0.06, 0.3, 0.05]} />
						<meshStandardMaterial color="#334155" />
					</mesh>
					<mesh position={[0, 0.34, 0]} castShadow>
						<boxGeometry args={[0.78, 0.44, 0.05]} />
						<meshStandardMaterial color="#0f172a" />
					</mesh>
					<mesh position={[0, 0.34, 0.028]}>
						<planeGeometry args={[0.72, 0.38]} />
						<meshStandardMaterial
							color={workingStates.momo ? '#f43f5e' : '#0f172a'}
							emissive={workingStates.momo ? '#fb7185' : '#be123c'}
							emissiveIntensity={workingStates.momo ? 0.95 : 0.2}
						/>
					</mesh>
				</group>
				{/* Keyboard & Mouse Momo */}
				<mesh position={[0.55, 0.79, 0.18]}>
					<boxGeometry args={[0.68, 0.01, 0.3]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[0.5, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.34, 0.025, 0.13]} />
					<meshStandardMaterial color="#e2e8f0" />
				</mesh>
				<mesh position={[0.78, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.06, 0.025, 0.1]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>

				{/* PC TOWER GAMING DI TENGAH MEJA */}
				<group position={[0, 1.05, -0.22]}>
					<mesh castShadow>
						<boxGeometry args={[0.24, 0.52, 0.46]} />
						<meshStandardMaterial color="#0f172a" roughness={0.3} />
					</mesh>
					<mesh position={[0, 0.05, 0.232]}>
						<boxGeometry args={[0.14, 0.08, 0.01]} />
						<meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={1.2} />
					</mesh>
					<mesh position={[0, -0.1, 0.232]}>
						<boxGeometry args={[0.14, 0.08, 0.01]} />
						<meshStandardMaterial color="#fb7185" emissive="#f43f5e" emissiveIntensity={1.2} />
					</mesh>
				</group>
			</group>

			{/* === 2 KURSI KERJA KANTOR === */}
			{[-1.75, -0.65].map((chairX, idx) => (
				<group key={idx} position={[chairX, 0, -0.45]}>
					<mesh position={[0, 0.22, 0]} castShadow>
						<cylinderGeometry args={[0.04, 0.04, 0.42, 10]} />
						<meshStandardMaterial color="#334155" />
					</mesh>
					<mesh position={[0, 0.04, 0]} castShadow>
						<boxGeometry args={[0.5, 0.05, 0.1]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0, 0.04, 0]} castShadow>
						<boxGeometry args={[0.1, 0.05, 0.5]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<RoundedBox args={[0.52, 0.09, 0.52]} position={[0, 0.44, 0]} radius={0.03} castShadow>
						<meshStandardMaterial color="#64748b" />
					</RoundedBox>
					<RoundedBox args={[0.48, 0.58, 0.08]} position={[0, 0.76, 0.23]} radius={0.03} castShadow>
						<meshStandardMaterial color="#475569" />
					</RoundedBox>
					<mesh position={[-0.26, 0.56, 0.08]} castShadow>
						<boxGeometry args={[0.05, 0.05, 0.26]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.26, 0.56, 0.08]} castShadow>
						<boxGeometry args={[0.05, 0.05, 0.26]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
				</group>
			))}

			{/* === AREA REHAT: SOFA 2-SEATER, KARPET LUAS, LAMPU & MEJA KOPI === */}
			<group position={[1.55, 0, 1.05]}>
				{/* Karpet Ruang Santai Diperluas (Tempat Sofa, Meja Kopi & Kucing Oyen) */}
				<RoundedBox
					args={[3.35, 0.025, 3.25]}
					position={[0.05, 0.012, 0.75]}
					radius={0.01}
					receiveShadow>
					<meshStandardMaterial color="#cbd5e1" roughness={0.92} />
				</RoundedBox>
				{/* Aksen Karpet Dalam */}
				<mesh position={[0.05, 0.026, 0.75]} receiveShadow>
					<boxGeometry args={[2.95, 0.005, 2.85]} />
					<meshStandardMaterial color="#e2e8f0" roughness={0.95} />
				</mesh>

				{/* Base Sofa (2-Seater Lega) */}
				<RoundedBox
					args={[1.85, 0.24, 0.9]}
					position={[0, 0.14, 0]}
					radius={0.04}
					castShadow
					receiveShadow>
					<meshStandardMaterial color="#2563eb" roughness={0.65} />
				</RoundedBox>
				{/* Bantalan Duduk Kiri (Momo) */}
				<RoundedBox
					args={[0.74, 0.16, 0.78]}
					position={[-0.37, 0.3, 0.04]}
					radius={0.04}
					castShadow>
					<meshStandardMaterial color="#3b82f6" roughness={0.6} />
				</RoundedBox>
				{/* Bantalan Duduk Kanan (Lilly) */}
				<RoundedBox args={[0.74, 0.16, 0.78]} position={[0.37, 0.3, 0.04]} radius={0.04} castShadow>
					<meshStandardMaterial color="#3b82f6" roughness={0.6} />
				</RoundedBox>
				{/* Sandaran Belakang & Lengan Sofa */}
				<RoundedBox args={[1.85, 0.65, 0.24]} position={[0, 0.52, -0.35]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>
				<RoundedBox args={[0.24, 0.48, 0.92]} position={[-0.86, 0.36, 0]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>
				<RoundedBox args={[0.24, 0.48, 0.92]} position={[0.86, 0.36, 0]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>

				{/* Meja Kopi dengan 2 Tatakan Gelas */}
				<group position={[0, 0, 1.28]}>
					<RoundedBox
						args={[1.15, 0.07, 0.52]}
						position={[0, 0.36, 0]}
						radius={0.02}
						castShadow
						receiveShadow>
						<meshStandardMaterial color="#78350f" />
					</RoundedBox>
					<mesh position={[-0.46, 0.18, -0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.46, 0.18, -0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[-0.46, 0.18, 0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.46, 0.18, 0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					{/* Coaster Kiri (Momo - Rose) */}
					<mesh position={[-0.28, 0.405, -0.05]}>
						<cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
						<meshStandardMaterial color="#f43f5e" />
					</mesh>
					{/* Coaster Kanan (Lilly - Cyan) */}
					<mesh position={[0.28, 0.405, -0.05]}>
						<cylinderGeometry args={[0.08, 0.08, 0.02, 12]} />
						<meshStandardMaterial color="#06b6d4" />
					</mesh>
				</group>

				{/* Lampu Berdiri */}
				<group position={[1.28, 0, -0.1]}>
					<mesh position={[0, 0.04, 0]}>
						<cylinderGeometry args={[0.22, 0.24, 0.06, 16]} />
						<meshStandardMaterial color="#334155" />
					</mesh>
					<mesh position={[0, 0.85, 0]} castShadow>
						<cylinderGeometry args={[0.03, 0.03, 1.65, 10]} />
						<meshStandardMaterial color="#475569" />
					</mesh>
					<mesh position={[0, 1.65, 0]} castShadow>
						<cylinderGeometry args={[0.18, 0.28, 0.38, 16]} />
						<meshStandardMaterial color="#fef3c7" emissive="#f59e0b" emissiveIntensity={0.6} />
					</mesh>
				</group>
			</group>

			{/* === KUCING VOXEL OREN DI ATAS KARPET === */}
			<VoxelCat position={[0.58, 0.025, 2.38]} />

			{/* TANAMAN HIAS VOXEL DI SUDUT RUANGAN */}
			<group position={[-3.3, 0, 2.45]}>
				<mesh position={[0, 0.22, 0]} castShadow>
					<boxGeometry args={[0.48, 0.46, 0.48]} />
					<meshStandardMaterial color="#d97706" />
				</mesh>
				<mesh position={[0, 0.68, 0]} castShadow>
					<boxGeometry args={[0.38, 0.58, 0.38]} />
					<meshStandardMaterial color="#16a34a" />
				</mesh>
				<mesh position={[0, 1.0, 0]} castShadow>
					<boxGeometry args={[0.58, 0.38, 0.58]} />
					<meshStandardMaterial color="#22c55e" />
				</mesh>
			</group>
		</group>
	);
}

// =========================================================
// 5. CANVAS UTAMA DENGAN LILLY, MOMO, KUCING & AKUARIUM
// =========================================================
export default function Scene3D({onSelectAgent, workingStates}: Scene3DProps) {
	return (
		<div className="w-full h-full absolute inset-0 bg-[#0b1120]">
			<Canvas camera={{position: [10.8, 10.2, 10.8], fov: 30}} gl={{antialias: true}} shadows>
				<ambientLight intensity={0.85} />
				<directionalLight
					position={[8, 14, 7]}
					intensity={1.5}
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
				/>
				{/* Cahaya Hangat Lampu Berdiri di Sofa */}
				<pointLight position={[2.8, 2.2, 1.0]} color="#fbbf24" intensity={1.2} />
				{/* Cahaya Biru Laut dari Akuarium */}
				<pointLight position={[1.95, 1.5, -2.0]} color="#38bdf8" intensity={1.1} distance={4.5} />
				{/* Cahaya Monitor Lilly & Momo */}
				<pointLight
					position={[-1.7, 1.6, -1.3]}
					color="#22d3ee"
					intensity={workingStates.lilly ? 1.1 : 0.3}
				/>
				<pointLight
					position={[-0.6, 1.6, -1.3]}
					color="#fb7185"
					intensity={workingStates.momo ? 1.1 : 0.3}
				/>

				<MiniatureOffice workingStates={workingStates} />

				{AGENTS_CONFIG.map((agent) => (
					<VoxelAgent
						key={agent.id}
						config={agent}
						isWorking={workingStates[agent.id]}
						onClick={() => onSelectAgent(agent.id)}
					/>
				))}

				<ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={13} blur={1.8} far={4.5} />

				<OrbitControls
					target={[0, 0.65, 0]}
					enableZoom={true}
					minDistance={7}
					maxDistance={20}
					minPolarAngle={Math.PI / 6}
					maxPolarAngle={Math.PI / 2.6}
				/>
			</Canvas>
		</div>
	);
}
