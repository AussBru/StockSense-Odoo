/**
 * BarcodeScanner.tsx
 * Reusable barcode scanner component.
 * - Uses browser BarcodeDetector API when available (camera scanning)
 * - Falls back gracefully to manual text entry
 * - Calls onScan(barcode) with the raw barcode string
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, CameraOff, Keyboard, Scan, X } from 'lucide-react'
import { generateBarcodeSvg } from '../lib/barcode'

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  onClose?: () => void
  placeholder?: string
  autoFocus?: boolean
  /** If provided, renders a display-only barcode below the input */
  displayBarcode?: string
}

declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue: string }[]>
    }
  }
}

export function BarcodeScanner({
  onScan,
  onClose,
  placeholder = 'Scan or type barcode…',
  autoFocus = true,
  displayBarcode,
}: BarcodeScannerProps) {
  const [mode, setMode] = useState<'manual' | 'camera'>('manual')
  const [value, setValue] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const cameraSupported = typeof window !== 'undefined' && !!window.BarcodeDetector

  // Auto-focus input when in manual mode
  useEffect(() => {
    if (mode === 'manual' && autoFocus) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [mode, autoFocus])

  // Start camera scanning
  const startCamera = useCallback(async () => {
    setCameraError(null)
    setScanning(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector!({ formats: ['code_128', 'ean_13', 'qr_code', 'code_39'] })

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return
        try {
          const results = await detector.detect(videoRef.current)
          if (results.length > 0) {
            stopCamera()
            onScan(results[0].rawValue)
            return
          }
        } catch {
          // BarcodeDetector may throw on empty frames — ignore
        }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch (err) {
      setScanning(false)
      setCameraError('Camera access denied or unavailable. Use manual entry.')
    }
  }, [onScan])

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setScanning(false)
    setMode('manual')
  }, [])

  // Cleanup on unmount
  useEffect(() => () => stopCamera(), [stopCamera])

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed) return
    onScan(trimmed)
    setValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Hardware scanners typically end with Enter
    if (e.key === 'Enter') {
      const trimmed = value.trim()
      if (trimmed) {
        onScan(trimmed)
        setValue('')
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => { stopCamera(); setMode('manual') }}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            mode === 'manual'
              ? 'bg-accent text-accent-fg'
              : 'bg-surface-2 text-fg-muted hover:bg-surface-2/80'
          }`}
        >
          <Keyboard size={14} />
          Manual
        </button>
        {cameraSupported && (
          <button
            type="button"
            onClick={() => { setMode('camera'); startCamera() }}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              mode === 'camera'
                ? 'bg-accent text-accent-fg'
                : 'bg-surface-2 text-fg-muted hover:bg-surface-2/80'
            }`}
          >
            <Camera size={14} />
            Camera
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="ml-auto rounded-lg p-1.5 text-fg-muted hover:bg-surface-2"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Camera view */}
      {mode === 'camera' && (
        <div className="relative overflow-hidden rounded-xl border border-line bg-black">
          <video
            ref={videoRef}
            className="w-full"
            playsInline
            muted
            style={{ maxHeight: 240, objectFit: 'cover' }}
          />
          {scanning && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-lg border-2 border-accent/60 bg-transparent" style={{ width: 220, height: 80 }} />
            </div>
          )}
          {scanning && (
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white flex items-center gap-1.5">
                <Scan size={12} className="animate-pulse" />
                Scanning…
              </span>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-4">
              <div className="text-center text-white">
                <CameraOff size={28} className="mx-auto mb-2 opacity-60" />
                <p className="text-sm">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => { setMode('manual'); setCameraError(null) }}
                  className="mt-3 rounded-lg bg-white/20 px-4 py-1.5 text-xs hover:bg-white/30"
                >
                  Use manual entry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual entry */}
      {mode === 'manual' && (
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="h-11 flex-1 rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={!value.trim()}
            className="flex h-11 items-center gap-1.5 rounded-lg bg-accent px-4 text-sm font-medium text-accent-fg disabled:opacity-40"
          >
            <Scan size={15} />
            Scan
          </button>
        </form>
      )}

      {/* Display barcode SVG if provided */}
      {displayBarcode && (
        <div
          className="flex justify-center rounded-lg border border-line bg-white px-4 py-3 text-fg"
          dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(displayBarcode, { height: 48, moduleWidth: 2, showText: true }) }}
        />
      )}
    </div>
  )
}

/** Inline compact barcode display (just the SVG, no scanner UI) */
export function BarcodeDisplay({ barcode, height = 48 }: { barcode: string; height?: number }) {
  return (
    <div
      className="inline-flex items-center justify-center text-fg"
      dangerouslySetInnerHTML={{ __html: generateBarcodeSvg(barcode, { height, moduleWidth: 1.5, showText: true }) }}
    />
  )
}
