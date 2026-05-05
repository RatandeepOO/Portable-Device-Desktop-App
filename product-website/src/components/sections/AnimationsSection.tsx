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
      color: "cyan",
      img: "/assets/components/arduino_iso.png"
    },
    {
      title: "NRF24L01+ Module",
      icon: <Radio className="text-brand-orange" />,
      role: "Long-Range RF Transceiver",
      details: "Ensures low-latency communication with the ground station over long distances.",
      connection: "SPI Bus: SCK(D13), MISO(D12), MOSI(D11), CSN(D10), CE(D9).",
      color: "orange",
      img: "/assets/components/nrf_iso.png"
    },
    {
      title: "A9G GPRS/GPS",
      icon: <MapPin className="text-brand-cyan" />,
      role: "Location & Cellular Data",
      details: "Provides global positioning and cellular fallback for remote tracking.",
      connection: "UART Link: TX(D2), RX(D3). Powered via VBAT rail.",
      color: "cyan",
      img: "/assets/components/a9g_iso.png"
    },
    {
      title: "Voltage Regulator",
      icon: <Zap className="text-brand-orange" />,
      role: "Buck Converter",
      details: "Stabilizes the power supply to ensure reliable operation of sensitive electronics.",
      connection: "Input from Li-ion; Output to Arduino VIN and A9G VBAT.",
      color: "orange",
      img: "/assets/components/REGULATOR_ISO.png"
    },
    {
      title: "Li-ion Battery",
      icon: <Battery className="text-brand-cyan" />,
      role: "Power Source",
      details: "High-density energy cells providing long-lasting power for emergency scenarios.",
      connection: "Primary power loop with integrated safety fuse and master switch.",
      color: "cyan",
      img: "/assets/components/battery.png"
    },
    {
      title: "SOS Trigger",
      icon: <MousePointer2 className="text-brand-orange" />,
      role: "Tactile Button",
      details: "Hardware-level interrupt for instant emergency broadcasting.",
      connection: "Connects D4 to GND with internal pull-up enabled.",
      color: "orange",
      img: "/assets/components/button.png"
    }
  ]

  return (
    <section className="min-h-screen w-full px-6 relative py-40 bg-[#020408]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="text-center mb-32"
        >
          <h2 className="text-5xl md:text-7xl font-bold uppercase tracking-tighter">
            HARDWARE <span className="text-brand-cyan">BREAKDOWN</span>
          </h2>
          <p className="text-white/40 mt-4 tracking-widest uppercase text-xs font-bold">
            Precision engineering for critical safety
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {components.map((comp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="glass p-8 rounded-[2.5rem] relative group hover:border-brand-cyan/30 transition-all duration-500 overflow-hidden"
            >
              <div className="h-48 flex items-center justify-center mb-8 relative">
                <div className={`absolute inset-0 bg-brand-${comp.color}/5 blur-3xl rounded-full scale-50 group-hover:scale-100 transition-transform duration-700`} />
                <img 
                  src={comp.img} 
                  alt={comp.title} 
                  className="h-full object-contain relative z-10 group-hover:scale-110 transition-transform duration-700"
                />
              </div>

              <div className={`text-brand-${comp.color} text-[10px] font-bold tracking-[0.3em] uppercase mb-2`}>
                {comp.role}
              </div>
              <h3 className="text-2xl font-bold mb-4">{comp.title}</h3>
              <p className="text-white/50 text-sm leading-relaxed mb-6">
                {comp.details}
              </p>
              
              <div className="pt-6 border-t border-white/5">
                <p className={`text-brand-${comp.color}/60 text-[9px] font-bold uppercase tracking-widest mb-1`}>
                  Circuit Connection
                </p>
                <p className="text-white/30 text-[10px] italic">
                  {comp.connection}
                </p>
              </div>

              {/* Icon Overlay */}
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                {comp.icon}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
