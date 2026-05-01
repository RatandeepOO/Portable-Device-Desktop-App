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
    <section className="min-h-screen w-screen flex items-center justify-end px-6 md:px-24">
      <div className="max-w-xl">
        <motion.h2 
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          className="text-5xl font-bold mb-12"
        >
          HARDWARE <br />
          <span className="text-brand-cyan">EVOLUTION</span>
        </motion.h2>
        
        <div className="space-y-8">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="glass p-8 rounded-3xl flex gap-6 items-start"
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
