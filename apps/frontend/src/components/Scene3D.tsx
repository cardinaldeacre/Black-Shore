'use client';

import {useRef, useState, useMemo} from 'react';
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
		role: "Maul's Assistant",
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
		role: "Umii's Assistant",
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

	const waypoints = useMemo(() => config.waypoints, [config.waypoints]);
	const waypointIdxRef = useRef<number>(0);
	const prevWorkingRef = useRef<boolean>(isWorking);
	const isInitializedRef = useRef<boolean>(false);

	// Offset waktu animasi agar gerakan Lilly & Momo tidak kaku serempak
	const animOffset = useMemo(() => (config.id === 'momo' ? 2.5 : 0), [config.id]);

	useFrame((state, delta) => {
		if (!rootRef.current) return;

		// Set posisi awal sekali saja saat pertama kali mount
		// (Mencegah posisi ke-reset saat state hovered berubah!)
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

				// Menghadap ke Monitor PC (-Z -> Math.PI)
				let angleDiff = Math.PI - rootRef.current.rotation.y;
				while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
				while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
				rootRef.current.rotation.y += angleDiff * Math.min(1, delta * 10);

				// Tangan mengetik cepat di atas keyboard
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

				// Menghadap ke depan Sofa (+Z -> 0)
				let angleDiff = 0 - rootRef.current.rotation.y;
				while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
				while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
				rootRef.current.rotation.y += angleDiff * Math.min(1, delta * 10);

				// Tangan kiri santai
				if (leftArmRef.current) {
					leftArmRef.current.rotation.x = THREE.MathUtils.lerp(
						leftArmRef.current.rotation.x,
						-0.35,
						delta * 8
					);
				}

				// Tangan kanan menyeruput kopi
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
							<span className="text-[9px] font-bold tracking-wide text-white">{config.name}</span>
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
						<span className={`text-[6px] font-mono leading-tight ${config.roleBadgeClass}`}>
							{config.role}
						</span>
					</div>
				</Html>
			</group>
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

				{/* Rambut Belakang & Samping (Dibedakan antara Perempuan/Lilly & Pria/Momo) */}
				{config.gender === 'female' ? (
					<>
						{/* Rambut Panjang Terurai Lilly */}
						<mesh position={[0, -0.06, -0.22]} castShadow>
							<boxGeometry args={[0.46, 0.54, 0.08]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[-0.22, -0.02, -0.02]} castShadow>
							<boxGeometry args={[0.06, 0.44, 0.42]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
						<mesh position={[0.22, -0.02, -0.02]} castShadow>
							<boxGeometry args={[0.06, 0.44, 0.42]} />
							<meshStandardMaterial color={config.hairColor} />
						</mesh>
					</>
				) : (
					<>
						{/* Potongan Rambut Pendek Rapi Momo */}
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

				{/* Cangkir Kopi di Tangan (Muncul saat Rehat di Sofa) */}
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
// 2. RUANGAN MINIATUR KANTOR (DIORAMA DUAL-AGENT)
// =========================================================
function MiniatureOffice({workingStates}: {workingStates: Record<AgentId, boolean>}) {
	return (
		<group>
			{/* LANTAI DIORAMA TEBAL */}
			<RoundedBox args={[6.8, 0.3, 6.8]} position={[0, -0.15, 0]} radius={0.05} receiveShadow>
				<meshStandardMaterial color="#e5dec9" roughness={0.75} />
			</RoundedBox>

			{/* ListPlank / Baseboard Dinding */}
			<mesh position={[0, 0.08, -3.22]} receiveShadow>
				<boxGeometry args={[6.5, 0.16, 0.06]} />
				<meshStandardMaterial color="#94a3b8" />
			</mesh>
			<mesh position={[-3.22, 0.08, 0]} receiveShadow>
				<boxGeometry args={[0.06, 0.16, 6.5]} />
				<meshStandardMaterial color="#94a3b8" />
			</mesh>

			{/* DINDING BELAKANG & KIRI */}
			<mesh position={[0, 1.5, -3.32]} receiveShadow castShadow>
				<boxGeometry args={[6.8, 3.0, 0.24]} />
				<meshStandardMaterial color="#f1ede2" roughness={0.85} />
			</mesh>
			<mesh position={[0, 3.03, -3.32]}>
				<boxGeometry args={[6.84, 0.08, 0.28]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>

			<mesh position={[-3.32, 1.5, 0]} receiveShadow castShadow>
				<boxGeometry args={[0.24, 3.0, 6.8]} />
				<meshStandardMaterial color="#e8e2d5" roughness={0.85} />
			</mesh>
			<mesh position={[-3.32, 3.03, 0]}>
				<boxGeometry args={[0.28, 0.08, 6.84]} />
				<meshStandardMaterial color="#64748b" />
			</mesh>

			{/* === JENDELA KANTOR BESAR DI DINDING BELAKANG === */}
			<group position={[1.4, 1.75, -3.18]}>
				<mesh castShadow>
					<boxGeometry args={[2.3, 1.55, 0.12]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, 0, 0.02]}>
					<boxGeometry args={[2.1, 1.35, 0.1]} />
					<meshStandardMaterial
						color="#7dd3fc"
						emissive="#38bdf8"
						emissiveIntensity={0.45}
						roughness={0.1}
					/>
				</mesh>
				<mesh position={[0, 0, 0.06]}>
					<boxGeometry args={[0.06, 1.4, 0.06]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, 0, 0.06]}>
					<boxGeometry args={[2.15, 0.06, 0.06]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, -0.8, 0.08]} castShadow>
					<boxGeometry args={[2.45, 0.08, 0.24]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
			</group>

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
					{/* Layar Monitor Lilly menyala terang hanya jika Lilly sedang bekerja */}
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
					{/* Layar Monitor Momo menyala terang hanya jika Momo sedang bekerja */}
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

			{/* === AREA REHAT: SOFA 2-SEATER, KARPET, LAMPU & MEJA KOPI === */}
			<group position={[1.55, 0, 1.05]}>
				<mesh position={[0, 0.01, 0.55]} receiveShadow>
					<boxGeometry args={[2.6, 0.02, 2.6]} />
					<meshStandardMaterial color="#cbd5e1" roughness={0.9} />
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
				{/* Bantalan Duduk Kiri (Tempat Momo: x lokal -0.37 -> world 1.18) */}
				<RoundedBox
					args={[0.74, 0.16, 0.78]}
					position={[-0.37, 0.3, 0.04]}
					radius={0.04}
					castShadow>
					<meshStandardMaterial color="#3b82f6" roughness={0.6} />
				</RoundedBox>
				{/* Bantalan Duduk Kanan (Tempat Lilly: x lokal +0.37 -> world 1.92) */}
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

			{/* TANAMAN HIAS VOXEL DI SUDUT RUANGAN */}
			<group position={[-2.5, 0, 1.8]}>
				<mesh position={[0, 0.22, 0]} castShadow>
					<boxGeometry args={[0.45, 0.44, 0.45]} />
					<meshStandardMaterial color="#d97706" />
				</mesh>
				<mesh position={[0, 0.65, 0]} castShadow>
					<boxGeometry args={[0.35, 0.55, 0.35]} />
					<meshStandardMaterial color="#16a34a" />
				</mesh>
				<mesh position={[0, 0.95, 0]} castShadow>
					<boxGeometry args={[0.55, 0.35, 0.55]} />
					<meshStandardMaterial color="#22c55e" />
				</mesh>
			</group>
		</group>
	);
}

// =========================================================
// 3. CANVAS UTAMA DENGAN LILLY & MOMO INDEPENDEN
// =========================================================
export default function Scene3D({onSelectAgent, workingStates}: Scene3DProps) {
	return (
		<div className="w-full h-full absolute inset-0 bg-[#0b1120]">
			<Canvas camera={{position: [9.5, 9.5, 9.5], fov: 30}} gl={{antialias: true}} shadows>
				<ambientLight intensity={0.85} />
				<directionalLight
					position={[7, 12, 6]}
					intensity={1.5}
					castShadow
					shadow-mapSize-width={2048}
					shadow-mapSize-height={2048}
				/>
				<pointLight position={[2.8, 2.2, 1.0]} color="#fbbf24" intensity={1.2} />
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

				<ContactShadows position={[0, 0.01, 0]} opacity={0.45} scale={10} blur={1.8} far={4} />

				<OrbitControls
					target={[0, 0.6, 0]}
					enableZoom={true}
					minDistance={7}
					maxDistance={18}
					minPolarAngle={Math.PI / 6}
					maxPolarAngle={Math.PI / 2.6}
				/>
			</Canvas>
		</div>
	);
}
