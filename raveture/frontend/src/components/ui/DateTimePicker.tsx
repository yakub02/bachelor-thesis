import * as React from 'react'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from './Calendar'
import { Popover, PopoverContent, PopoverTrigger } from './Popover'
import { cn } from '@/utils'

// Generate time options in 30-minute intervals
const generateTimeOptions = () => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0')
      const m = minute.toString().padStart(2, '0')
      options.push(`${h}:${m}`)
    }
  }
  return options
}

const TIME_OPTIONS = generateTimeOptions()

interface DateTimePickerProps {
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  label?: string
  placeholder?: string
  minDate?: Date
  className?: string
}

export function DateTimePicker({
  value,
  onChange,
  label,
  placeholder = 'Pick a date',
  minDate,
  className,
}: DateTimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [selectedTime, setSelectedTime] = React.useState<string>(() => {
    if (value) {
      const h = value.getHours().toString().padStart(2, '0')
      // Round to nearest 30 min
      const roundedM = Math.round(value.getMinutes() / 30) * 30
      return `${h}:${roundedM === 60 ? '00' : roundedM.toString().padStart(2, '0')}`
    }
    return '20:00'
  })

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      const [hours, minutes] = selectedTime.split(':').map(Number)
      date.setHours(hours, minutes, 0, 0)
      onChange(date)
    } else {
      onChange(undefined)
    }
  }

  const handleTimeChange = (time: string) => {
    setSelectedTime(time)
    if (value) {
      const [hours, minutes] = time.split(':').map(Number)
      const newDate = new Date(value)
      newDate.setHours(hours, minutes, 0, 0)
      onChange(newDate)
    }
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {label && (
        <label className="text-xs font-mono text-text-muted uppercase">
          {label}
        </label>
      )}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              'flex h-12 w-full items-center justify-between rounded-none border border-border-grey bg-graphite px-4 py-2 text-sm font-mono',
              'hover:border-primary focus:border-primary focus:outline-none transition-colors',
              !value && 'text-text-muted'
            )}
          >
            {value ? (
              <span className="text-white">
                {format(value, 'PPP')} at {format(value, 'HH:mm')}
              </span>
            ) : (
              <span>{placeholder}</span>
            )}
            <CalendarIcon className="h-4 w-4 text-text-muted" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="flex">
            <Calendar
              mode="single"
              selected={value}
              onSelect={handleDateSelect}
              disabled={(date) => minDate ? date < minDate : false}
              initialFocus
            />
            <div className="border-l border-border-grey p-3 w-28">
              <div className="text-xs font-mono text-text-muted uppercase mb-2">Time</div>
              <div className="h-[280px] overflow-y-auto scrollbar-thin">
                {TIME_OPTIONS.map((time) => (
                  <button
                    key={time}
                    type="button"
                    onClick={() => handleTimeChange(time)}
                    className={cn(
                      'w-full px-3 py-2 text-left text-sm font-mono transition-colors',
                      selectedTime === time
                        ? 'bg-primary text-black'
                        : 'text-text-muted hover:bg-graphite hover:text-white'
                    )}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-border-grey p-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                onChange(undefined)
                setIsOpen(false)
              }}
              className="px-3 py-1.5 text-xs font-mono text-text-muted hover:text-white transition-colors"
            >
              CLEAR
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-3 py-1.5 text-xs font-mono bg-primary text-black hover:bg-primary/90 transition-colors"
            >
              DONE
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
