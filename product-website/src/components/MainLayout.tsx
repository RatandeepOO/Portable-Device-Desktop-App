import { HeroSection } from './sections/HeroSection'
import { OverviewSection } from './sections/OverviewSection'
import { ExplodedViewSection } from './sections/ExplodedViewSection'
import { WorkflowSection } from './sections/WorkflowSection'
import { AnimationsSection } from './sections/AnimationsSection'
import { SchematicSection } from './sections/SchematicSection'
import { AnalysisSection } from './sections/AnalysisSection'
import { EvolutionSection } from './sections/EvolutionSection'
import { TeamSection } from './sections/TeamSection'

export const MainLayout = () => {
  return (
    <div className="w-full relative">
      <HeroSection />
      <OverviewSection />
      <ExplodedViewSection />
      <AnalysisSection />
      <AnimationsSection />
      <EvolutionSection />
      <SchematicSection />
      <WorkflowSection />
      <TeamSection />
      
      <footer className="w-full py-20 flex justify-center text-white/20 text-sm border-t border-white/5">
        © 2026 SOS DOCK. ALL RIGHTS RESERVED.
      </footer>
    </div>
  )
}
