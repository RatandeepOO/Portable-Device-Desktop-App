import { HeroSection } from './sections/HeroSection'
import { OverviewSection } from './sections/OverviewSection'
import { ExplodedViewSection } from './sections/ExplodedViewSection'
import { WorkflowSection } from './sections/WorkflowSection'
import { AnimationsSection } from './sections/AnimationsSection'
import { TeamSection } from './sections/TeamSection'

export const Overlay = () => {
  return (
    <div className="w-full">
      <HeroSection />
      <OverviewSection />
      <ExplodedViewSection />
      <WorkflowSection />
      <AnimationsSection />
      <TeamSection />
      
      <footer className="w-full py-20 flex justify-center text-white/20 text-sm border-t border-white/5">
        © 2026 SOS DOCK. ALL RIGHTS RESERVED.
      </footer>
    </div>
  )
}
