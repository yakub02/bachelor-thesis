import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { cn } from '@/utils'
import { GlowButton } from '@/components/design'

const HERO_IMAGE_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuA7mlwhRbYfZCqHm6EHq9T09i92miqMemtUHV-m1tdyzXahjLAQE7SmbK2AMqDcEkXGF3ARkvQLR8f6kc5gTA5c5v2QHmV-H9n3qn5T0RSmNcEk-7EoZfHpEVQ23t5F3ExEy2A29WTTSQWYSQsFxmA-fGFqn77mM62pUBykLPT4qyG4GT3KcwVCgmK9grD-WDca9HKW5WmRTtuSd_aVwgBcaYAPpP2HjN7S2EYFVd4bxLzJ6kl2IefBBwzdxMVObT_vPA7mjZvJvZcK'

export function HeroSection() {
  const contentRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const elements = contentRef.current?.querySelectorAll('.animate-item')
    if (elements) {
      gsap.fromTo(
        elements,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: 'power3.out',
        }
      )
    }
  }, [])

  return (
    <section className="relative border-b border-border-grey">
      <div className="flex flex-col md:flex-row min-h-[600px]">
        {/* Left Content */}
        <div
          ref={contentRef}
          className="flex-1 p-8 md:p-16 flex flex-col justify-end gap-8 bg-graphite/30"
        >
          <div className="flex flex-col gap-4">
            <span className="animate-item text-primary text-sm font-bold font-mono uppercase">
              [ PROTOCOL V1.0 ]
            </span>
            <h1 className="animate-item text-5xl md:text-7xl font-bold leading-[0.9] tracking-tighter uppercase">
              THE UNDERGROUND <br />
              HAS A NEW HOME
            </h1>
            <p className="animate-item max-w-md text-gray-400 normal-case font-light text-lg">
              Decentralized ticketing and community infrastructure for the electronic avant-garde.
              Owned by the dancers.
            </p>
          </div>
          <div className="animate-item flex flex-wrap gap-4">
            <GlowButton variant="primary" size="lg">
              ACCESS PLATFORM
            </GlowButton>
            <GlowButton variant="outline" size="lg">
              VIEW MANIFESTO
            </GlowButton>
          </div>
        </div>

        {/* Right Image */}
        <div
          className={cn(
            'w-full md:w-1/3 min-h-[300px] md:min-h-0',
            'border-t md:border-t-0 md:border-l border-border-grey',
            'bg-cover bg-center',
            'grayscale contrast-125'
          )}
          style={{ backgroundImage: `url('${HERO_IMAGE_URL}')` }}
        />
      </div>
    </section>
  )
}
