import { GlowCard } from '@/components/design'
import { platformModules } from '@/data'
import { cn } from '@/utils'

export function PlatformModulesSection() {
  return (
    <section className="border-b border-border-grey bg-graphite">
      {/* Section Header */}
      <div className="p-8 border-b border-border-grey">
        <h2 className="text-3xl font-bold italic tracking-tighter uppercase">PLATFORM_MODULES</h2>
      </div>

      {/* Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4">
        {platformModules.map((module) => (
          <GlowCard
            key={module.number}
            className={cn(
              'p-8',
              'border-b md:border-b-0 md:border-r border-border-grey last:border-r-0'
            )}
          >
            {/* Header */}
            <h3 className="font-bold text-primary mb-4 font-mono text-sm">
              {module.number} // {module.title}
            </h3>

            {/* Description */}
            <p className="text-sm normal-case text-text-secondary">{module.description}</p>
          </GlowCard>
        ))}
      </div>
    </section>
  )
}
