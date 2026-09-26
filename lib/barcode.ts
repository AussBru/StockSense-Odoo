/**
 * lib/barcode.ts
 * Barcode generation, rendering (SVG CODE128) and lookup utilities.
 * Pure functions — no React, no store dependency.
 */

import type { AppState, BarcodeRecord } from '../types'

// ── Character set for CODE128-B ──────────────────────────────
const CODE128_B_START = 104
const CODE128_STOP = 106
const CODE128_QUIET = 10   // quiet-zone modules each side

// Encode/pattern table for CODE128-B (ASCII 32–127)
// Each entry is an 11-bit bar/space pattern (1=bar, 0=space)
const CODE128_TABLE: number[] = [
  // Values 0-105 (subset B, codes 0..95 = ASCII 32..127, then special)
  0b11011001100, 0b11001101100, 0b11001100110, 0b10010011000,
  0b10010001100, 0b10001001100, 0b10011001000, 0b10011000100,
  0b10001100100, 0b11001001000, 0b11001000100, 0b11000100100,
  0b10110011100, 0b10011011100, 0b10011001110, 0b10111001100,
  0b10011101100, 0b10011100110, 0b11001110010, 0b11001011100,
  0b11001001110, 0b11011100100, 0b11001110100, 0b11101101110,
  0b11101001100, 0b11100101100, 0b11100100110, 0b11101100100,
  0b11100110100, 0b11100110010, 0b11011011000, 0b11011000110,
  0b11000110110, 0b10100011000, 0b10001011000, 0b10001000110,
  0b10110001000, 0b10001101000, 0b10001100010, 0b11010001000,
  0b11000101000, 0b11000100010, 0b10110111000, 0b10110001110,
  0b10001101110, 0b10111011000, 0b10111000110, 0b10001110110,
  0b11101110110, 0b11010001110, 0b11000101110, 0b11011101000,
  0b11011100010, 0b11011101110, 0b11101011000, 0b11101000110,
  0b11100010110, 0b11101101000, 0b11101100010, 0b11100011010,
  0b11101111010, 0b11001000010, 0b11110001010, 0b10100110000,
  0b10100001100, 0b10010110000, 0b10010000110, 0b10000101100,
  0b10000100110, 0b10110010000, 0b10110000100, 0b10011010000,
  0b10011000010, 0b10000110100, 0b10000110010, 0b11000010010,
  0b11001010000, 0b11110111010, 0b11000010100, 0b10001111010,
  0b10100111100, 0b10010111100, 0b10010011110, 0b10111100100,
  0b10011110100, 0b10011110010, 0b11110100100, 0b11110010100,
  0b11110010010, 0b11011011110, 0b11011110110, 0b11110110110,
  0b10101111000, 0b10100011110, 0b10001011110, 0b10111101000,
  0b10111100010, 0b11110101000, 0b11110100010, 0b10111011110,
  0b10111101110, 0b11101011110, 0b11110101110,
  // 106 = STOP pattern (13 bars)
  0b11000111010,
]

function encode128B(text: string): number[] {
  const codes: number[] = [CODE128_B_START]
  let checksum = CODE128_B_START
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i) - 32
    codes.push(c)
    checksum += c * (i + 1)
  }
  codes.push(checksum % 103)
  codes.push(CODE128_STOP)
  return codes
}

function patternToBars(codes: number[]): boolean[] {
  const bars: boolean[] = []
  for (let ci = 0; ci < codes.length; ci++) {
    const pattern = CODE128_TABLE[codes[ci]]
    const bits = ci === codes.length - 1 ? 13 : 11
    for (let b = bits - 1; b >= 0; b--) {
      bars.push(((pattern >> b) & 1) === 1)
    }
  }
  return bars
}

/** Generate an SVG string for a CODE128-B barcode */
export function generateBarcodeSvg(
  text: string,
  opts: { height?: number; moduleWidth?: number; showText?: boolean } = {},
): string {
  const { height = 60, moduleWidth = 2, showText = true } = opts
  const codes = encode128B(text)
  const bars = patternToBars(codes)
  const totalModules = bars.length + CODE128_QUIET * 2
  const svgWidth = totalModules * moduleWidth
  const svgHeight = height + (showText ? 16 : 0)

  let rects = ''
  let x = CODE128_QUIET * moduleWidth
  for (const bar of bars) {
    if (bar) {
      rects += `<rect x="${x}" y="0" width="${moduleWidth}" height="${height}" fill="currentColor"/>`
    }
    x += moduleWidth
  }

  const textEl = showText
    ? `<text x="${svgWidth / 2}" y="${height + 12}" font-family="monospace" font-size="10" text-anchor="middle" fill="currentColor">${text}</text>`
    : ''

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}">${rects}${textEl}</svg>`
}

// ── Lookup helpers ───────────────────────────────────────────

