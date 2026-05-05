import { motion } from 'framer-motion'
import { Cpu, Zap, Activity } from 'lucide-react'

export const SchematicSection = () => {
  return (
    <section className="min-h-screen w-full py-40 px-6 relative overflow-hidden bg-[#05070a]">
      {/* Background Grid */}
      <div className="absolute inset-0 opacity-10" 
           style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(0,240,255,0.2) 1px, transparent 0)', backgroundSize: '40px 40px' }} 
      />

      <div className="max-w-7xl mx-auto relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="text-brand-cyan text-sm font-bold tracking-[0.4em] mb-4">SYSTEM ARCHITECTURE</div>
            <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
              THE ELECTRICAL <span className="text-glow text-white">HEART</span>
            </h2>
            <p className="text-white/50 text-lg leading-relaxed mb-12 max-w-xl">
              Every trace and connection in the SOS Dock is optimized for reliability in 
              extreme conditions. Our schematic integrates multi-module synchronization 
              with advanced power management.
            </p>

            <div className="space-y-6">
              {[
                { icon: <Cpu size={20} />, title: "Logic Flow", desc: "Interrupt-driven SOS detection for zero-lag response." },
                { icon: <Zap size={20} />, title: "Power Bus", desc: "Regulated 5V/3.3V rails with high-frequency decoupling." },
                { icon: <Activity size={20} />, title: "Data Integrity", desc: "Shielded UART and SPI lines to minimize EMI." }
              ].map((item, i) => (
                <div key={i} className="flex gap-4 items-start p-6 glass rounded-2xl border-white/5">
                  <div className="text-brand-cyan">{item.icon}</div>
                  <div>
                    <div className="font-bold mb-1">{item.title}</div>
                    <div className="text-sm text-white/40">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9, rotate: 2 }}
            whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1 }}
            className="relative group"
          >
            <div className="absolute inset-0 bg-brand-cyan/20 blur-[120px] rounded-full scale-75 group-hover:scale-100 transition-transform duration-1000" />
            <div className="glass p-4 rounded-[2rem] border-brand-cyan/30 overflow-hidden">
              <img 
                src="/assets/product/Untitled-2026-03-14-2234.png" 
                alt="SOS DOCK Circuit Diagram" 
                className="w-full h-auto rounded-xl grayscale hover:grayscale-0 transition-all duration-700 brightness-110 contrast-125"
              />
            </div>
            
            {/* Floating Label */}
            <div className="absolute -bottom-6 -right-6 glass px-6 py-4 rounded-2xl border-brand-orange/30 animate-float">
              <div className="text-[10px] font-bold text-brand-orange tracking-widest mb-1 uppercase">Official Schematic</div>
              <div className="text-xs font-mono text-white/60">REV 2.4 | 2026-03-14</div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
