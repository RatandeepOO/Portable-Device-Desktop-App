import { motion } from 'framer-motion'
import { Monitor, Smartphone, Server } from 'lucide-react'

export const WorkflowSection = () => {
  const steps = [
    { icon: <Smartphone />, title: "Mobile", color: "brand-cyan" },
    { icon: <Server />, title: "Backend", color: "brand-orange" },
    { icon: <Monitor />, title: "Command Center", color: "brand-cyan" }
  ]

  return (
    <section className="h-screen w-screen flex flex-col items-center justify-center px-6">
      <h2 className="text-4xl md:text-6xl font-bold mb-20 text-center">
        SEAMLESS <span className="text-brand-orange">INTEGRATION</span>
      </h2>
      
      <div className="flex flex-col md:flex-row items-center gap-8 md:gap-20">
        {steps.map((step, i) => (
          <div key={i} className="flex flex-col md:flex-row items-center gap-8">
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: i * 0.2 }}
              className={`w-32 h-32 rounded-full glass flex items-center justify-center border-${step.color}/30 text-${step.color}`}
            >
              <div className="scale-150">{step.icon}</div>
            </motion.div>
            
            {i < steps.length - 1 && (
              <motion.div 
                initial={{ width: 0, opacity: 0 }}
                whileInView={{ width: 100, opacity: 1 }}
                className="hidden md:block h-px bg-brand-orange"
              />
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        <p className="text-white/40 text-sm text-center">Real-time GPS tracking transmitted from the portable device.</p>
        <p className="text-white/40 text-sm text-center">Secure data processing and alert routing via SOS Dock Server.</p>
        <p className="text-white/40 text-sm text-center">Instant visualization and rescue coordination at the Command Center.</p>
      </div>
    </section>
  )
}
