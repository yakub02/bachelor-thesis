import { useState, useEffect, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Card } from '@/components/ui'
import { cn } from '@/utils'
import type { QRCodeData } from '@/types'

interface QRCodeDisplayProps {
  qrData: QRCodeData
  className?: string
}

export function QRCodeDisplay({ qrData, className }: QRCodeDisplayProps) {
  const [timeLeft, setTimeLeft] = useState(qrData.expires_in)
  const lastSignatureRef = useRef(qrData.signature)

  // Reset timer when signature changes (new QR code fetched)
  useEffect(() => {
    if (lastSignatureRef.current !== qrData.signature) {
      lastSignatureRef.current = qrData.signature
      setTimeLeft(qrData.expires_in)
    }
  }, [qrData.signature, qrData.expires_in])

  // Countdown timer - runs independently
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)

    return () => clearInterval(timer)
  }, []) // Empty deps - runs once

  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex flex-col items-center">
        {/* QR Code */}
        <div className="bg-white p-4 rounded">
          <QRCodeSVG
            value={qrData.qr_data}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

        {/* Timer */}
        <div className="mt-4 text-center">
          <div className="text-text-muted text-xs font-mono uppercase">Refreshes in</div>
          <div className={cn(
            'font-mono text-2xl font-bold',
            timeLeft <= 5 ? 'text-error' : 'text-primary'
          )}>
            {timeLeft}s
          </div>
        </div>

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              qrData.status === 'valid' ? 'bg-success' : 'bg-error'
            )}
          />
          <span className="font-mono text-xs uppercase text-text-muted">
            {qrData.status}
          </span>
        </div>
      </div>
    </Card>
  )
}
