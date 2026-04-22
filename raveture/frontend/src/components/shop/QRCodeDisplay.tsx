import { QRCodeSVG } from 'qrcode.react'
import { Card } from '@/components/ui'
import { cn } from '@/utils'
import type { QRCodeData } from '@/types'

interface QRCodeDisplayProps {
  qrData: QRCodeData
  className?: string
}

export function QRCodeDisplay({ qrData, className }: QRCodeDisplayProps) {
  return (
    <Card hover={false} className={cn('p-6', className)}>
      <div className="flex flex-col items-center">
        <div className="bg-white p-4 rounded">
          <QRCodeSVG
            value={qrData.qr_data}
            size={200}
            level="H"
            includeMargin={false}
          />
        </div>

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
