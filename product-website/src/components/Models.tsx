import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Float, MeshDistortMaterial, useScroll } from '@react-three/drei'
import * as THREE from 'three'

export const ArduinoModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[2, 0.1, 3]} />
          <meshStandardMaterial color="#005a9c" transparent opacity={opacity} />
        </mesh>
        {/* USB Port */}
        <mesh position={[0, 0.15, 1.4]}>
          <boxGeometry args={[0.6, 0.2, 0.4]} />
          <meshStandardMaterial color="#ccc" metalness={1} transparent opacity={opacity} />
        </mesh>
        {/* Chips */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1, 0.1, 1]} />
          <meshStandardMaterial color="#111" transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const NRFModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={3} rotationIntensity={1} floatIntensity={1}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[1, 0.05, 1.8]} />
          <meshStandardMaterial color="#1a1a1a" transparent opacity={opacity} />
        </mesh>
        {/* Antenna trace */}
        <mesh position={[0, 0.05, -0.4]}>
          <boxGeometry args={[0.8, 0.01, 0.8]} />
          <meshStandardMaterial color="#FF6B00" emissive="#FF6B00" emissiveIntensity={0.5} transparent opacity={opacity} />
        </mesh>
        {/* Chips */}
        <mesh position={[0, 0.1, 0.4]}>
          <boxGeometry args={[0.4, 0.1, 0.4]} />
          <meshStandardMaterial color="#222" transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const A9GModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2.5} rotationIntensity={0.8} floatIntensity={0.8}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[1.5, 0.1, 1.5]} />
          <meshStandardMaterial color="#222" transparent opacity={opacity} />
        </mesh>
        {/* Metal shield */}
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[1.2, 0.2, 1.2]} />
          <meshStandardMaterial color="#888" metalness={0.9} roughness={0.1} transparent opacity={opacity} />
        </mesh>
        {/* GPS Patch Antenna */}
        <mesh position={[0, 0.25, -0.2]}>
          <boxGeometry args={[0.5, 0.1, 0.5]} />
          <meshStandardMaterial color="#daa520" metalness={0.5} transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const BatteryModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={1.5} rotationIntensity={0.3} floatIntensity={0.3}>
      <group position={position} rotation={[0, 0, Math.PI / 2]}>
        <mesh>
          <cylinderGeometry args={[0.3, 0.3, 1.5, 32]} />
          <meshStandardMaterial color="#9370DB" transparent opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
          <meshStandardMaterial color="#ccc" metalness={1} transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const RegulatorModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.8, 0.1, 0.8]} />
          <meshStandardMaterial color="#006400" transparent opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.1, 0]}>
          <boxGeometry args={[0.4, 0.2, 0.4]} />
          <meshStandardMaterial color="#111" transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const ButtonModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={5} rotationIntensity={2} floatIntensity={1}>
      <group position={position}>
        <mesh>
          <boxGeometry args={[0.5, 0.2, 0.5]} />
          <meshStandardMaterial color="#ccc" metalness={1} transparent opacity={opacity} />
        </mesh>
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 0.1, 32]} />
          <meshStandardMaterial color="#111" transparent opacity={opacity} />
        </mesh>
      </group>
    </Float>
  )
}

export const HardwareAssembly = () => {
  const groupRef = useRef<THREE.Group>(null!)
  const scroll = useScroll()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const offset = scroll.offset // 0 to 1
    
    // Rotation logic
    groupRef.current.rotation.y = Math.sin(t / 4) / 4 + (offset * Math.PI * 0.5)
    
    // Vertical movement
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, (offset * -2), 0.1)
    
    // Horizontal shifting during breakdown
    const breakdownFactor = THREE.MathUtils.smoothstep(offset, 0.35, 0.5) - THREE.MathUtils.smoothstep(offset, 0.75, 0.9)
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, (breakdownFactor * -2), 0.1)

    // Scale down slightly as we scroll to see everything
    const s = 1 - (offset * 0.2)
    groupRef.current.scale.set(s, s, s)
  })

  // We want components to "explode" apart during the breakdown section
  return (
    <group ref={groupRef}>
      <ArduinoModel position={[0, 0, 0]} />
      
      <ScrollSection offset={0.42} target={[2.5, 1.5, 0]}>
        <NRFModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.5} target={[-2.5, 1.5, -1]}>
        <A9GModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.58} target={[0, -1.5, 1]}>
        <RegulatorModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.66} target={[0, -3, 0]}>
        <BatteryModel position={[0, 0, 0]} />
      </ScrollSection>

      <ScrollSection offset={0.74} target={[2, -1, 1.5]}>
        <ButtonModel position={[0, 0, 0]} />
      </ScrollSection>
      
      {/* Circuit lines */}
      <group>
        <mesh position={[0, 0, 0]} rotation={[0, 0, 0]}>
          <sphereGeometry args={[0.05, 16, 16]} />
          <meshStandardMaterial color="#00F0FF" emissive="#00F0FF" emissiveIntensity={5} />
        </mesh>
      </group>
    </group>
  )
}

const ScrollSection = ({ children, offset, target }: { children: React.ReactNode, offset: number, target: [number, number, number] }) => {
  const groupRef = useRef<THREE.Group>(null!)
  const scroll = useScroll()
  
  useFrame(() => {
    const scrollOffset = scroll.offset
    // If we are past the 'offset' point, move towards 'target'
    // This creates a sequential 'explosion' effect
    const factor = Math.max(0, (scrollOffset - (offset - 0.1)) * 10)
    const t = THREE.MathUtils.clamp(factor, 0, 1)
    
    groupRef.current.position.x = THREE.MathUtils.lerp(0, target[0], t)
    groupRef.current.position.y = THREE.MathUtils.lerp(0, target[1], t)
    groupRef.current.position.z = THREE.MathUtils.lerp(0, target[2], t)
    
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.8, 1, t))
  })
  
  return <group ref={groupRef}>{children}</group>
}
