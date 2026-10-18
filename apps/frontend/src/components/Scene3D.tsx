'use client';

import {useRef, useState, useEffect} from 'react';
import {Canvas, useFrame} from '@react-three/fiber';
import {OrbitControls, Text} from '@react-three/drei';
import * as THREE from 'three';

interface Scene3DProps {
	onSelectAgent: () => void;
	isWorking: boolean; // true jika sedang memproses chat/bekerja
}

// 1. Komponen Karakter Voxel 3D (Gaya Blocky dengan Volume Timbul)
function VoxelAgent({isWorking, onClick}: {isWorking: boolean; onClick: () => void}) {
	const groupRef = useRef<THREE.Group>(null);
	const [hovered, setHovered] = useState(false);

	// Posisi target: Meja kerja [-1.5, 0, -1] atau Sofa [1.5, 0, 1.5]
	const targetPos = isWorking ? new THREE.Vector3(-1.5, 0.4, -1) : new THREE.Vector3(1.5, 0.2, 1.5);

	useFrame((_, delta) => {
		if (!groupRef.current) return;
		// Animasi perpindahan halus (lerp) saat agent berjalan dari sofa ke meja atau sebaliknya
		groupRef.current.position.lerp(targetPos, delta * 3);

		// Efek bobbing / berjalan kecil saat pindah posisi
		if (groupRef.current.position.distanceTo(targetPos) > 0.1) {
			groupRef.current.position.y = targetPos.y + Math.sin(Date.now() * 0.01) * 0.1;
		} else {
			groupRef.current.position.y = targetPos.y;
		}
	});

	return (
		<group
			ref={groupRef}
			position={[1.5, 0.2, 1.5]}
			onClick={(e) => {
				e.stopPropagation();
				onClick();
			}}
			onPointerOver={() => setHovered(true)}
			onPointerOut={() => setHovered(false)}>
			{/* Kepala Voxel (Block Timbul) */}
			<mesh position={[0, 0.9, 0]}>
				<boxGeometry args={[0.4, 0.4, 0.4]} />
				<meshStandardMaterial color="#fcd34d" roughness={0.3} />
			</mesh>

			{/* Badan / Jaket Voxel */}
			<mesh position={[0, 0.45, 0]}>
				<boxGeometry args={[0.45, 0.5, 0.25]} />
				<meshStandardMaterial color={isWorking ? '#06b6d4' : '#ec4899'} roughness={0.4} />
			</mesh>

			{/* Kaki Voxel */}
			<mesh position={[-0.12, 0.1, 0]}>
				<boxGeometry args={[0.15, 0.3, 0.2]} />
				<meshStandardMaterial color="#1e293b" />
			</mesh>
			<mesh position={[0.12, 0.1, 0]}>
				<boxGeometry args={[0.15, 0.3, 0.2]} />
				<meshStandardMaterial color="#1e293b" />
			</mesh>

			{/* Status Teks di atas Kepala Agent */}
			<Text
				position={[0, 1.3, 0]}
				fontSize={0.15}
				color={hovered ? '#22d3ee' : '#ffffff'}
				anchorX="center"
				anchorY="middle">
				{isWorking ? '💻 Sedang Bekerja...' : '☕ Rehat Sambil Kopi'}
			</Text>
		</group>
	);
}

