import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { GlowCard } from '@/components/design'
import { features } from '@/data'
import { cn } from '@/utils'

gsap.registerPlugin(ScrollTrigger)

export function FeaturesSection() {
  const sectionRef = useRef<HTMLElement>(null)
  const cardsRef = useRef<HTMLDivElement[]>([])

  useGSAP(() => {
    cardsRef.current.forEach((card, index) => {
      if (!card) return

      gsap.fromTo(
        card,
        { opacity: 0, y: 40 },
        {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: card,
            start: 'top 85%',
            toggleActions: 'play none none reverse',
          },
          delay: index * 0.1,
        }
      )
    })
  }, [])

  return (
    <section
      ref={sectionRef}
      className="grid grid-cols-1 md:grid-cols-3 border-b border-border-grey"
    >
      {features.map((feature, index) => (
        <div
          key={feature.title}
          ref={(el) => {
            if (el) cardsRef.current[index] = el
          }}
        >
          <GlowCard
            className={cn(
              'p-8 h-full',
              'border-b md:border-b-0 md:border-r border-border-grey last:border-r-0',
              'flex flex-col gap-6'
            )}
          >
            {/* Icon */}
            <span className="material-symbols-outlined text-primary text-4xl">{feature.icon}</span>

            {/* Content */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold italic uppercase">{feature.title}</h2>
              <p className="text-text-muted text-sm normal-case leading-relaxed">{feature.description}</p>
            </div>
          </GlowCard>
        </div>
      ))}
    </section>
  )
}
