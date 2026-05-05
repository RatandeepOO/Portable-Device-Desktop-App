import { motion } from 'framer-motion'
import { Github, Linkedin } from 'lucide-react'

export const TeamSection = () => {
  const team = [
    { name: "Pinky", role: "System Architect & Lead", id: "23009122007", img: "/assets/team/pinky.png" },
    { name: "Saloni Das", role: "Desktop Frontend Architect", id: "23009120025", img: "/assets/team/saloni.jpeg" },
    { name: "Jyoti Rani", role: "Mobile Systems Engineer", id: "230091220011", img: "/assets/team/jyoti.jpeg" },
    { name: "Ratandeep Arora", role: "Backend & Real-time Engineer", id: "24009052002", img: "/assets/team/ratan.jpg" },
    { name: "Payal Negi", role: "Embedded & Toolchain Specialist", id: "23009120028", img: "/assets/team/payal.jpeg" },
    { name: "Vinita", role: "Release Architect", id: "23009120019", img: "/assets/team/viniti.jpeg" },
    { name: "Kavita", role: "Quality & Reliability Engineer", id: "23009250024", img: "/assets/team/kavita.png" },
    { name: "Akansha Sharma", role: "UX/UI Design Engineer", id: "23009050005", img: "/assets/team/akansha.jpeg" },
    { name: "Ashish Kumar", role: "IOT System Developer", id: "24009092004", img: "/assets/team/ashish.png" },
    { name: "Parul", role: "Embedded & Wireless Communication", id: "", img: "/assets/team/parul.jpeg" }
  ]

  return (
    <section className="min-h-screen w-screen py-32 px-6 flex flex-col items-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        className="text-center mb-20"
      >
        <h2 className="text-5xl font-bold mb-4 uppercase tracking-widest">THE VISIONARIES</h2>
        <p className="text-white/40 max-w-2xl mx-auto">
          A multi-disciplinary team dedicated to redefining safety through innovation and precision engineering.
        </p>
      </motion.div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-8 max-w-7xl w-full">
        {team.map((member, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.8 }}
            className="glass group relative overflow-hidden rounded-[2rem] flex flex-col items-start p-0 text-left border border-white/5 hover:border-brand-cyan/30 transition-all duration-700 bg-gradient-to-b from-white/5 to-transparent"
          >
            <div className="w-full h-64 relative overflow-hidden group-hover:h-56 transition-all duration-700 ease-in-out">
              <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent z-10" />
              <img 
                src={member.img} 
                alt={member.name} 
                className="w-full h-full object-cover group-hover:scale-110 transition-all duration-1000" 
              />
              <div className="absolute bottom-4 left-6 z-20">
                 <p className="text-brand-cyan text-[10px] font-bold tracking-[0.2em] uppercase mb-1">
                  {member.role.split(' ')[0]}
                </p>
              </div>
            </div>
            
            <div className="p-6 w-full">
              <h3 className="font-bold text-lg mb-1 tracking-tight text-white/90">{member.name}</h3>
              <p className="text-white/40 text-[10px] font-medium leading-relaxed mb-4 min-h-[3em]">
                {member.role}
              </p>
              
              <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                {member.id ? (
                  <span className="text-[9px] font-mono text-white/20">#{member.id}</span>
                ) : (
                  <span className="text-[9px] font-mono text-white/20">#CORE-TEAM</span>
                )}
                <div className="flex gap-3">
                  <Linkedin size={14} className="text-white/20 hover:text-brand-cyan transition-colors cursor-pointer" />
                  <Github size={14} className="text-white/20 hover:text-white transition-colors cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Hover Accent */}
            <div className="absolute top-0 left-0 w-full h-1 bg-brand-cyan scale-x-0 group-hover:scale-x-100 transition-transform duration-700 origin-left" />
          </motion.div>
        ))}
      </div>
    </section>
  )
}
