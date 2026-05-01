import { motion } from 'framer-motion'

export const ExplodedViewSection = () => {
  return (
    <section className="h-screen w-screen relative overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 flex items-center justify-center">
         <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            className="text-center"
         >
            <h2 className="text-8xl font-black text-white/5 select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                INTERNAL ARCHITECTURE
            </h2>
         </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-6xl w-full px-6 z-10">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="glass p-10 rounded-[40px] border-brand-cyan/20"
        >
          <div className="text-brand-cyan text-sm font-bold tracking-[0.2em] mb-4">CORE MODULE</div>
          <h3 className="text-4xl font-bold mb-6">Atmega328P Intelligence</h3>
          <p className="text-white/60 leading-relaxed">
            Optimized for low power consumption while maintaining peak performance for real-time 
            sensor data processing and multi-channel communication.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass p-10 rounded-[40px] border-brand-orange/20 self-end"
        >
          <div className="text-brand-orange text-sm font-bold tracking-[0.2em] mb-4">TRANSMITTER</div>
          <h3 className="text-4xl font-bold mb-6">NRF24L01+ Integration</h3>
          <p className="text-white/60 leading-relaxed">
            2.4GHz global open ISM band with a range of up to 1100 meters, ensuring consistent 
            connectivity in the most challenging terrain.
          </p>
        </motion.div>
      </div>
    </section>
  )
}
