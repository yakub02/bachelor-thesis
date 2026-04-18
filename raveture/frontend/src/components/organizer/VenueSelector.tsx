/**
 * VenueSelector Component
 *
 * Allows organizers to select an existing venue or create a new one inline.
 * Features:
 * - Dropdown with searchable venue list
 * - Inline "Create new venue" form
 * - City filter
 */

import { useState, useEffect } from 'react'
import { ravetureApi, type Venue } from '@/services/ravetureApi'
import { GlowInput, GlowButton, GlowCard } from '@/components/design'
import { cn } from '@/utils'

interface VenueSelectorProps {
  value: string | null
  onChange: (venueId: string | null, venue?: Venue) => void
  className?: string
}

interface NewVenueForm {
  name: string
  city: string
  address: string
  country: string
  capacity: string
  description: string
}

export function VenueSelector({ value, onChange, className }: VenueSelectorProps) {
  const [venues, setVenues] = useState<Venue[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [newVenue, setNewVenue] = useState<NewVenueForm>({
    name: '',
    city: '',
    address: '',
    country: 'CZ',
    capacity: '',
    description: '',
  })

  // Fetch venues on mount
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true)
        const response = await ravetureApi.getVenues()
        setVenues(response.venues)
      } catch (err) {
        setError('Failed to load venues')
      } finally {
        setLoading(false)
      }
    }

    fetchVenues()
  }, [])

  const handleCreateVenue = async () => {
    if (!newVenue.name.trim() || !newVenue.city.trim()) {
      setCreateError('Name and city are required')
      return
    }

    setCreating(true)
    setCreateError(null)

    try {
      const venue = await ravetureApi.createVenue({
        name: newVenue.name,
        city: newVenue.city,
        address: newVenue.address || undefined,
        country: newVenue.country,
        capacity: newVenue.capacity ? (parseInt(newVenue.capacity) || undefined) : undefined,
        description: newVenue.description || undefined,
      })

      // Add to list and select
      setVenues((prev) => [...prev, venue])
      onChange(venue.id, venue)

      // Reset form
      setNewVenue({
        name: '',
        city: '',
        address: '',
        country: 'CZ',
        capacity: '',
        description: '',
      })
      setShowCreateForm(false)
    } catch (err: unknown) {
      const error = err as { error?: string; message?: string }
      setCreateError(error.error || error.message || 'Failed to create venue')
    } finally {
      setCreating(false)
    }
  }

  const selectedVenue = venues.find((v) => v.id === value)

  return (
    <div className={cn('space-y-4', className)}>
      {/* Venue Dropdown */}
      <div>
        <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
          Venue
        </label>

        {loading ? (
          <div className="px-4 py-3 bg-bg-dark/50 border border-border-grey text-text-muted font-mono">
            Loading venues...
          </div>
        ) : error ? (
          <div className="px-4 py-3 bg-bg-dark/50 border border-red-500/50 text-red-400 font-mono text-sm">
            {error}
          </div>
        ) : (
          <select
            value={value || ''}
            onChange={(e) => {
              const venueId = e.target.value || null
              const venue = venues.find((v) => v.id === venueId)
              onChange(venueId, venue)
            }}
            className="w-full px-4 py-3 bg-bg-dark/50 border border-border-grey text-white font-mono transition-all duration-300 focus:outline-none focus:border-primary"
          >
            <option value="">Select a venue...</option>
            {venues.map((venue) => (
              <option key={venue.id} value={venue.id}>
                {venue.name} - {venue.city}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Selected Venue Preview */}
      {selectedVenue && (
        <div className="px-4 py-3 bg-graphite/50 border border-border-grey">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-primary"></div>
            <div>
              <span className="font-mono text-white">{selectedVenue.name}</span>
              <span className="text-text-muted ml-2">
                {selectedVenue.address || selectedVenue.city}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Create New Button */}
      {!showCreateForm && (
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="w-full py-3 border border-dashed border-border-grey text-text-muted hover:text-primary hover:border-primary transition-colors font-mono text-sm"
        >
          + Create New Venue
        </button>
      )}

      {/* Create New Venue Form */}
      {showCreateForm && (
        <GlowCard className="p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold uppercase tracking-tight flex items-center gap-2">
              <span className="text-primary">+</span>
              New Venue
            </h3>
            <button
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
              }}
              className="text-text-muted hover:text-white text-sm font-mono"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowInput
              label="Venue Name *"
              placeholder="e.g. Roxy Prague"
              value={newVenue.name}
              onChange={(e) =>
                setNewVenue((prev) => ({ ...prev, name: e.target.value }))
              }
            />

            <GlowInput
              label="City *"
              placeholder="e.g. Prague"
              value={newVenue.city}
              onChange={(e) =>
                setNewVenue((prev) => ({ ...prev, city: e.target.value }))
              }
            />
          </div>

          <GlowInput
            label="Address"
            placeholder="e.g. Dlouha 33, Praha 1"
            value={newVenue.address}
            onChange={(e) =>
              setNewVenue((prev) => ({ ...prev, address: e.target.value }))
            }
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlowInput
              label="Country"
              placeholder="CZ"
              value={newVenue.country}
              onChange={(e) =>
                setNewVenue((prev) => ({ ...prev, country: e.target.value }))
              }
            />

            <GlowInput
              label="Capacity"
              type="number"
              placeholder="e.g. 500"
              value={newVenue.capacity}
              onChange={(e) =>
                setNewVenue((prev) => ({ ...prev, capacity: e.target.value }))
              }
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-text-muted mb-2 tracking-wider">
              Description
            </label>
            <textarea
              placeholder="Brief description of the venue..."
              value={newVenue.description}
              onChange={(e) =>
                setNewVenue((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={3}
              className="w-full px-4 py-3 bg-bg-dark/50 border border-border-grey text-white placeholder-text-muted font-mono transition-all duration-300 focus:outline-none focus:border-primary resize-none"
            />
          </div>

          {createError && (
            <div className="p-3 border border-red-500/50 bg-red-500/10 text-red-400 text-sm font-mono">
              {createError}
            </div>
          )}

          <GlowButton
            type="button"
            onClick={handleCreateVenue}
            disabled={creating}
            className="w-full"
          >
            {creating ? 'Creating...' : 'Create Venue'}
          </GlowButton>
        </GlowCard>
      )}
    </div>
  )
}

export default VenueSelector
