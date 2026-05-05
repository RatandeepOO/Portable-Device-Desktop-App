import { motion } from 'framer-motion'
import { Shield, Radio, Zap } from 'lucide-react'

export const OverviewSection = () => {
  const features = [
    {
      icon: <Shield className="text-brand-cyan" />,
      title: "Reliable Protection",
      desc: "Designed for extreme environments with robust signal reliability."
    },
    {
      icon: <Radio className="text-brand-orange" />,
      title: "Long Range NRF",
      desc: "Proprietary antenna design for extended communication distance."
    },
    {
      icon: <Zap className="text-brand-cyan" />,
      title: "Low Latency",
      desc: "Milliseconds matter. Direct hardware-to-server optimization."
    }
  ]

  return (
    <section className="min-h-screen w-full flex flex-col md:flex-row items-center justify-center px-6 md:px-24 py-32 gap-20">
      <div className="flex-1 relative">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
          className="relative"
        >
          <div className="absolute inset-0 bg-brand-cyan/10 blur-[120px] rounded-full" />
          <img 
            src="/assets/product/F6961667-02.png" 
            alt="SOS DOCK Front View" 
            className="w-full max-w-lg mx-auto relative z-10 drop-shadow-[0_0_30px_rgba(0,240,255,0.15)]"
          />
        </motion.div>
      </div>

      <div className="flex-1 max-w-xl">
        <motion.h2 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="text-5xl font-bold mb-12"
        >
          HARDWARE <br />
          <span className="text-brand-cyan text-glow">EVOLUTION</span>
        </motion.h2>
        
        <div className="space-y-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-8 rounded-3xl flex gap-6 items-start hover:border-brand-cyan/40 transition-colors duration-500"
            >
              <div className="p-4 bg-white/5 rounded-2xl">
                {f.icon}
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">{f.title}</h3>
                <p className="text-white/50">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
