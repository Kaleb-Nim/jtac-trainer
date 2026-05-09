'use client';

import { Canvas } from '@react-three/fiber';
import Terrain from './Terrain';
import Target from './Target';
import Friendlies from './Friendlies';
import JTACController from './JTACController';

export default function Scene() {
  return (
    <Canvas
      shadows
      camera={{ position: [0, 30, 80], fov: 60 }}
      className="absolute inset-0"
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[100, 200, 100]} intensity={1.2} castShadow />
      <Terrain />
      <Target />
      <Friendlies />
      <JTACController />
    </Canvas>
  );
}
