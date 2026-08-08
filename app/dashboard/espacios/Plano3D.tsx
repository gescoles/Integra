"use client";

import { Suspense, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Environment } from "@react-three/drei";
import * as THREE from "three";

type Aula = {
  id: string;
  nombre: string;
  x: number;
  z: number;
  ancho: number;
  profundo: number;
  alto: number;
  color: string;
  tieneReservaHoy: boolean;
};

function Sala({ aula, onSelect, seleccionada }: { aula: Aula; onSelect: (id: string) => void; seleccionada: boolean }) {
  const [hover, setHover] = useState(false);
  const cx = aula.x + aula.ancho / 2;
  const cz = aula.z + aula.profundo / 2;

  return (
    <group>
      {/* Caja de la sala, extruida en altura para dar sensación de 3D real */}
      <mesh
        position={[cx, aula.alto / 2, cz]}
        onClick={(e) => {
          e.stopPropagation();
          onSelect(aula.id);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[aula.ancho, aula.alto, aula.profundo]} />
        <meshStandardMaterial
          color={aula.color}
          transparent
          opacity={seleccionada ? 0.95 : hover ? 0.85 : 0.65}
          emissive={seleccionada ? new THREE.Color(aula.color) : undefined}
          emissiveIntensity={seleccionada ? 0.3 : 0}
        />
      </mesh>
      {/* Contorno para que se distinga bien cada sala */}
      <lineSegments position={[cx, aula.alto / 2, cz]}>
        <edgesGeometry args={[new THREE.BoxGeometry(aula.ancho, aula.alto, aula.profundo)]} />
        <lineBasicMaterial color={seleccionada ? "#FD5249" : "#334155"} linewidth={seleccionada ? 2 : 1} />
      </lineSegments>

      <Text position={[cx, aula.alto + 0.35, cz]} fontSize={0.32} color="#0B1D4D" anchorX="center" anchorY="middle">
        {aula.nombre}
      </Text>
      {aula.tieneReservaHoy && (
        <mesh position={[cx + aula.ancho / 2 - 0.2, aula.alto + 0.1, cz - aula.profundo / 2 + 0.2]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#FD5249" emissive="#FD5249" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}

function Suelo({ ancho, profundo }: { ancho: number; profundo: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[ancho / 2, 0, profundo / 2]} receiveShadow>
      <planeGeometry args={[ancho + 2, profundo + 2]} />
      <meshStandardMaterial color="#F1F5F9" />
    </mesh>
  );
}

export function Plano3D({
  aulas,
  onSelectAula,
  aulaSeleccionadaId,
}: {
  aulas: Aula[];
  onSelectAula: (id: string) => void;
  aulaSeleccionadaId: string | null;
}) {
  const bounds = useMemo(() => {
    const maxX = Math.max(...aulas.map((a) => a.x + a.ancho), 8);
    const maxZ = Math.max(...aulas.map((a) => a.z + a.profundo), 6);
    return { maxX, maxZ };
  }, [aulas]);

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <Canvas shadows camera={{ position: [bounds.maxX * 0.9, bounds.maxX * 0.9, bounds.maxZ * 1.3], fov: 45 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={0.7} />
          <directionalLight position={[10, 15, 8]} intensity={1} castShadow />
          <Suelo ancho={bounds.maxX} profundo={bounds.maxZ} />
          {aulas.map((aula) => (
            <Sala key={aula.id} aula={aula} onSelect={onSelectAula} seleccionada={aula.id === aulaSeleccionadaId} />
          ))}
          <OrbitControls
            enablePan
            minDistance={4}
            maxDistance={30}
            maxPolarAngle={Math.PI / 2.1}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}