// 2. Komponen Ruangan Kantor (Dinding, Jendela, Meja, PC, dan Sofa)
function OfficeRoom() {
	return (
		<group>
			{/* Lantai Kantor */}
			<mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
				<planeGeometry args={[8, 8]} />
				<meshStandardMaterial color="#1e293b" roughness={0.8} />
			</mesh>

			{/* Dinding Belakang */}
			<mesh position={[0, 2, -4]}>
				<boxGeometry args={[8, 4, 0.2]} />
				<meshStandardMaterial color="#0f172a" />
			</mesh>

			{/* Dinding Kiri */}
			<mesh position={[-4, 2, 0]} rotation={[0, Math.PI / 2, 0]}>
				<boxGeometry args={[8, 4, 0.2]} />
				<meshStandardMaterial color="#0f172a" />
			</mesh>

			{/* Jendela Kaca di Dinding Belakang */}
			<mesh position={[2, 2.2, -3.9]} receiveShadow>
				<boxGeometry args={[2.5, 1.8, 0.1]} />
				<meshStandardMaterial color="#38bdf8" transparent opacity={0.3} roughness={0.1} />
			</mesh>

			{/* --- WORKDESK AREA (Meja Kerja & PC) --- */}
			<group position={[-1.5, 0, -1]}>
				{/* Meja Kayu */}
				<mesh position={[0, 0.4, 0]}>
					<boxGeometry args={[1.8, 0.08, 1]} />
					<meshStandardMaterial color="#78350f" roughness={0.5} />
				</mesh>
				{/* Kaki Meja */}
				<mesh position={[-0.8, 0.2, -0.4]}>
					<cylinderGeometry args={[0.04, 0.04, 0.4]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0.8, 0.2, -0.4]}>
					<cylinderGeometry args={[0.04, 0.04, 0.4]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[-0.8, 0.2, 0.4]}>
					<cylinderGeometry args={[0.04, 0.04, 0.4]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				<mesh position={[0.8, 0.2, 0.4]}>
					<cylinderGeometry args={[0.04, 0.04, 0.4]} />
					<meshStandardMaterial color="#334155" />
				</mesh>

				{/* Monitor PC */}
				<mesh position={[0, 0.75, -0.3]}>
					<boxGeometry args={[0.8, 0.5, 0.05]} />
					<meshStandardMaterial color="#020617" metalness={0.9} />
				</mesh>
				{/* Layar Monitor Menyala */}
				<mesh position={[0, 0.75, -0.27]}>
					<planeGeometry args={[0.7, 0.4]} />
					<meshBasicMaterial color="#06b6d4" />
				</mesh>

				{/* Kursi Kerja */}
				<group position={[0, 0, 0.7]}>
					<mesh position={[0, 0.3, 0]}>
						<boxGeometry args={[0.5, 0.05, 0.5]} />
						<meshStandardMaterial color="#475569" />
					</mesh>
					<mesh position={[0, 0.55, -0.22]}>
						<boxGeometry args={[0.5, 0.5, 0.05]} />
						<meshStandardMaterial color="#475569" />
					</mesh>
				</group>
			</group>

			{/* --- LOUNGE AREA (Sofa Santai & Kopi) --- */}
			<group position={[1.5, 0, 1.5]}>
				{/* Sofa Utama */}
				<mesh position={[0, 0.25, 0]}>
					<boxGeometry args={[1.4, 0.3, 0.7]} />
					<meshStandardMaterial color="#3b82f6" roughness={0.7} />
				</mesh>
				{/* Sandaran Sofa */}
				<mesh position={[0, 0.55, -0.25]}>
					<boxGeometry args={[1.4, 0.6, 0.2]} />
					<meshStandardMaterial color="#2563eb" roughness={0.7} />
				</mesh>

				{/* Meja Kopi Kecil */}
				<mesh position={[0, 0.2, 0.9]}>
					<cylinderGeometry args={[0.3, 0.3, 0.04]} />
					<meshStandardMaterial color="#cbd5e1" />
				</mesh>
				<mesh position={[0, 0.1, 0.9]}>
					<cylinderGeometry args={[0.05, 0.05, 0.2]} />
					<meshStandardMaterial color="#334155" />
				</mesh>
				{/* Cangkir Kopi */}
				<mesh position={[0.1, 0.25, 0.9]}>
					<cylinderGeometry args={[0.04, 0.03, 0.08]} />
					<meshStandardMaterial color="#ffffff" />
				</mesh>
			</group>
		</group>
	);
}

export default function Scene3D({onSelectAgent, isWorking}: Scene3DProps) {
	return (
		<div className="w-full h-full absolute inset-0">
			<Canvas camera={{position: [0, 4, 6], fov: 55}} gl={{antialias: true}} shadows>
				<ambientLight intensity={0.8} />
				<directionalLight position={[4, 6, 3]} intensity={1.2} castShadow />
				<pointLight position={[-2, 3, -2]} color="#38bdf8" intensity={1.5} />

				{/* Ruangan Kantor & Furnitur */}
				<OfficeRoom />

				{/* Karakter Agent Voxel */}
				<VoxelAgent isWorking={isWorking} onClick={onSelectAgent} />

				{/* Kontrol Kamera */}
				<OrbitControls
					enableZoom={true}
					maxDistance={9}
					minDistance={3}
					maxPolarAngle={Math.PI / 2 - 0.05}
				/>
			</Canvas>
		</div>
	);
}
