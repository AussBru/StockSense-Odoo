import { useRef } from 'react'
import { Printer, X, Download } from 'lucide-react'
import { useStore } from '../store'
import { formatDate } from '../lib/utils'

export interface PrintableDocLine {
  sku?: string
  name: string
  qty: number
  uom?: string
  unitPrice?: number
  taxRate?: number
  subtotal?: number
  tax?: number
  total?: number
  countedQty?: number
  difference?: number
}

export interface PrintableDocumentProps {
  open: boolean
  onClose: () => void
  docTypeTitle: string // 'PURCHASE ORDER', 'SALES ORDER', 'GOODS RECEIPT NOTE', 'DELIVERY SLIP', 'INTERNAL TRANSFER', 'RETURN NOTE', 'INVENTORY ADJUSTMENT'
  documentNumber: string
  status: string
  date: string
  dueDate?: string
  partyTitle?: string // 'Vendor', 'Customer', 'Carrier'
  partyName?: string
  partyAddress?: string
  partyContact?: string
  partyTaxNumber?: string
  warehouseName?: string
  sourceLocationName?: string
  destLocationName?: string
  lines: PrintableDocLine[]
  subtotal?: number
  tax?: number
  total?: number
  currency?: string
  notes?: string
}

export function PrintableDocument({
  open,
  onClose,
  docTypeTitle,
  documentNumber,
  status,
  date,
  dueDate,
  partyTitle = 'Partner',
  partyName,
  partyAddress,
  partyContact,
  partyTaxNumber,
  warehouseName,
  sourceLocationName,
  destLocationName,
  lines,
  subtotal,
  tax,
  total,
  currency = '$',
  notes,
}: PrintableDocumentProps) {
  const { state } = useStore()
  const printAreaRef = useRef<HTMLDivElement>(null)

  if (!open) return null

  const comp = state.companySettings || {
    name: 'StockSense Enterprise Ltd.',
    legalName: 'StockSense Logistics & Inventory Corp.',
    taxNumber: 'US-EIN-984120491',
    email: 'operations@stocksense.io',
    phone: '+1 (555) 839-2041',
    address: '100 Innovation Blvd, Suite 400, Austin, TX 78701',
    currency: '$',
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      {/* Container modal */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-line bg-surface shadow-2xl overflow-hidden">
        {/* Modal Toolbar (hidden when printing) */}
        <div className="flex items-center justify-between border-b border-line bg-surface-2 px-6 py-3.5 print:hidden">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-fg text-sm">Print Preview — {documentNumber}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-xl bg-accent px-4 py-2 text-xs font-semibold text-accent-fg shadow-sm hover:bg-accent-hover transition"
            >
              <Printer size={15} />
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-line bg-surface p-2 text-fg-subtle hover:text-fg hover:bg-surface-2 transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="ss-scroll flex-1 overflow-y-auto p-6 sm:p-10 bg-white text-slate-900 print:p-0 print:overflow-visible" ref={printAreaRef}>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b border-slate-200 pb-6">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950 text-white font-bold text-sm">
                  S
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-950">{comp.name}</h1>
              </div>
              <div className="mt-2 text-xs text-slate-600 leading-relaxed max-w-xs">
                {comp.legalName && <div>{comp.legalName}</div>}
                <div>{comp.address}</div>
                <div>Tax/GST ID: {comp.taxNumber}</div>
                <div>Email: {comp.email} • Tel: {comp.phone}</div>
              </div>
            </div>

            <div className="text-left sm:text-right">
              <span className="inline-block rounded-md bg-slate-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-800">
                {docTypeTitle}
              </span>
              <div className="mt-2 font-mono text-xl font-bold text-slate-950">{documentNumber}</div>
              <div className="mt-1 text-xs text-slate-600">
                <span>Date: </span>
                <span className="font-medium text-slate-900">{formatDate(date)}</span>
              </div>
              {dueDate && (
                <div className="text-xs text-slate-600">
                  <span>Due Date: </span>
                  <span className="font-medium text-slate-900">{formatDate(dueDate)}</span>
                </div>
              )}
              <div className="mt-1 inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase text-slate-700">
                Status: {status}
              </div>
            </div>
          </div>

          {/* Party and Warehouse Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 text-xs">
            {partyName ? (
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  {partyTitle}
                </span>
                <div className="mt-1 text-sm font-bold text-slate-950">{partyName}</div>
                {partyAddress && <div className="mt-0.5 text-slate-600">{partyAddress}</div>}
                {partyContact && <div className="mt-0.5 text-slate-600">Contact: {partyContact}</div>}
                {partyTaxNumber && <div className="mt-0.5 text-slate-600">Tax ID: {partyTaxNumber}</div>}
              </div>
            ) : (
              <div>
                <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                  Movement Details
                </span>
                {sourceLocationName && <div className="mt-1">Source: <span className="font-semibold text-slate-900">{sourceLocationName}</span></div>}
                {destLocationName && <div className="mt-0.5">Destination: <span className="font-semibold text-slate-900">{destLocationName}</span></div>}
              </div>
            )}

            <div>
              <span className="font-bold uppercase tracking-wider text-slate-400 text-[10px]">
                Warehouse & Routing
              </span>
              <div className="mt-1 font-semibold text-slate-900">{warehouseName || 'Main Facility'}</div>
              {sourceLocationName && partyName && (
                <div className="mt-0.5 text-slate-600">Source: {sourceLocationName}</div>
              )}
              {destLocationName && partyName && (
                <div className="mt-0.5 text-slate-600">Destination: {destLocationName}</div>
              )}
            </div>
          </div>

          {/* Line items table */}
          <div className="py-6">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-slate-950 text-[11px] uppercase font-bold text-slate-700">
                <tr>
                  <th className="py-2.5 pr-3">Item / SKU</th>
                  <th className="py-2.5 px-3">Description</th>
                  <th className="py-2.5 px-3 text-right">Quantity</th>
                  {lines.some((l) => l.countedQty !== undefined) && (
                    <>
                      <th className="py-2.5 px-3 text-right">Counted</th>
                      <th className="py-2.5 px-3 text-right">Difference</th>
                    </>
                  )}
                  {lines.some((l) => l.unitPrice !== undefined) && (
                    <th className="py-2.5 px-3 text-right">Unit Price</th>
                  )}
                  {lines.some((l) => l.tax !== undefined) && (
                    <th className="py-2.5 px-3 text-right">Tax</th>
                  )}
                  {lines.some((l) => l.total !== undefined) && (
                    <th className="py-2.5 pl-3 text-right">Total</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lines.map((l, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-2.5 pr-3 font-mono font-semibold text-slate-900">
                      {l.sku || `ITEM-${i + 1}`}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">{l.name}</td>
                    <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                      {l.qty} {l.uom || ''}
                    </td>
                    {l.countedQty !== undefined && (
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900">
                        {l.countedQty}
                      </td>
                    )}
                    {l.difference !== undefined && (
                      <td className={`py-2.5 px-3 text-right font-bold ${l.difference < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {l.difference > 0 ? `+${l.difference}` : l.difference}
                      </td>
                    )}
                    {l.unitPrice !== undefined && (
                      <td className="py-2.5 px-3 text-right text-slate-700">
                        {currency}{l.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    {l.tax !== undefined && (
                      <td className="py-2.5 px-3 text-right text-slate-600">
                        {currency}{l.tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
                    {l.total !== undefined && (
                      <td className="py-2.5 pl-3 text-right font-bold text-slate-950">
                        {currency}{l.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Summary */}
          {total !== undefined && (
            <div className="flex justify-end pt-2 pb-6 border-b border-slate-200">
              <div className="w-64 space-y-1.5 text-xs text-right">
                {subtotal !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-semibold text-slate-900">
                      {currency}{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                {tax !== undefined && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tax:</span>
                    <span className="font-semibold text-slate-900">
                      {currency}{tax.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-300 pt-2 text-sm font-bold text-slate-950">
                  <span>Grand Total:</span>
                  <span>{currency}{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          )}

          {/* Notes and Terms */}
          {notes && (
            <div className="py-4 text-xs text-slate-600">
              <span className="font-bold text-slate-800">Notes & Terms: </span>
              <span>{notes}</span>
            </div>
          )}

          {/* Signatures & Approvals Sign-off Block */}
          <div className="mt-12 grid grid-cols-3 gap-6 pt-6 border-t border-slate-200 text-xs text-center">
            <div>
              <div className="h-14 border-b border-slate-300" />
              <div className="mt-2 font-semibold text-slate-800">Prepared By</div>
              <div className="text-[10px] text-slate-500">Inventory Specialist</div>
            </div>
            <div>
              <div className="h-14 border-b border-slate-300" />
              <div className="mt-2 font-semibold text-slate-800">Authorized By</div>
              <div className="text-[10px] text-slate-500">Operations Manager</div>
            </div>
            <div>
              <div className="h-14 border-b border-slate-300" />
              <div className="mt-2 font-semibold text-slate-800">Received / Accepted By</div>
              <div className="text-[10px] text-slate-500">Date & Signature</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
