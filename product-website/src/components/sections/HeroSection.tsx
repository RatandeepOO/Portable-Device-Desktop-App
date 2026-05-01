import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export const HeroSection = () => {
  return (
    <section className="h-screen w-screen flex flex-col items-center justify-center relative px-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10"
      >
        <h1 className="text-7xl md:text-9xl font-bold tracking-tighter mb-4 neon-cyan">
          SOS DOCK
        </h1>
        <p className="text-xl md:text-2xl text-white/60 max-w-2xl mx-auto mb-8 font-light tracking-wide">
          The next generation of portable safety technology. 
          Real-time telemetry meets immersive command center integration.
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-8 py-4 bg-brand-cyan text-brand-bg font-bold rounded-full flex items-center gap-2 hover:scale-105 transition-transform">
            EXPLORE DEVICE <ArrowRight size={20} />
          </button>
          <button className="px-8 py-4 glass text-white font-bold rounded-full hover:bg-white/10 transition-colors uppercase tracking-widest text-sm">
            DOCUMENTATION
          </button>
        </div>
      </motion.div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <div className="w-1 h-12 rounded-full border border-white/20 flex justify-center pt-2">
          <div className="w-1 h-3 bg-brand-cyan rounded-full" />
        </div>
      </div>
    </section>
  )
}
