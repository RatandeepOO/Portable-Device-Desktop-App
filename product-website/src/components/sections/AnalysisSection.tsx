import { useState, useRef } from 'react'
import { motion, AnimatePresence, useScroll, useTransform, useMotionValueEvent } from 'framer-motion'

export const AnalysisSection = () => {
  const [activeIdx, setActiveIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const views = [
    {
      id: "front",
      title: "Front View",
      axis: "Primary Interface",
      desc: "Clean white tactical housing with the centralized SMA antenna connector and precision-milled structural frame.",
      img: "/assets/product/PRODUCT_FRONT.png",
      specs: ["High-Gain Antenna Mount", "White Tactile Finish", "Reinforced Front Panel"]
    },
    {
      id: "side2",
      title: "Tactical Control",
      axis: "Action Center",
      desc: "Side-mounted interactive cluster featuring the signature blue SOS trigger button and power management toggle.",
      img: "/assets/product/PRODUCT_SIDE2.png",
      specs: ["Tactile SOS Button", "Power Control Switch", "Precision Grip Texture"]
    },
    {
      id: "top",
      title: "Technical Top View",
      axis: "Aerial Layout",
      desc: "Top-down perspective showcasing the RF distribution layout and the secure chassis integration points.",
      img: "/assets/product/PRODUCT_TOP.png",
      specs: ["RF Output Port", "Chassis Assembly Screws", "Aero-Grade Structural Lid"]
    },
    {
      id: "iso",
      title: "Full Isometric Study",
      axis: "Complete System",
      desc: "Comprehensive 3D perspective of the SOS DOCK, demonstrating the ruggedized form factor and compact spatial design.",
      img: "/assets/product/iso_prod.png",
      specs: ["All-in-One Integration", "Ruggedized Perimeter", "Compact Footprint"]
    }
  ]

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"]
  })

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    // We map the 0-1 progress to indices 0, 1, 2, 3
    // We use a small threshold to make sure the last view stays at the end
    const rawIdx = Math.floor(latest * views.length)
    const newIdx = Math.min(rawIdx, views.length - 1)
    if (newIdx !== activeIdx) {
      setActiveIdx(newIdx)
    }
  })

  return (
    <div ref={containerRef} className="h-[400vh] relative">
      <section className="sticky top-0 min-h-screen w-full flex items-center justify-center bg-[#020408] overflow-hidden">
        {/* Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[1000px] bg-brand-cyan/5 rounded-full blur-[150px] pointer-events-none" />

        <div className="max-w-7xl mx-auto w-full px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Info Side */}
            <div className="lg:col-span-4 space-y-12">
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
              >
                <div className="text-brand-cyan text-sm font-bold tracking-[0.6em] mb-4 uppercase">Technical Study</div>
                <h2 className="text-5xl md:text-6xl font-bold mb-8">
                  AXIAL <span className="text-brand-cyan">VIEW</span>
                </h2>
              </motion.div>

              <div className="space-y-8 min-h-[300px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIdx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    className="space-y-6"
                  >
                    <div>
                      <h3 className="text-3xl font-bold mb-2">{views[activeIdx].title}</h3>
                      <p className="text-brand-cyan text-xs font-bold tracking-widest uppercase mb-4">{views[activeIdx].axis}</p>
                      <p className="text-white/50 text-lg leading-relaxed">{views[activeIdx].desc}</p>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {views[activeIdx].specs.map((spec, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm text-white/40">
                          <div className="w-1.5 h-1.5 rounded-full bg-brand-cyan/40" />
                          {spec}
                        </div>
                      ))}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Scroll Indicator */}
              <div className="flex items-center gap-4 pt-8">
                <div className="flex flex-col gap-2">
                  <div className="text-[10px] font-mono text-white/20 uppercase tracking-widest">Scroll to Rotate</div>
                  <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-brand-cyan"
                      style={{ scaleX: scrollYProgress }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Image Side */}
            <div className="lg:col-span-8 relative aspect-square lg:aspect-auto lg:h-[600px] flex items-center justify-center">
              {/* View Selector Dots (Now passive indicators) */}
              <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col gap-4 z-20">
                {views.map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full transition-all duration-500 ${activeIdx === i ? 'bg-brand-cyan h-8' : 'bg-white/10'}`}
                  />
                ))}
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeIdx}
                  initial={{ opacity: 0, scale: 0.8, rotate: 15 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  exit={{ opacity: 0, scale: 1.1, rotate: -15 }}
                  transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
                  className="relative w-full h-full flex items-center justify-center"
                >
                  <div className="absolute inset-0 bg-brand-cyan/5 blur-[120px] rounded-full scale-75" />
                  <img 
                    src={views[activeIdx].img} 
                    alt={views[activeIdx].title} 
                    className="max-w-[85%] max-h-[85%] object-contain drop-shadow-[0_0_100px_rgba(0,240,255,0.25)]"
                  />
                  
                  {/* Visual Accent Frame */}
                  <div className="absolute inset-0 border border-white/5 rounded-[4rem] pointer-events-none" />
                </motion.div>
              </AnimatePresence>

              {/* Bottom Counter */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-mono text-white/20 tracking-[0.5em] uppercase">
                PHASE 0{activeIdx + 1} / 0{views.length}
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
