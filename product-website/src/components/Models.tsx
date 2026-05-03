import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Float, useScroll, useTexture } from '@react-three/drei'
import * as THREE from 'three'

// Helper component for multi-angle images
const ComponentImage = ({ 
  isoUrl, 
  topUrl, 
  scale = 1, 
  position = [0, 0, 0], 
  rotation = [0, 0, 0], 
  opacity = 1 
}: { 
  isoUrl: string, 
  topUrl?: string, 
  scale?: number, 
  position?: [number, number, number], 
  rotation?: [number, number, number],
  opacity?: number 
}) => {
  const textureIso = useTexture(isoUrl)
  const textureTop = topUrl ? useTexture(topUrl) : textureIso
  const scroll = useScroll()
  const meshRef = useRef<THREE.Mesh>(null!)

  useFrame((state) => {
    if (!meshRef.current) return
    
    // Calculate which texture to show based on scroll/rotation
    // If we are deep in the scroll, maybe show top view
    const offset = scroll.offset
    const isTopView = offset > 0.6 // Transition to top view later in scroll
    
    meshRef.current.material.map = isTopView && topUrl ? textureTop : textureIso
    meshRef.current.material.needsUpdate = true
    
    // Subtle float animation
    const t = state.clock.getElapsedTime()
    meshRef.current.position.y = position[1] + Math.sin(t + position[0]) * 0.05
  })

  return (
    <mesh ref={meshRef} position={position} rotation={rotation} scale={scale}>
      <planeGeometry args={[2, 2]} />
      <meshStandardMaterial 
        transparent 
        opacity={opacity} 
        map={textureIso} 
        side={THREE.DoubleSide}
        alphaTest={0.1}
      />
    </mesh>
  )
}

export const ArduinoModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
      <ComponentImage 
        isoUrl="/assets/components/arduino_iso.png"
        topUrl="/assets/components/arduino_top.png"
        scale={2.5}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const NRFModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={3} rotationIntensity={0.3} floatIntensity={0.8}>
      <ComponentImage 
        isoUrl="/assets/components/nrf_iso.png"
        topUrl="/assets/components/nrf_top.png"
        scale={1.8}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const A9GModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2.5} rotationIntensity={0.2} floatIntensity={0.6}>
      <ComponentImage 
        isoUrl="/assets/components/a9g_iso.png"
        topUrl="/assets/components/a9g_top.png"
        scale={2.2}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const BatteryModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
      <ComponentImage 
        isoUrl="/assets/components/battery.png"
        scale={2.5}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const RegulatorModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.4}>
      <ComponentImage 
        isoUrl="/assets/components/regulator.png"
        scale={1.5}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const ButtonModel = ({ position, opacity = 1 }: { position: [number, number, number], opacity?: number }) => {
  return (
    <Float speed={4} rotationIntensity={0.4} floatIntensity={0.8}>
      <ComponentImage 
        isoUrl="/assets/components/button.png"
        scale={1.2}
        position={position}
        opacity={opacity}
      />
    </Float>
  )
}

export const HardwareAssembly = () => {
  const groupRef = useRef<THREE.Group>(null!)
  const scroll = useScroll()
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    const offset = scroll.offset // 0 to 1
    
    // Rotation logic - subtle sway instead of full rotation since these are planes
    groupRef.current.rotation.y = Math.sin(t / 4) / 8 + (offset * Math.PI * 0.1)
    
    // Vertical movement
    groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, (offset * -2.5), 0.1)
    
    // Horizontal shifting during breakdown
    const breakdownFactor = THREE.MathUtils.smoothstep(offset, 0.35, 0.5) - THREE.MathUtils.smoothstep(offset, 0.75, 0.9)
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, (breakdownFactor * -2), 0.1)

    // Scale logic
    const s = 1 - (offset * 0.1)
    groupRef.current.scale.set(s, s, s)
  })

  return (
    <group ref={groupRef}>
      <ArduinoModel position={[0, 0, 0]} />
      
      <ScrollSection offset={0.42} target={[2.8, 1.8, 0]}>
        <NRFModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.5} target={[-2.8, 1.8, -1]}>
        <A9GModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.58} target={[0, -1.8, 1]}>
        <RegulatorModel position={[0, 0, 0]} />
      </ScrollSection>
      
      <ScrollSection offset={0.66} target={[0, -3.5, 0]}>
        <BatteryModel position={[0, 0, 0]} />
      </ScrollSection>

      <ScrollSection offset={0.74} target={[2.5, -1.2, 1.5]}>
        <ButtonModel position={[0, 0, 0]} />
      </ScrollSection>
      
      {/* Dynamic Glow Points */}
      <group>
        <mesh position={[0, 0, 0.1]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color="#00F0FF" emissive="#00F0FF" emissiveIntensity={10} />
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
    const factor = Math.max(0, (scrollOffset - (offset - 0.1)) * 10)
    const t = THREE.MathUtils.clamp(factor, 0, 1)
    
    groupRef.current.position.x = THREE.MathUtils.lerp(0, target[0], t)
    groupRef.current.position.y = THREE.MathUtils.lerp(0, target[1], t)
    groupRef.current.position.z = THREE.MathUtils.lerp(0, target[2], t)
    
    groupRef.current.scale.setScalar(THREE.MathUtils.lerp(0.8, 1, t))
  })
  
  return <group ref={groupRef}>{children}</group>
}
