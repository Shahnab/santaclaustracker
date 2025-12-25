import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Stars, PerspectiveCamera, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { ViewMode } from '../types';

// --- Fallback 3D Components ---

const Snow = ({ count = 100 }) => {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const t = {
        x: (Math.random() - 0.5) * 20,
        y: (Math.random() - 0.5) * 20,
        z: (Math.random() - 0.5) * 20,
        speed: 0.05 + Math.random() * 0.1
      };
      temp.push(t);
    }
    return temp;
  }, [count]);

  useFrame(() => {
    if (!mesh.current) return;
    
    particles.forEach((particle, i) => {
      particle.z += particle.speed * 2; 
      if (particle.z > 10) particle.z = -10;
      
      dummy.position.set(particle.x, particle.y, particle.z);
      dummy.updateMatrix();
      mesh.current!.setMatrixAt(i, dummy.matrix);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.03, 8, 8]} />
      <meshBasicMaterial color="#ffffff" opacity={0.8} transparent />
    </instancedMesh>
  );
};

const SleighModel = () => {
    const group = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if(group.current) {
            group.current.position.y = Math.sin(clock.getElapsedTime() * 2) * 0.1;
            group.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5) * 0.05;
        }
    });

    return (
        <group ref={group} rotation={[0, Math.PI, 0]}>
            <mesh position={[0, 0, 0]}>
                <boxGeometry args={[1, 0.6, 1.8]} />
                <meshStandardMaterial color="#880000" roughness={0.3} />
            </mesh>
            <mesh position={[0.4, -0.4, 0]}>
                <boxGeometry args={[0.1, 0.1, 2.2]} />
                <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[-0.4, -0.4, 0]}>
                <boxGeometry args={[0.1, 0.1, 2.2]} />
                <meshStandardMaterial color="#cccccc" metalness={0.8} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0.4, -0.4]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshStandardMaterial color="#553311" />
            </mesh>
            <mesh position={[0, 0, 0.9]}>
                 <cylinderGeometry args={[0.2, 0.1, 0.1, 16]} rotation={[Math.PI/2, 0, 0]} />
                 <meshBasicMaterial color="#00ffff" />
            </mesh>
             <pointLight position={[0, 0, 1.2]} color="#00ffff" intensity={2} distance={3} />
        </group>
    )
}

const MovingTerrain = ({ viewMode }: { viewMode: ViewMode }) => {
    const gridRef = useRef<THREE.Group>(null);
    useFrame(({ clock }) => {
        if (gridRef.current) {
            gridRef.current.position.z = (clock.getElapsedTime() * 5) % 2;
        }
    });
    
    const color = viewMode === ViewMode.NIGHT_VISION ? "#005500" : (viewMode === ViewMode.THERMAL ? "#550000" : "#003344");

    return (
        <group ref={gridRef} position={[0, -2, 0]}>
             <gridHelper args={[40, 40, color, color]} />
        </group>
    )
}

// --- Main Scene Component ---

const Scene3D = ({ viewMode }: { viewMode: ViewMode }) => {
  const [useVideo, setUseVideo] = useState(true);

  // CSS filters to simulate view modes on the video element
  const getVideoFilter = () => {
      switch (viewMode) {
          case ViewMode.NIGHT_VISION:
              return 'hue-rotate(90deg) sepia(100%) saturate(300%) hue-rotate(50deg) brightness(0.8)';
          case ViewMode.THERMAL:
              return 'contrast(150%) brightness(120%) hue-rotate(-50deg) saturate(150%)';
          default:
              return 'none';
      }
  };

  const handleVideoError = () => {
      // Quietly fallback if the video file is missing
      setUseVideo(false);
  };

  return (
    <div className="w-full h-full bg-[#020508] relative overflow-hidden rounded-sm border border-cyan-900/50">
      
      {useVideo ? (
        <video 
            src="./video/santa1.mp4"
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
            style={{ filter: getVideoFilter() }}
            onError={handleVideoError}
        />
      ) : (
        <Canvas>
            <PerspectiveCamera makeDefault position={[3, 2, 4]} fov={50} />
            <OrbitControls enableZoom={false} enablePan={false} enableRotate={false} />
            
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <directionalLight position={[-5, 5, -5]} intensity={0.5} />

            <group position={[0, 0, 0]} rotation={[0, -0.5, 0]}>
                <SleighModel />
            </group>
            
            <Snow />
            <MovingTerrain viewMode={viewMode} />
            <Stars radius={50} depth={20} count={1000} factor={4} saturation={0} fade speed={2} />
            
            <fog attach="fog" args={['#020508', 5, 20]} />
        </Canvas>
      )}
      
      {/* Overlay UI */}
      <div className="absolute inset-0 pointer-events-none z-10 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%] mix-blend-overlay"></div>
      
      <div className="absolute top-2 right-2 text-[8px] text-cyan-500 font-mono bg-black/50 px-1 border border-cyan-800 z-20">
         LIVE FEED: SLED-CAM 1
      </div>
      <div className="absolute bottom-2 left-2 text-[8px] text-red-500 font-mono animate-pulse z-20">
         REC ●
      </div>
    </div>
  );
};

export default Scene3D;
