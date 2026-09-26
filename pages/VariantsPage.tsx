import { useState } from 'react'
import { Plus, Pencil, Trash2, ToggleLeft, ToggleRight, Tag, ChevronDown, ChevronRight, Barcode } from 'lucide-react'
import { useStore } from '../store'
import { BarcodeDisplay } from '../components/BarcodeScanner'
import { barcodeForEntity, generateBarcodeString } from '../lib/barcode'
import { totalOnHand } from '../lib/inventory'
import type { ProductVariant, ProductAttribute } from '../types'

export function VariantsPage() {
  const { state, saveVariant, deleteVariant, toggleVariantActive, saveProductExtension, assignBarcode } = useStore()
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null)
  const [editVariant, setEditVariant] = useState<Partial<ProductVariant> & { productId: string } | null>(null)
  const [editExt, setEditExt] = useState<string | null>(null) // productId for attribute editing
  const [attrDraft, setAttrDraft] = useState<ProductAttribute[]>([])
  const [search, setSearch] = useState('')

  const filteredProducts = state.products.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase()),
  )

  const extFor = (productId: string) => state.productExtensions.find((e) => e.productId === productId)
  const variantsFor = (productId: string) => state.productVariants.filter((v) => v.productId === productId)

  function openNewVariant(productId: string) {
    const ext = extFor(productId)
    const attrs = ext?.attributes ?? []
    const attrValues: Record<string, string> = {}
    attrs.forEach((a) => { attrValues[a.name] = a.values[0] ?? '' })
    setEditVariant({
      productId,
      variantSku: '',
      barcode: '',
      attributeValues: attrValues,
      costPrice: state.products.find((p) => p.id === productId)?.costPrice ?? 0,
      salesPrice: state.products.find((p) => p.id === productId)?.salesPrice ?? 0,
      active: true,
    })
  }

  function saveVariantForm() {
    if (!editVariant?.productId) return
    const id = saveVariant({
      id: (editVariant as ProductVariant).id,
      productId: editVariant.productId,
      variantSku: editVariant.variantSku ?? '',
      barcode: editVariant.barcode ?? '',
      attributeValues: editVariant.attributeValues ?? {},
      costPrice: Number(editVariant.costPrice ?? 0),
      salesPrice: Number(editVariant.salesPrice ?? 0),
      active: editVariant.active ?? true,
    })
    // Register barcode if provided
    if (editVariant.barcode?.trim()) {
      assignBarcode('variant', id, editVariant.barcode.trim())
    }
    setEditVariant(null)
  }

  function openEditAttributes(productId: string) {
    const ext = extFor(productId)
    setAttrDraft(ext?.attributes ? JSON.parse(JSON.stringify(ext.attributes)) : [])
    setEditExt(productId)
  }

  function saveAttributes() {
    if (!editExt) return
    const ext = extFor(editExt)
    saveProductExtension({
      productId: editExt,
      trackingType: ext?.trackingType ?? 'none',
      hasVariants: true,
      attributes: attrDraft,
      expiryWarningDays: ext?.expiryWarningDays ?? 0,
      rotationMethod: ext?.rotationMethod ?? 'FIFO',
    })
    setEditExt(null)
  }

  function autoBarcode(variantId: string, productId: string) {
    const bc = generateBarcodeString('variant', variantId)
    assignBarcode('variant', variantId, bc)
    const variant = state.productVariants.find((v) => v.id === variantId)
    if (variant) saveVariant({ ...variant, barcode: bc })
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-fg">Product Variants</h1>
          <p className="text-sm text-fg-muted">Manage product variants and their attribute combinations</p>
        </div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search products…"
        className="h-10 w-full max-w-sm rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
      />

      <div className="space-y-3">
        {filteredProducts.map((product) => {
          const ext = extFor(product.id)
          const variants = variantsFor(product.id)
          const expanded = expandedProductId === product.id
          const bc = barcodeForEntity(state, 'product', product.id)

          return (
            <div key={product.id} className="rounded-xl border border-line bg-surface">
              {/* Product header row */}
              <button
                type="button"
                onClick={() => setExpandedProductId(expanded ? null : product.id)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left"
              >
                {expanded ? <ChevronDown size={16} className="shrink-0 text-fg-muted" /> : <ChevronRight size={16} className="shrink-0 text-fg-muted" />}
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg">{product.name}</div>
                  <div className="text-xs text-fg-muted">SKU: {product.sku} · {variants.length} variant{variants.length !== 1 ? 's' : ''} · Tracking: {ext?.trackingType ?? 'none'}</div>
                </div>
                {bc && (
                  <span className="hidden shrink-0 text-xs text-fg-subtle md:block">{bc}</span>
                )}
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ext?.hasVariants ? 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300' : 'bg-surface-2 text-fg-muted'}`}>
                  {ext?.hasVariants ? 'Variants enabled' : 'No variants'}
                </span>
              </button>

              {expanded && (
                <div className="border-t border-line px-4 pb-4 pt-3 space-y-4">
                  {/* Actions row */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => openEditAttributes(product.id)}
                      className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-medium hover:bg-surface-2"
                    >
                      <Tag size={13} />
                      Edit Attributes
                    </button>
                    <button
                      type="button"
                      onClick={() => openNewVariant(product.id)}
                      className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-accent-fg"
                    >
                      <Plus size={13} />
                      Add Variant
                    </button>
                  </div>

                  {/* Attributes list */}
                  {ext?.attributes && ext.attributes.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {ext.attributes.map((attr) => (
                        <span key={attr.id} className="rounded-full border border-line bg-surface-2 px-3 py-1 text-xs">
                          <span className="font-medium">{attr.name}:</span> {attr.values.join(', ')}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Variants table */}
                  {variants.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border border-line">
                      <table className="w-full text-sm">
                        <thead className="border-b border-line bg-surface-2 text-xs text-fg-muted">
                          <tr>
                            <th className="px-3 py-2 text-left">Attributes</th>
                            <th className="px-3 py-2 text-left">SKU</th>
                            <th className="px-3 py-2 text-left">Barcode</th>
                            <th className="px-3 py-2 text-right">Cost</th>
                            <th className="px-3 py-2 text-right">Price</th>
                            <th className="px-3 py-2 text-center">Active</th>
                            <th className="px-3 py-2" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line">
                          {variants.map((v) => (
                            <tr key={v.id} className={`${!v.active ? 'opacity-50' : ''}`}>
                              <td className="px-3 py-2 text-fg">
                                {Object.entries(v.attributeValues).map(([k, val]) => `${k}: ${val}`).join(' · ')}
                              </td>
                              <td className="px-3 py-2 font-mono text-xs text-fg-muted">{v.variantSku}</td>
                              <td className="px-3 py-2">
                                {v.barcode ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono text-xs text-fg-muted">{v.barcode}</span>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => autoBarcode(v.id, v.productId)}
                                    className="flex items-center gap-1 text-xs text-accent hover:underline"
                                  >
                                    <Barcode size={12} /> Generate
                                  </button>
                                )}
                              </td>
                              <td className="px-3 py-2 text-right text-fg-muted">${v.costPrice.toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-fg">${v.salesPrice.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                <button type="button" onClick={() => toggleVariantActive(v.id)}>
                                  {v.active
                                    ? <ToggleRight size={18} className="text-emerald-500" />
                                    : <ToggleLeft size={18} className="text-fg-subtle" />}
                                </button>
                              </td>
                              <td className="px-3 py-2">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => setEditVariant({ ...v })}
                                    className="rounded p-1 hover:bg-surface-2"
                                  >
                                    <Pencil size={13} className="text-fg-muted" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { if (confirm('Delete this variant?')) deleteVariant(v.id) }}
                                    className="rounded p-1 hover:bg-rose-50 dark:hover:bg-rose-500/10"
                                  >
                                    <Trash2 size={13} className="text-rose-500" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-fg-subtle">No variants yet. Add one above.</p>
                  )}

                  {/* Barcode display for product */}
                  {bc && (
                    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface-2 p-3">
                      <Barcode size={16} className="shrink-0 text-fg-muted" />
                      <BarcodeDisplay barcode={bc} height={36} />
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Variant edit modal */}
      {editVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">
              {(editVariant as ProductVariant).id ? 'Edit Variant' : 'New Variant'}
            </h2>
            <div className="space-y-3">
              {/* Attribute values */}
              {(extFor(editVariant.productId)?.attributes ?? []).map((attr) => (
                <div key={attr.id}>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">{attr.name}</label>
                  <select
                    value={editVariant.attributeValues?.[attr.name] ?? ''}
                    onChange={(e) => setEditVariant((v) => ({ ...v!, attributeValues: { ...v!.attributeValues, [attr.name]: e.target.value } }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  >
                    {attr.values.map((val) => <option key={val} value={val}>{val}</option>)}
                  </select>
                </div>
              ))}
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Variant SKU</label>
                <input
                  value={editVariant.variantSku ?? ''}
                  onChange={(e) => setEditVariant((v) => ({ ...v!, variantSku: e.target.value }))}
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-fg-muted">Barcode</label>
                <input
                  value={editVariant.barcode ?? ''}
                  onChange={(e) => setEditVariant((v) => ({ ...v!, barcode: e.target.value }))}
                  placeholder="Leave blank to auto-generate"
                  className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Cost Price</label>
                  <input
                    type="number"
                    value={editVariant.costPrice ?? ''}
                    onChange={(e) => setEditVariant((v) => ({ ...v!, costPrice: Number(e.target.value) }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-fg-muted">Sales Price</label>
                  <input
                    type="number"
                    value={editVariant.salesPrice ?? ''}
                    onChange={(e) => setEditVariant((v) => ({ ...v!, salesPrice: Number(e.target.value) }))}
                    className="h-9 w-full rounded-lg border border-line bg-surface px-3 text-sm focus:border-accent focus:outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditVariant(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={saveVariantForm} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Attribute editor modal */}
      {editExt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="mb-4 text-base font-semibold text-fg">Edit Attributes</h2>
            <div className="space-y-3">
              {attrDraft.map((attr, ai) => (
                <div key={attr.id} className="rounded-lg border border-line p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      value={attr.name}
                      onChange={(e) => {
                        const d = [...attrDraft]
                        d[ai] = { ...d[ai], name: e.target.value }
                        setAttrDraft(d)
                      }}
                      placeholder="Attribute name (e.g. Color)"
                      className="h-8 flex-1 rounded-lg border border-line bg-surface px-2 text-sm focus:border-accent focus:outline-none"
                    />
                    <button type="button" onClick={() => setAttrDraft(attrDraft.filter((_, i) => i !== ai))} className="text-rose-500 hover:text-rose-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <input
                    value={attr.values.join(', ')}
                    onChange={(e) => {
                      const d = [...attrDraft]
                      d[ai] = { ...d[ai], values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) }
                      setAttrDraft(d)
                    }}
                    placeholder="Values: Red, Blue, Green"
                    className="h-8 w-full rounded-lg border border-line bg-surface px-2 text-xs focus:border-accent focus:outline-none"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setAttrDraft([...attrDraft, { id: `attr_${Date.now()}`, name: '', values: [] }])}
                className="flex items-center gap-1.5 text-sm text-accent hover:underline"
              >
                <Plus size={14} /> Add attribute
              </button>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditExt(null)} className="rounded-lg border border-line px-4 py-2 text-sm">Cancel</button>
              <button type="button" onClick={saveAttributes} className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-fg">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
