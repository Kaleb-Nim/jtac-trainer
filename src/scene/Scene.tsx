'use client';

import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import Terrain from './Terrain';
import Target from './Target';
import Friendlies from './Friendlies';
import BombImpact from './BombImpact';
import JTACController from './JTACController';

export default function Scene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true }}
      camera={{ position: [0, 30, 80], fov: 60 }}
      className="absolute inset-0"
    >
      <color attach="background" args={['#b9c3c4']} />
      <fog attach="fog" args={['#b9c3c4', 210, 780]} />
      <Sky sunPosition={[80, 45, 110]} turbidity={6} rayleigh={1.2} mieCoefficient={0.004} />
      <hemisphereLight args={['#c8d5d8', '#43563d', 1.15]} />
      <ambientLight intensity={0.22} />
      <directionalLight
        position={[110, 180, 90]}
        intensity={1.7}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-260}
        shadow-camera-right={260}
        shadow-camera-top={260}
        shadow-camera-bottom={-260}
      />
      <Terrain />
      <Target />
      <Friendlies />
      <BombImpact />
      <JTACController />
    </Canvas>
  );
}
