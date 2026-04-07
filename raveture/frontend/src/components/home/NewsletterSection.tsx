import { useState } from 'react'
import { GlowInput, GlowButton } from '@/components/design'

export function NewsletterSection() {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement newsletter signup API call
    console.log('Newsletter signup:', email)
    setEmail('')
  }

  return (
    <section className="grid grid-cols-1 md:grid-cols-2">
      {/* Left Content */}
      <div className="p-12 md:p-20 border-r border-border-grey flex flex-col justify-center">
        <h2 className="text-4xl font-black mb-4 uppercase tracking-tighter">
          JOIN THE <br />
          RESISTANCE
        </h2>
        <p className="text-text-muted normal-case max-w-sm">
          Receive location data and entry codes for upcoming clandestine operations.
        </p>
      </div>

      {/* Right Form */}
      <div className="p-12 md:p-20 flex flex-col justify-center">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <GlowInput
            type="email"
            placeholder="EMAIL_ADDRESS"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <GlowButton type="submit" variant="primary" size="lg" className="w-full">
            SUBMIT_CREDENTIALS
          </GlowButton>
        </form>
      </div>
    </section>
  )
}
