import { motion } from 'framer-motion'
import { Cpu, Radio, Battery, Zap, MapPin, MousePointer2 } from 'lucide-react'

export const AnimationsSection = () => {
  const components = [
    {
      title: "Arduino Nano",
      icon: <Cpu className="text-brand-cyan" />,
      role: "Central Processing Unit",
      details: "The brain of SOS Dock. Processes real-time sensor data and coordinates all communication modules.",
      connection: "Interfaces via SPI for NRF, UART for A9G, and GPIO for the SOS trigger button.",
      color: "cyan"
    },
    {
      title: "NRF24L01+ Module",
      icon: <Radio className="text-brand-orange" />,
      role: "Long-Range RF Transceiver",
      details: "Ensures low-latency communication with the ground station over long distances.",
      connection: "SPI Bus: SCK(D13), MISO(D12), MOSI(D11), CSN(D10), CE(D9).",
      color: "orange"
    },
    {
      title: "A9G GPRS/GPS",
      icon: <MapPin className="text-brand-cyan" />,
      role: "Location & Cellular Data",
      details: "Provides global positioning and cellular fallback for remote tracking.",
      connection: "UART Link: TX(D2), RX(D3). Powered via VBAT rail.",
      color: "cyan"
    },
    {
      title: "Voltage Regulator",
      icon: <Zap className="text-brand-orange" />,
      role: "Buck Converter",
      details: "Stabilizes the power supply to ensure reliable operation of sensitive electronics.",
      connection: "Input from Li-ion; Output to Arduino VIN and A9G VBAT.",
      color: "orange"
    },
    {
      title: "Li-ion Battery",
      icon: <Battery className="text-brand-cyan" />,
      role: "Power Source",
      details: "High-density 18650 cells providing long-lasting energy for emergency scenarios.",
      connection: "Primary power loop with integrated safety fuse and master switch.",
      color: "cyan"
    },
    {
      title: "Tactile Button",
      icon: <MousePointer2 className="text-brand-orange" />,
      role: "SOS Trigger",
      details: "Hardware-level interrupt for instant emergency broadcasting.",
      connection: "Connects D4 to GND with internal pull-up enabled.",
      color: "orange"
    }
  ]

  return (
    <section className="min-h-[400vh] w-screen px-6 relative py-40">
      <div className="sticky top-0 h-screen flex flex-col items-center justify-center pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter">
            HARDWARE <span className="text-brand-cyan">BREAKDOWN</span>
          </h2>
          <p className="text-white/40 mt-4 tracking-widest uppercase text-xs font-bold">
            Scroll to inspect the circuit architecture
          </p>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-y-[60vh]">
        {components.map((comp, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ margin: "-10%" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="glass p-10 rounded-[3rem] relative md:col-start-2 max-w-md w-full"
          >
            <div className={`absolute -top-6 -left-6 w-20 h-20 rounded-3xl glass flex items-center justify-center border-brand-${comp.color}/30`}>
              <div className="scale-150">{comp.icon}</div>
            </div>
            
            <div className={`text-brand-${comp.color} text-xs font-bold tracking-[0.3em] uppercase mb-2`}>
              {comp.role}
            </div>
            <h3 className="text-3xl font-bold mb-6">{comp.title}</h3>
            
            <div className="space-y-4">
              <p className="text-white/60 leading-relaxed text-sm">
                {comp.details}
              </p>
              <div className="pt-4 border-t border-white/5">
                <p className={`text-brand-${comp.color}/60 text-[10px] font-bold uppercase tracking-widest mb-1`}>
                  Circuit Connection
                </p>
                <p className="text-white/40 text-xs italic">
                  {comp.connection}
                </p>
              </div>
            </div>

            <div className={`absolute top-0 right-0 w-32 h-32 bg-brand-${comp.color}/5 rounded-full blur-3xl pointer-events-none`} />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
