import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

export const HeroSection = () => {
  return (
    <section className="min-h-screen w-full flex flex-col items-center justify-center relative px-6 overflow-hidden pt-20">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-cyan/5 rounded-full blur-[120px] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center z-10"
      >
        <h1 className="text-6xl md:text-8xl font-bold tracking-tighter mb-6 uppercase">
          SOS <span className="text-brand-cyan">DOCK</span>
        </h1>
        <p className="text-lg md:text-xl text-white/40 max-w-xl mx-auto mb-12 font-medium tracking-widest uppercase">
          Precision Safety Technology. <br/>
          Redefined for the Modern Responder.
        </p>
        
        {/* Main Product Image */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 1, ease: "easeOut" }}
          className="relative group mb-12"
        >
          <div className="absolute inset-0 bg-brand-cyan/20 blur-[100px] rounded-full scale-50 group-hover:scale-75 transition-transform duration-1000" />
          <img 
            src="/assets/product/iso_prod.png" 
            alt="SOS DOCK Product View" 
            className="w-full max-w-2xl mx-auto relative z-10 drop-shadow-[0_0_50px_rgba(0,240,255,0.3)]"
          />
        </motion.div>

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