export function lookupBarcodeInState(state: AppState, barcode: string): BarcodeRecord | null {
  return state.barcodeRecords.find((b) => b.barcode === barcode) ?? null
}

export interface BarcodeScanResult {
  record: BarcodeRecord
  label: string
  detail: string
  productName?: string
  sku?: string
  qty?: number
  locationName?: string
  warehouseName?: string
  lotNumber?: string
  serial?: string
}

/**
 * Given a barcode string, resolve full context from AppState.
 * Used by the BarcodeScanner to display scan results.
 */
export function resolveScan(state: AppState, barcode: string): BarcodeScanResult | null {
  const record = lookupBarcodeInState(state, barcode)
  if (!record) return null

  switch (record.entityType) {
    case 'product': {
      const prod = state.products.find((p) => p.id === record.entityId)
      if (!prod) return null
      const onHand = state.quants
        .filter((q) => q.productId === prod.id)
        .reduce((sum, q) => sum + q.qty, 0)
      return {
        record,
        label: 'Product',
        detail: prod.name,
        productName: prod.name,
        sku: prod.sku,
        qty: onHand,
      }
    }
    case 'variant': {
      const variant = state.productVariants.find((v) => v.id === record.entityId)
      if (!variant) return null
      const prod = state.products.find((p) => p.id === variant.productId)
      return {
        record,
        label: 'Variant',
        detail: `${prod?.name ?? '?'} — ${Object.values(variant.attributeValues).join(' / ')}`,
        productName: prod?.name,
        sku: variant.variantSku,
      }
    }
    case 'location': {
      const loc = state.locations.find((l) => l.id === record.entityId)
      if (!loc) return null
      const wh = state.warehouses.find((w) => w.id === loc.warehouseId)
      const stockQty = state.quants
        .filter((q) => q.locationId === loc.id)
        .reduce((sum, q) => sum + q.qty, 0)
      return {
        record,
        label: 'Location',
        detail: `${loc.name} (${loc.code})`,
        qty: stockQty,
        locationName: loc.name,
        warehouseName: wh?.name,
      }
    }
    case 'warehouse': {
      const wh = state.warehouses.find((w) => w.id === record.entityId)
      if (!wh) return null
      return {
        record,
        label: 'Warehouse',
        detail: `${wh.name} (${wh.code})`,
        warehouseName: wh.name,
      }
    }
    case 'lot': {
      const lot = state.lots.find((l) => l.id === record.entityId)
      if (!lot) return null
      const prod = state.products.find((p) => p.id === lot.productId)
      const loc = state.locations.find((l) => l.id === lot.locationId)
      return {
        record,
        label: 'Lot',
        detail: `${lot.lotNumber} — ${prod?.name ?? '?'}`,
        productName: prod?.name,
        sku: prod?.sku,
        qty: lot.qty,
        locationName: loc?.name,
        lotNumber: lot.lotNumber,
      }
    }
    case 'serial': {
      const sn = state.serials.find((s) => s.id === record.entityId)
      if (!sn) return null
      const prod = state.products.find((p) => p.id === sn.productId)
      const loc = state.locations.find((l) => l.id === sn.locationId)
      return {
        record,
        label: 'Serial',
        detail: `${sn.serial} — ${prod?.name ?? '?'}`,
        productName: prod?.name,
        sku: prod?.sku,
        locationName: loc?.name,
        serial: sn.serial,
      }
    }
    case 'receipt':
    case 'delivery':
    case 'purchaseOrder':
    case 'salesOrder': {
      const doc = state.documents.find((d) => d.id === record.entityId)
        ?? state.purchaseOrders.find((p) => p.id === record.entityId)
        ?? state.salesOrders.find((so) => so.id === record.entityId)
      if (!doc) return null
      const num = 'number' in doc ? doc.number : record.entityId
      return {
        record,
        label: record.entityType === 'purchaseOrder' ? 'Purchase Order' : record.entityType === 'salesOrder' ? 'Sales Order' : record.entityType === 'receipt' ? 'Receipt' : 'Delivery',
        detail: num,
      }
    }
    default:
      return { record, label: record.entityType, detail: record.entityId }
  }
}

/** Quick check: is a barcode already registered for an entity? */
export function barcodeForEntity(state: AppState, entityType: BarcodeRecord['entityType'], entityId: string): string | null {
  return state.barcodeRecords.find((b) => b.entityType === entityType && b.entityId === entityId)?.barcode ?? null
}

/** Auto-generate a unique barcode string for an entity */
export function generateBarcodeString(entityType: string, entityId: string): string {
  const prefix = entityType.slice(0, 3).toUpperCase()
  const suffix = entityId.replace(/[^A-Z0-9]/gi, '').slice(-6).toUpperCase().padEnd(6, '0')
  const rand = Math.floor(Math.random() * 9000 + 1000)
  return `SS-${prefix}-${suffix}${rand}`
}
