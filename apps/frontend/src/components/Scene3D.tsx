'use client';

import {useRef, useState, useMemo} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import {OrbitControls, Html, ContactShadows, RoundedBox} from '@react-three/drei';
import * as THREE from 'three';

interface Scene3DProps {
	onSelectAgent: () => void;
	isWorking: boolean;
}

// 1. KARAKTER VOXEL 3D DENGAN WAYPOINT ZIGZAG
function VoxelAgent({isWorking, onClick}: {isWorking: boolean; onClick: () => void}) {
	const rootRef = useRef<THREE.Group>(null);
	const headRef = useRef<THREE.Group>(null);
	const leftArmRef = useRef<THREE.Group>(null);
	const rightArmRef = useRef<THREE.Group>(null);
	const leftLegRef = useRef<THREE.Group>(null);
	const rightLegRef = useRef<THREE.Group>(null);
	const steamRef = useRef<THREE.Mesh>(null);

	const [hovered, setHovered] = useState(false);
	const [agentState, setAgentState] = useState<'resting' | 'walking' | 'working'>('resting');

	// Rute Zigzag (Waypoints)
	const waypoints = useMemo(
		() => [
			new THREE.Vector3(1.55, 0.44, 1.08), // [0] Titik Duduk Sofa
			new THREE.Vector3(1.55, 0.56, 1.72), // [1] Berdiri di celah depan Sofa (sebelum meja kopi)
			new THREE.Vector3(0.35, 0.56, 1.72), // [2] Geser ke kiri melewati lengan Sofa & Karpet
			new THREE.Vector3(0.15, 0.56, 0.35), // [3] Zigzag ke tengah ruangan
			new THREE.Vector3(-0.65, 0.56, -0.48), // [4] Berdiri di samping kanan Kursi Kerja
			new THREE.Vector3(-1.4, 0.48, -0.48), // [5] Masuk & Duduk di Kursi Kerja
		],
		[]
	);

	const waypointIdxRef = useRef<number>(0);
	const prevWorkingRef = useRef<boolean>(isWorking);

	useFrame((state, delta) => {
		if (!rootRef.current) return;
		const t = state.clock.getElapsedTime();
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

			const speed = 2.6;
			const step = Math.min(distXZ, delta * speed);
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
			position={[1.55, 0.44, 1.08]}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onPointerOver={() => {
				setHovered(true);
				document.body.style.cursor = 'pointer';
			}}
			onPointerOut={() => {
				setHovered(false);
				document.body.style.cursor = 'auto';
			}}>
			{/* FLOATING NAME TAG */}
			<Html position={[0, 1.25, 0]} center distanceFactor={10} zIndexRange={[10, 0]}>
				<div
					onClick={onClick}
					className={`flex items-center gap-2 px-3 py-1 rounded-md border shadow-xl cursor-pointer transition-all select-none whitespace-nowrap ${
						hovered
							? 'bg-slate-900 border-cyan-400 scale-110'
							: 'bg-slate-950/90 border-slate-700/80'
					}`}>
					<span className="text-xs font-bold tracking-wide text-white">Black Shore</span>
					<span
						className={`w-2.5 h-2.5 rounded-full ${
							agentState === 'working'
								? 'bg-cyan-400 animate-ping'
								: agentState === 'walking'
									? 'bg-amber-400'
									: 'bg-emerald-400'
						}`}
					/>
				</div>
			</Html>

			{/* === KEPALA & DETAIL WAJAH TIMBUL 3D === */}
			<group ref={headRef} position={[0, 0.52, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.42, 0.42, 0.42]} />
					<meshStandardMaterial color="#f5cba7" roughness={0.6} />
				</mesh>

				{/* Rambut 3D Timbul */}
				<mesh position={[0, 0.22, 0]} castShadow>
					<boxGeometry args={[0.46, 0.1, 0.46]} />
					<meshStandardMaterial color="#2c1810" />
				</mesh>
				<mesh position={[0, 0.14, 0.21]} castShadow>
					<boxGeometry args={[0.44, 0.1, 0.08]} />
					<meshStandardMaterial color="#2c1810" />
				</mesh>
				<mesh position={[0, 0.04, -0.21]} castShadow>
					<boxGeometry args={[0.46, 0.32, 0.06]} />
					<meshStandardMaterial color="#2c1810" />
				</mesh>
				<mesh position={[-0.22, 0.08, 0]} castShadow>
					<boxGeometry args={[0.05, 0.24, 0.44]} />
					<meshStandardMaterial color="#2c1810" />
				</mesh>
				<mesh position={[0.22, 0.08, 0]} castShadow>
					<boxGeometry args={[0.05, 0.24, 0.44]} />
					<meshStandardMaterial color="#2c1810" />
				</mesh>

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
					<meshStandardMaterial color="#1f110b" />
				</mesh>
				<mesh position={[0.09, 0.06, 0.22]}>
					<boxGeometry args={[0.1, 0.03, 0.03]} />
					<meshStandardMaterial color="#1f110b" />
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

				{/* Frame Kacamata 3D Timbul */}
				<mesh position={[0, 0.01, 0.235]}>
					<boxGeometry args={[0.34, 0.02, 0.02]} />
					<meshStandardMaterial color="#020617" />
				</mesh>

				{/* Hidung & Mulut 3D Timbul */}
				<mesh position={[0, -0.05, 0.23]}>
					<boxGeometry args={[0.06, 0.06, 0.05]} />
					<meshStandardMaterial color="#e0a97e" />
				</mesh>
				<mesh position={[0, -0.13, 0.22]}>
					<boxGeometry args={[0.1, 0.03, 0.02]} />
					<meshStandardMaterial color="#9a3412" />
				</mesh>
			</group>

			{/* === BADAN & JAKET LAYER TIMBUL 3D === */}
			<group position={[0, 0.08, 0]}>
				<mesh castShadow>
					<boxGeometry args={[0.38, 0.46, 0.22]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
				<mesh position={[0, 0.04, 0.12]}>
					<boxGeometry args={[0.06, 0.26, 0.02]} />
					<meshStandardMaterial color="#06b6d4" />
				</mesh>
				<mesh position={[-0.13, 0, 0.01]} castShadow>
					<boxGeometry args={[0.14, 0.47, 0.26]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[0.13, 0, 0.01]} castShadow>
					<boxGeometry args={[0.14, 0.47, 0.26]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[0, 0, -0.02]} castShadow>
					<boxGeometry args={[0.4, 0.47, 0.2]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
			</group>

			{/* === LENGAN KIRI === */}
			<group ref={leftArmRef} position={[-0.27, 0.26, 0]}>
				<mesh position={[0, -0.12, 0]} castShadow>
					<boxGeometry args={[0.14, 0.28, 0.16]} />
					<meshStandardMaterial color="#1e293b" />
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
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[0, -0.3, 0]} castShadow>
					<boxGeometry args={[0.11, 0.12, 0.12]} />
					<meshStandardMaterial color="#f5cba7" />
				</mesh>

				{/* Cangkir Kopi di Tangan (Muncul saat Rehat) */}
				{agentState === 'resting' && (
					<group position={[0, -0.32, 0.14]} rotation={[Math.PI / 3, 0, 0]}>
						<mesh castShadow>
							<cylinderGeometry args={[0.055, 0.045, 0.11, 12]} />
							<meshStandardMaterial color="#ffffff" />
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
					<meshStandardMaterial color="#334155" />
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
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, -0.31, 0.03]} castShadow>
					<boxGeometry args={[0.17, 0.09, 0.24]} />
					<meshStandardMaterial color="#090d16" />
				</mesh>
			</group>
		</group>
	);
}

// ==========================================
// 2. RUANGAN MINIATUR KANTOR (DIORAMA DETAIL)
// ==========================================
function MiniatureOffice({isWorking}: {isWorking: boolean}) {
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

			{/* === AREA WORKDESK (MEJA, MONITOR, PC TOWER, KEYBOARD) === */}
			<group position={[-1.4, 0, -1.35]}>
				<RoundedBox
					args={[2.2, 0.09, 1.05]}
					position={[0, 0.74, 0]}
					radius={0.02}
					castShadow
					receiveShadow>
					<meshStandardMaterial color="#b4835b" roughness={0.55} />
				</RoundedBox>
				<mesh position={[0.75, 0.36, 0]} castShadow receiveShadow>
					<boxGeometry args={[0.55, 0.7, 0.95]} />
					<meshStandardMaterial color="#9a6b44" />
				</mesh>
				<mesh position={[-0.95, 0.36, -0.42]} castShadow>
					<boxGeometry args={[0.08, 0.7, 0.08]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[-0.95, 0.36, 0.42]} castShadow>
					<boxGeometry args={[0.08, 0.7, 0.08]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>

				{/* MONITOR ULTRAWIDE + STAND */}
				<group position={[-0.15, 0.79, -0.22]}>
					<mesh position={[0, 0.01, 0]}>
						<boxGeometry args={[0.32, 0.03, 0.22]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0, 0.16, -0.05]}>
						<boxGeometry args={[0.07, 0.3, 0.05]} />
						<meshStandardMaterial color="#334155" />
					</mesh>
					<mesh position={[0, 0.34, 0]} castShadow>
						<boxGeometry args={[0.88, 0.48, 0.05]} />
						<meshStandardMaterial color="#0f172a" />
					</mesh>
					<mesh position={[0, 0.34, 0.028]}>
						<planeGeometry args={[0.82, 0.42]} />
						<meshStandardMaterial
							color={isWorking ? '#06b6d4' : '#0ea5e9'}
							emissive={isWorking ? '#22d3ee' : '#0284c7'}
							emissiveIntensity={isWorking ? 0.9 : 0.35}
						/>
					</mesh>
				</group>

				{/* PC TOWER GAMING DI ATAS MEJA */}
				<group position={[0.72, 1.08, -0.15]}>
					<mesh castShadow>
						<boxGeometry args={[0.28, 0.56, 0.52]} />
						<meshStandardMaterial color="#0f172a" roughness={0.3} />
					</mesh>
					<mesh position={[-0.145, 0, 0]}>
						<planeGeometry args={[0.44, 0.46]} />
						<meshStandardMaterial color="#020617" />
					</mesh>
					<mesh position={[-0.142, 0.06, 0]}>
						<boxGeometry args={[0.02, 0.12, 0.32]} />
						<meshStandardMaterial color="#22d3ee" emissive="#06b6d4" emissiveIntensity={1.2} />
					</mesh>
					<mesh position={[-0.142, -0.1, 0]}>
						<boxGeometry args={[0.02, 0.06, 0.28]} />
						<meshStandardMaterial color="#a855f7" emissive="#9333ea" emissiveIntensity={1.2} />
					</mesh>
					<mesh position={[0, 0.25, 0.265]}>
						<boxGeometry args={[0.06, 0.02, 0.02]} />
						<meshStandardMaterial color="#22d3ee" emissive="#22d3ee" emissiveIntensity={1} />
					</mesh>
				</group>

				{/* Keyboard, Mousepad & Mouse */}
				<mesh position={[-0.1, 0.79, 0.18]}>
					<boxGeometry args={[0.75, 0.01, 0.32]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[-0.15, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.38, 0.025, 0.14]} />
					<meshStandardMaterial color="#e2e8f0" />
				</mesh>
				<mesh position={[0.16, 0.805, 0.18]} castShadow>
					<boxGeometry args={[0.07, 0.025, 0.11]} />
					<meshStandardMaterial color="#f8fafc" />
				</mesh>
			</group>

			{/* === KURSI KERJA KANTOR === */}
			<group position={[-1.4, 0, -0.45]}>
				<mesh position={[0, 0.22, 0]} castShadow>
					<cylinderGeometry args={[0.04, 0.04, 0.42, 10]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0, 0.04, 0]} castShadow>
					<boxGeometry args={[0.55, 0.05, 0.1]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<mesh position={[0, 0.04, 0]} castShadow>
					<boxGeometry args={[0.1, 0.05, 0.55]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				<RoundedBox args={[0.58, 0.09, 0.56]} position={[0, 0.44, 0]} radius={0.03} castShadow>
					<meshStandardMaterial color="#64748b" />
				</RoundedBox>
				<RoundedBox args={[0.54, 0.62, 0.09]} position={[0, 0.78, 0.25]} radius={0.03} castShadow>
					<meshStandardMaterial color="#475569" />
				</RoundedBox>
				{/* Armrest Kiri */}
				<mesh position={[-0.3, 0.58, 0.08]} castShadow>
					<boxGeometry args={[0.06, 0.05, 0.32]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
				{/* Armrest Kanan (Dibuat agak mundur agar jalur masuk Agent dari kanan bebas hambatan) */}
				<mesh position={[0.3, 0.58, 0.12]} castShadow>
					<boxGeometry args={[0.06, 0.05, 0.24]} />
					<meshStandardMaterial color="#1e293b" />
				</mesh>
			</group>

			{/* === AREA REHAT: SOFA EMPUK, KARPET, LAMPU & MEJA KOPI === */}
			<group position={[1.55, 0, 1.05]}>
				<mesh position={[0, 0.01, 0.55]} receiveShadow>
					<boxGeometry args={[2.6, 0.02, 2.6]} />
					<meshStandardMaterial color="#cbd5e1" roughness={0.9} />
				</mesh>

				<RoundedBox
					args={[1.75, 0.24, 0.9]}
					position={[0, 0.14, 0]}
					radius={0.04}
					castShadow
					receiveShadow>
					<meshStandardMaterial color="#2563eb" roughness={0.65} />
				</RoundedBox>
				<RoundedBox
					args={[0.72, 0.16, 0.78]}
					position={[-0.37, 0.3, 0.04]}
					radius={0.04}
					castShadow>
					<meshStandardMaterial color="#3b82f6" roughness={0.6} />
				</RoundedBox>
				<RoundedBox args={[0.72, 0.16, 0.78]} position={[0.37, 0.3, 0.04]} radius={0.04} castShadow>
					<meshStandardMaterial color="#3b82f6" roughness={0.6} />
				</RoundedBox>
				<RoundedBox args={[1.75, 0.65, 0.24]} position={[0, 0.52, -0.35]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>
				<RoundedBox args={[0.24, 0.48, 0.92]} position={[-0.82, 0.36, 0]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>
				<RoundedBox args={[0.24, 0.48, 0.92]} position={[0.82, 0.36, 0]} radius={0.05} castShadow>
					<meshStandardMaterial color="#1d4ed8" roughness={0.65} />
				</RoundedBox>
				<RoundedBox
					args={[0.32, 0.32, 0.14]}
					position={[-0.52, 0.48, -0.14]}
					rotation={[0, 0.2, 0.15]}
					radius={0.04}
					castShadow>
					<meshStandardMaterial color="#f43f5e" />
				</RoundedBox>

				{/* Meja Kopi (Digeser sedikit ke z=1.22 agar celah jalan keluar sofa lega) */}
				<group position={[0, 0, 1.22]}>
					<RoundedBox
						args={[1.05, 0.07, 0.52]}
						position={[0, 0.36, 0]}
						radius={0.02}
						castShadow
						receiveShadow>
						<meshStandardMaterial color="#78350f" />
					</RoundedBox>
					<mesh position={[-0.42, 0.18, -0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.42, 0.18, -0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[-0.42, 0.18, 0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.42, 0.18, 0.18]} castShadow>
						<boxGeometry args={[0.06, 0.35, 0.06]} />
						<meshStandardMaterial color="#1e293b" />
					</mesh>
					<mesh position={[0.22, 0.405, -0.05]}>
						<cylinderGeometry args={[0.09, 0.09, 0.02, 12]} />
						<meshStandardMaterial color="#fbbf24" />
					</mesh>
				</group>

				{/* Lampu Berdiri */}
				<group position={[1.25, 0, -0.1]}>
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

// 3. CANVAS UTAMA DENGAN KAMERA MINIATUR LANGIT
export default function Scene3D({onSelectAgent, isWorking}: Scene3DProps) {
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
				<pointLight position={[-1.4, 1.6, -1.3]} color="#22d3ee" intensity={1.0} />

				<MiniatureOffice isWorking={isWorking} />
				<VoxelAgent isWorking={isWorking} onClick={onSelectAgent} />

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
