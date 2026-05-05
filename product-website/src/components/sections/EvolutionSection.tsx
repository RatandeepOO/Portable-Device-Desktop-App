import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'

const milestones = [
  {
    year: "CORE",
    title: "Arduino Nano",
    desc: "The brain of the system. Chosen for its compact footprint and reliable ATmega328P architecture.",
    img: "/assets/components/arduino_iso.png",
    color: "brand-cyan"
  },
  {
    year: "COMMS",
    title: "NRF24L01+ Array",
    desc: "Enabling long-range, low-power telemetry. The primary communication link for team synchronization.",
    img: "/assets/components/nrf_iso.png",
    color: "brand-cyan"
  },
  {
    year: "POSITION",
    title: "A9G GPRS/GPS",
    desc: "Global satellite tracking and cellular failover. Real-time geolocation even in remote environments.",
    img: "/assets/components/a9g_iso.png",
    color: "brand-cyan"
  },
  {
    year: "INTEGRATED",
    title: "SOS DOCK Final",
    desc: "The culmination of engineering. A ruggedized, unified solution for elite safety operations.",
    img: "/assets/product/iso_prod.png",
    color: "brand-cyan"
  }
]

export const EvolutionSection = () => {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"]
  })

  return (
    <section ref={containerRef} className="py-40 bg-[#020408] relative overflow-hidden">
      {/* Decorative Line */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-white/5 z-0" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="mb-24 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="text-brand-cyan text-sm font-bold tracking-[0.6em] mb-4 uppercase"
          >
            Engineering Timeline
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-bold"
          >
            HARDWARE <span className="text-brand-cyan">EVOLUTION</span>
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {milestones.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              viewport={{ once: true }}
              className="relative group"
            >
              {/* Connector Dot */}
              <div className="absolute -top-[124px] left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border-4 border-[#020408] bg-brand-cyan shadow-[0_0_15px_rgba(0,240,255,0.5)] z-20" />
              
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 hover:border-brand-cyan/50 transition-all duration-500 group-hover:bg-white/[0.07]">
                <div className="text-xs font-mono text-brand-cyan/60 mb-2">{item.year}</div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                
                <div className="relative aspect-square mb-6 overflow-hidden rounded-xl bg-black/40 flex items-center justify-center p-4">
                  <motion.img
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    src={item.img}
                    alt={item.title}
                    className="max-w-full max-h-full object-contain drop-shadow-2xl"
                  />
                </div>
                
                <p className="text-sm text-white/40 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Background Graphic Accents */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-brand-cyan/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-brand-cyan/5 rounded-full blur-[100px]" />
      </div>
    </section>
  )
}
