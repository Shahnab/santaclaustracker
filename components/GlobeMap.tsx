
import React, { useRef, useMemo, useEffect, Suspense, useState } from 'react';
import { Canvas, useFrame, useLoader, useThree, extend } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { ViewMode } from '../types';

extend({ ThreeLine: THREE.Line });

// Helper to convert Lat/Lon to Vector3
const latLonToVector3 = (lat: number, lon: number, radius: number) => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = (radius * Math.sin(phi) * Math.sin(theta));
    const y = (radius * Math.cos(phi));
    return new THREE.Vector3(x, y, z);
}

// Custom Shader for the requested "Thermal Map" look
const ThermalEarthShader = {
  uniforms: {
    map: { value: null },
    specularMap: { value: null }, // Used as land/water mask (Black=Land, White=Ocean)
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    viewMode: { value: 0.0 }, // 0: Optical, 1: Thermal, 2: Night Vision
    time: { value: 0.0 }
  },
  vertexShader: `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vWorldPosition;

    void main() {
      vUv = uv;
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      
      vec4 mvPosition = viewMatrix * worldPosition;
      vViewPosition = -mvPosition.xyz;
      
      vNormal = normalize(normalMatrix * normal);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform sampler2D specularMap;
    uniform vec3 sunDirection; // In World Space
    uniform float viewMode; // 0.0 = Optical, 1.0 = Thermal, 2.0 = Night Vision
    uniform float time;
    
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;

    // Magma Palette Helper for Thermal
    vec3 getThermalColor(float value) {
        vec3 c0 = vec3(0.00, 0.00, 0.00); // Black
        vec3 c1 = vec3(0.16, 0.00, 0.28); // Deep Purple
        vec3 c2 = vec3(0.71, 0.15, 0.36); // Red/Pink
        vec3 c3 = vec3(0.97, 0.56, 0.28); // Orange
        vec3 c4 = vec3(0.99, 0.95, 0.70); // Yellow/White
        
        vec3 col = mix(c0, c1, smoothstep(0.0, 0.25, value));
        col = mix(col, c2, smoothstep(0.25, 0.50, value));
        col = mix(col, c3, smoothstep(0.50, 0.75, value));
        col = mix(col, c4, smoothstep(0.75, 1.00, value));
        return col;
    }

    void main() {
      // Sample Textures
      vec4 texColor = texture2D(map, vUv);
      float oceanMask = texture2D(specularMap, vUv).r; // 0.0 = Land, 1.0 = Ocean
      
      // Calculate Lighting
      vec3 normal = normalize(vNormal);
      vec3 viewSunDir = normalize(sunDirection); 
      float sunIntensity = max(0.0, dot(normal, viewSunDir));
      float terminator = smoothstep(-0.2, 0.2, sunIntensity);

      vec3 finalColor = vec3(0.0);

      // --- MODE SELECTION ---
      
      if (viewMode < 0.5) {
        // --- OPTICAL MODE (Realistic) ---
        vec3 dayColor = texColor.rgb;
        
        // City Lights (Only on Land)
        vec3 nightLights = vec3(0.0);
        if (oceanMask < 0.1) {
            // Simple logic: brighter terrain textures = likely cities (gray/white areas), darker = forests
            float brightness = dot(texColor.rgb, vec3(0.33, 0.33, 0.33));
            // Invert logic for standard maps where cities are grey/white but forests are dark green?
            // Usually we need a dedicated night lights texture, but here is a procedural approximation
            // Show lights in mid-bright land areas (cities), not super bright (deserts) or super dark
            float cityMask = smoothstep(0.3, 0.6, brightness); 
            nightLights = vec3(1.0, 0.8, 0.4) * cityMask * 0.8; 
        }
        
        // Mix Day and Night
        finalColor = mix(nightLights, dayColor, terminator);
        
        // Specular Reflection on Ocean Only
        if (oceanMask > 0.5) {
             vec3 viewDir = normalize(vWorldPosition); // Approx
             // Simple Phong Specular
             // Since sunDirection is passed as view-space vector in vertex (actually computed in useFrame), we need careful space handling.
             // We will stick to a simple diffuse boost on ocean for sun reflection to avoid artifacts.
             finalColor += vec3(0.3, 0.5, 0.7) * sunIntensity * 0.5;
        }

      } else if (viewMode < 1.5) {
        // --- THERMAL MODE (Realistic Magma/Ironbow) ---
        
        float brightness = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        
        // Calculate Heat Value (0.0 - 1.0)
        float heat = 0.0;
        
        if (oceanMask > 0.5) {
            // Ocean is generally cold, but currents exist.
            // Map brightness to low heat range
            heat = brightness * 0.25; 
        } else {
            // Land is warmer.
            // Map brightness to mid-high heat range
            heat = 0.3 + brightness * 0.7;
        }

        // Apply Thermal Palette
        finalColor = getThermalColor(heat);
        
        // Thermal sensors don't see shadows from sun, but we want 3D shape.
        // Flatten lighting but keep a rim light
        float rim = 1.0 - max(0.0, dot(vec3(0,0,1), normal));
        finalColor += vec3(0.2, 0.0, 0.1) * pow(rim, 3.0);
        
        // Slight digital noise/scanline
        float scan = sin(vUv.y * 800.0 + time * 5.0) * 0.03;
        finalColor += vec3(scan);

      } else {
        // --- NIGHT VISION MODE (Phosphor Green) ---
        
        float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
        
        // Boost contrast
        float nvValue = smoothstep(0.05, 0.6, luminance);
        
        // Green Phosphor Color
        vec3 nvColor = vec3(0.0, nvValue * 1.5, 0.1);
        
        // Add noise/grain
        float noise = fract(sin(dot(vUv * time, vec2(12.9898, 78.233))) * 43758.5453) * 0.15;
        
        // Scanlines
        float scanline = sin(vUv.y * 600.0) * 0.05;
        
        finalColor = nvColor + vec3(0.0, noise + scanline, 0.0);
        
        // Night Vision Rim Light
        float rim = 1.0 - max(0.0, dot(vec3(0,0,1), normal));
        finalColor += vec3(0.0, 0.5, 0.0) * pow(rim, 2.0);
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
};

// --- Earth Components ---

const Earth = ({ viewMode }: { viewMode: ViewMode }) => {
  const earthRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();
  
  // Load Textures
  const [colorMap, specularMap] = useLoader(TextureLoader, [
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg',
    'https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg'
  ]);

  const uniforms = useMemo(() => ({
    map: { value: colorMap },
    specularMap: { value: specularMap },
    sunDirection: { value: new THREE.Vector3(1, 0, 0) },
    viewMode: { value: 0.0 },
    time: { value: 0.0 }
  }), [colorMap, specularMap]);

  // Update viewMode uniform when prop changes
  useEffect(() => {
    if (materialRef.current) {
        let modeVal = 0.0;
        if (viewMode === ViewMode.THERMAL || viewMode === 'THERMAL') modeVal = 1.0;
        if (viewMode === ViewMode.NIGHT_VISION || viewMode === 'NIGHT_VISION') modeVal = 2.0;
        materialRef.current.uniforms.viewMode.value = modeVal;
        materialRef.current.needsUpdate = true;
    }
  }, [viewMode]);

  useFrame(({ clock }) => {
    // Rotation
    if (earthRef.current) {
        earthRef.current.rotation.y = clock.getElapsedTime() * 0.02; 
    }
    
    // Update Time Uniform
    if (materialRef.current) {
        materialRef.current.uniforms.time.value = clock.getElapsedTime();
    }

    // Update Sun Uniform
    if (materialRef.current && materialRef.current.uniforms && materialRef.current.uniforms.sunDirection) {
        const now = new Date();
        const utcHours = now.getUTCHours();
        const utcMinutes = now.getUTCMinutes();
        const decimalHours = utcHours + (utcMinutes / 60);
        
        // Calculate Sun Longitude: 12:00 UTC = 0 deg.
        const sunLong = (decimalHours - 12) * 15;
        
        // Convert to World Position (far away)
        const sunPos = latLonToVector3(0, -sunLong, 100); 
        
        // We need this in VIEW space for the shader normal comparison
        const sunPosView = sunPos.clone().applyMatrix4(camera.matrixWorldInverse);
        
        materialRef.current.uniforms.sunDirection.value.copy(sunPosView).normalize();
    }
  });

  return (
    <group>
        {/* Main Earth Sphere */}
        <mesh ref={earthRef} rotation={[0, 0, 0]}>
            <sphereGeometry args={[2.5, 64, 64]} />
            <shaderMaterial 
                ref={materialRef}
                uniforms={uniforms}
                vertexShader={ThermalEarthShader.vertexShader}
                fragmentShader={ThermalEarthShader.fragmentShader}
            />
        </mesh>
        
        {/* Atmosphere/Glow Halo - Dynamic visibility based on mode */}
        <mesh scale={[1.05, 1.05, 1.05]}>
             <sphereGeometry args={[2.5, 32, 32]} />
             <meshBasicMaterial 
                color={viewMode === ViewMode.NIGHT_VISION ? "#00ff00" : (viewMode === ViewMode.THERMAL ? "#ff4400" : "#004466")} 
                transparent 
                opacity={viewMode === ViewMode.OPTICAL ? 0.15 : 0.05} 
                blending={THREE.AdditiveBlending} 
                side={THREE.BackSide} 
             />
        </mesh>
    </group>
  );
};

const SantaMarker = ({ position, viewMode }: { position: [number, number], viewMode: ViewMode }) => {
    const vector = useMemo(() => latLonToVector3(position[0], position[1], 2.55), [position]);
    const groupRef = useRef<THREE.Group>(null);
    const wave1Ref = useRef<THREE.Mesh>(null);
    const wave2Ref = useRef<THREE.Mesh>(null);
    const wave3Ref = useRef<THREE.Mesh>(null);
    const coreRef = useRef<THREE.Mesh>(null);
    
    // Rotate marker with the Earth so it stays on the correct country
    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
        }
        
        // Pulsing core
        if(coreRef.current) {
            const pulse = 1 + Math.sin(clock.getElapsedTime() * 3) * 0.3;
            coreRef.current.scale.setScalar(pulse);
        }
        
        // Expanding waves with fade
        const waveSpeed = 1.5;
        const t1 = (clock.getElapsedTime() * waveSpeed) % 2;
        const t2 = ((clock.getElapsedTime() * waveSpeed) + 0.66) % 2;
        const t3 = ((clock.getElapsedTime() * waveSpeed) + 1.33) % 2;
        
        if(wave1Ref.current) {
            const scale = 1 + t1 * 3;
            wave1Ref.current.scale.setScalar(scale);
            (wave1Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t1/2);
        }
        if(wave2Ref.current) {
            const scale = 1 + t2 * 3;
            wave2Ref.current.scale.setScalar(scale);
            (wave2Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t2/2);
        }
        if(wave3Ref.current) {
            const scale = 1 + t3 * 3;
            wave3Ref.current.scale.setScalar(scale);
            (wave3Ref.current.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t3/2);
        }
    });

    const markerColor = viewMode === ViewMode.NIGHT_VISION ? "#ffff00" : "#ff0000";
    const glowColor = viewMode === ViewMode.NIGHT_VISION ? "#ffaa00" : (viewMode === ViewMode.THERMAL ? "#ff8800" : "#ff0000");

    return (
        <group ref={groupRef}>
             {/* Core Marker with glow */}
             <mesh ref={coreRef} position={vector}>
                <sphereGeometry args={[0.05, 16, 16]} />
                <meshBasicMaterial color={markerColor} toneMapped={false} />
            </mesh>
            
            {/* Inner Glow Halo */}
            <mesh position={vector}>
                <sphereGeometry args={[0.08, 16, 16]} />
                <meshBasicMaterial color={glowColor} transparent opacity={0.4} blending={THREE.AdditiveBlending} />
            </mesh>
            
            {/* Ping Wave 1 */}
            <mesh ref={wave1Ref} position={vector} rotation={[Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0.06, 0.09, 32]} />
                 <meshBasicMaterial color={markerColor} transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            
            {/* Ping Wave 2 */}
            <mesh ref={wave2Ref} position={vector} rotation={[Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0.06, 0.09, 32]} />
                 <meshBasicMaterial color={markerColor} transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            
            {/* Ping Wave 3 */}
            <mesh ref={wave3Ref} position={vector} rotation={[Math.PI/2, 0, 0]}>
                 <ringGeometry args={[0.06, 0.09, 32]} />
                 <meshBasicMaterial color={markerColor} transparent opacity={0.8} side={THREE.DoubleSide} blending={THREE.AdditiveBlending} />
            </mesh>
            
            {/* Vertical beacon beam */}
            <mesh position={vector}>
                <cylinderGeometry args={[0.01, 0.01, 0.5, 8]} />
                <meshBasicMaterial color={markerColor} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
            </mesh>
        </group>
    )
}

const VisitedMarkers = ({ locations, viewMode }: { locations: [number, number][], viewMode: ViewMode }) => {
    const groupRef = useRef<THREE.Group>(null);
    const markersRef = useRef<THREE.Mesh[]>([]);

    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
        }
        
        // Animate each marker with offset pulsing
        markersRef.current.forEach((marker, i) => {
            if(marker) {
                const offset = i * 0.5;
                const pulse = 1 + Math.sin(clock.getElapsedTime() * 2 + offset) * 0.2;
                marker.scale.setScalar(pulse);
            }
        });
    });
    
    // Visited pins are subtle
    const color = viewMode === ViewMode.NIGHT_VISION ? "#ffcc00" : (viewMode === ViewMode.THERMAL ? "#ffaa00" : "#00ffff");
    const glowColor = viewMode === ViewMode.NIGHT_VISION ? "#ffaa00" : (viewMode === ViewMode.THERMAL ? "#ff6600" : "#006666");

    return (
        <group ref={groupRef}>
            {locations.map((loc, i) => {
                 const vector = latLonToVector3(loc[0], loc[1], 2.505);
                 return (
                    <group key={i}>
                        {/* Main marker */}
                        <mesh position={vector} ref={(el) => { if(el) markersRef.current[i] = el; }}>
                            <sphereGeometry args={[0.02, 12, 12]} />
                            <meshBasicMaterial color={color} transparent opacity={0.9} />
                        </mesh>
                        {/* Glow halo */}
                        <mesh position={vector}>
                            <sphereGeometry args={[0.03, 12, 12]} />
                            <meshBasicMaterial color={glowColor} transparent opacity={0.3} blending={THREE.AdditiveBlending} />
                        </mesh>
                    </group>
                 )
            })}
        </group>
    )
}

const PlannedRoute = ({ route, viewMode }: { route: [number, number][], viewMode: ViewMode }) => {
    const groupRef = useRef<THREE.Group>(null);
    
    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
        }
    });

    const geometry = useMemo(() => {
        if (route.length < 2) return null;

        // Convert coordinates to vectors
        const keyPoints = route.map(loc => latLonToVector3(loc[0], loc[1], 2.53));
        
        // Densify points for smooth curves
        const densePoints: THREE.Vector3[] = [];
        
        for (let i = 0; i < keyPoints.length - 1; i++) {
            const start = keyPoints[i];
            const end = keyPoints[i+1];
            
            const angle = start.angleTo(end);
            const steps = Math.ceil(angle / 0.05);
            
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                const v = start.clone().lerp(end, t).normalize().multiplyScalar(2.53);
                densePoints.push(v);
            }
        }
        densePoints.push(keyPoints[keyPoints.length - 1]);
        
        return new THREE.BufferGeometry().setFromPoints(densePoints);

    }, [route]);

    if (!geometry) return null;

    const lineColor = viewMode === ViewMode.NIGHT_VISION ? "#ffaa00" : (viewMode === ViewMode.THERMAL ? "#ff8800" : "#00aaaa");
    const glowColor = viewMode === ViewMode.NIGHT_VISION ? "#ffff00" : (viewMode === ViewMode.THERMAL ? "#ffaa44" : "#00ffff");

    return (
        <group ref={groupRef}>
            {/* Main planned route line - more visible */}
            <threeLine geometry={geometry}>
                <lineBasicMaterial color={lineColor} opacity={0.6} transparent linewidth={2} />
            </threeLine>
            
            {/* Glow overlay for better visibility */}
            <threeLine geometry={geometry}>
                <lineBasicMaterial color={glowColor} opacity={0.25} transparent linewidth={3} blending={THREE.AdditiveBlending} />
            </threeLine>
        </group>
    )
}

const Trajectory = ({ locations, currentPos, viewMode }: { locations: [number, number][], currentPos: [number, number], viewMode: ViewMode }) => {
    const groupRef = useRef<THREE.Group>(null);
    const particlesRef = useRef<THREE.Points>(null);
    
    useFrame(({ clock }) => {
        if(groupRef.current) {
            groupRef.current.rotation.y = clock.getElapsedTime() * 0.02;
        }
        
        // Animate flowing particles along the path
        if(particlesRef.current && particlesRef.current.geometry.attributes.position) {
            const positions = particlesRef.current.geometry.attributes.position.array as Float32Array;
            const count = positions.length / 3;
            
            for(let i = 0; i < count; i++) {
                const offset = (i / count + clock.getElapsedTime() * 0.1) % 1;
                // Update opacity based on flow position
                if(particlesRef.current.geometry.attributes.alpha) {
                    const alphas = particlesRef.current.geometry.attributes.alpha.array as Float32Array;
                    alphas[i] = Math.sin(offset * Math.PI) * 0.8;
                }
            }
            
            if(particlesRef.current.geometry.attributes.alpha) {
                particlesRef.current.geometry.attributes.alpha.needsUpdate = true;
            }
        }
    });

    const { geometry: lineGeometry, particleGeometry } = useMemo(() => {
        // Use visited locations as the complete path (don't add currentPos as it's already in visited)
        const fullPathRaw = locations.length > 0 ? locations : [currentPos];
        if (fullPathRaw.length < 2) return { geometry: null, particleGeometry: null };

        // Convert key coordinates to Vectors
        const keyPoints = fullPathRaw.map(loc => latLonToVector3(loc[0], loc[1], 2.52));
        
        // Densify points using Great Circle Interpolation (Slerp on Sphere)
        const densePoints: THREE.Vector3[] = [];
        
        for (let i = 0; i < keyPoints.length - 1; i++) {
            const start = keyPoints[i];
            const end = keyPoints[i+1];
            
            // Calculate angle between vectors to determine steps
            const angle = start.angleTo(end);
            const steps = Math.ceil(angle / 0.05); // Approx step every 0.05 radians for smoothness
            
            for (let s = 0; s < steps; s++) {
                const t = s / steps;
                // Spherical Interpolation: lerp -> normalize -> scale
                const v = start.clone().lerp(end, t).normalize().multiplyScalar(2.52);
                densePoints.push(v);
            }
        }
        // Add final point
        densePoints.push(keyPoints[keyPoints.length - 1]);
        
        const lineGeo = new THREE.BufferGeometry().setFromPoints(densePoints);
        
        // Create particle geometry - sample points along the path
        const particleCount = Math.min(densePoints.length, 100);
        const particlePositions = new Float32Array(particleCount * 3);
        const particleAlphas = new Float32Array(particleCount);
        
        for(let i = 0; i < particleCount; i++) {
            const idx = Math.floor((i / particleCount) * densePoints.length);
            const point = densePoints[idx];
            particlePositions[i * 3] = point.x;
            particlePositions[i * 3 + 1] = point.y;
            particlePositions[i * 3 + 2] = point.z;
            particleAlphas[i] = 0.8;
        }
        
        const particleGeo = new THREE.BufferGeometry();
        particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
        particleGeo.setAttribute('alpha', new THREE.BufferAttribute(particleAlphas, 1));
        
        return { geometry: lineGeo, particleGeometry: particleGeo };

    }, [locations, currentPos]);

    if (!lineGeometry) return null;

    const lineColor = viewMode === ViewMode.NIGHT_VISION ? "#ffcc00" : (viewMode === ViewMode.THERMAL ? "#ff6600" : "#00ffff");
    const glowColor = viewMode === ViewMode.NIGHT_VISION ? "#ffff00" : (viewMode === ViewMode.THERMAL ? "#ff8800" : "#00ccff");
    const particleColor = viewMode === ViewMode.NIGHT_VISION ? "#ffff00" : (viewMode === ViewMode.THERMAL ? "#ffaa00" : "#ffffff");

    return (
        <group ref={groupRef}>
            {/* Main trajectory line */}
            <threeLine geometry={lineGeometry}>
                <lineBasicMaterial color={lineColor} opacity={0.7} transparent linewidth={2} />
            </threeLine>
            
            {/* Glowing line overlay */}
            <threeLine geometry={lineGeometry}>
                <lineBasicMaterial color={glowColor} opacity={0.3} transparent linewidth={3} blending={THREE.AdditiveBlending} />
            </threeLine>
            
            {/* Animated particles flowing along path */}
            {particleGeometry && (
                <points ref={particlesRef} geometry={particleGeometry}>
                    <pointsMaterial 
                        color={particleColor} 
                        size={0.04} 
                        transparent 
                        opacity={0.8}
                        blending={THREE.AdditiveBlending}
                        sizeAttenuation={true}
                    />
                </points>
            )}
        </group>
    )
}

const UTCTimeDisplay = ({ viewMode }: { viewMode: ViewMode }) => {
    const [time, setTime] = useState(new Date());
    
    useEffect(() => {
        const timer = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Dynamic theme colors based on view mode
    const themeColor = viewMode === ViewMode.THERMAL ? '#ff6600' : (viewMode === ViewMode.NIGHT_VISION ? '#00ff00' : '#00ffff');
    const themeDark = viewMode === ViewMode.THERMAL ? '#cc4400' : (viewMode === ViewMode.NIGHT_VISION ? '#00aa00' : '#0099aa');
    const themeLight = viewMode === ViewMode.THERMAL ? '#ff8844' : (viewMode === ViewMode.NIGHT_VISION ? '#44ff44' : '#44ffff');

    // Approximate Subsolar Point Calculation
    const utcHours = time.getUTCHours();
    const utcMinutes = time.getUTCMinutes();
    const decimalHours = utcHours + (utcMinutes / 60);
    // 12:00 UTC = 0 deg Longitude. Earth rotates 15 deg/hr.
    // At 12:00, (12-12)*15 = 0.
    // At 18:00, (18-12)*15 = 90W (-90).
    const sunLong = -((decimalHours - 12) * 15);
    
    // Solar Declination approx
    const dayOfYear = Math.floor((time.getTime() - new Date(time.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    const declination = -23.44 * Math.cos((360/365) * (dayOfYear + 10) * (Math.PI/180));

    return (
        <div className="hidden md:block absolute bottom-6 right-80 p-3 bg-black/60 border backdrop-blur-md font-mono text-xs z-10 pointer-events-none min-w-[200px]" style={{borderColor: themeColor + '30', color: themeLight}}>
            <div className="text-[10px] mb-1 uppercase tracking-widest border-b pb-1" style={{color: themeDark, borderColor: themeDark + '50'}}>Universal Time (Z)</div>
            <div className="text-2xl font-bold tracking-widest text-white tabular-nums">
                {time.getUTCHours().toString().padStart(2, '0')}:
                {time.getUTCMinutes().toString().padStart(2, '0')}:
                {time.getUTCSeconds().toString().padStart(2, '0')} 
                <span className="text-sm ml-1" style={{color: themeColor}}>Z</span>
            </div>
            <div className="mt-2 flex flex-col gap-1 text-[9px]" style={{color: themeLight}}>
                <div className="flex justify-between">
                   <span>SOLAR LONG:</span>
                   <span className="text-white">{sunLong.toFixed(2)}°</span>
                </div>
                 <div className="flex justify-between">
                   <span>SOLAR DECL:</span>
                   <span className="text-white">{declination.toFixed(2)}°</span>
                </div>
            </div>
             {/* Decorative Corner */}
             <div className="absolute top-0 right-0 w-2 h-2 border-t border-r" style={{borderColor: themeColor}}></div>
             <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l" style={{borderColor: themeColor}}></div>
        </div>
    )
}

const GlobeMap = ({ santaPosition, visitedLocations, plannedRoute, viewMode, isActive = true }: { santaPosition: [number, number], visitedLocations: [number, number][], plannedRoute: [number, number][], viewMode: ViewMode, isActive?: boolean }) => {
  return (
    <div className="w-full h-full bg-[#000510] relative">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 7.5]} fov={40} />
        
        <ambientLight intensity={0.1} /> 
        
        <Suspense fallback={null}>
            <Earth viewMode={viewMode} />
            {isActive && <PlannedRoute route={plannedRoute} viewMode={viewMode} />}
            {isActive && <Trajectory locations={visitedLocations} currentPos={santaPosition} viewMode={viewMode} />}
            {isActive && <VisitedMarkers locations={visitedLocations} viewMode={viewMode} />}
            {isActive && <SantaMarker position={santaPosition} viewMode={viewMode} />}
            <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.2} />
        </Suspense>

        <OrbitControls 
            enablePan={false} 
            enableZoom={true} 
            minDistance={4} 
            maxDistance={12} 
            rotateSpeed={0.5}
            autoRotate={false}
        />
      </Canvas>
      
      {/* HUD Layers */}
      <UTCTimeDisplay viewMode={viewMode} />
    </div>
  );
};

export default GlobeMap;
