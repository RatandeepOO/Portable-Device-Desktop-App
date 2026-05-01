import { Canvas } from '@react-three/fiber'
import { Environment, ScrollControls, Scroll } from '@react-three/drei'
import { HardwareAssembly } from './Models'
import { Overlay } from './Overlay'

export const Scene = () => {
  return (
    <div className="fixed inset-0 z-0 bg-[#010204]">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 35 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00F0FF" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#FF6B00" />
        
        <ScrollControls pages={10} damping={0.1}>
          <HardwareAssembly />
          
          <Scroll html>
            <Overlay />
          </Scroll>
        </ScrollControls>
        
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
