import { useCallback, useState } from 'react'

interface Flag {
  description: string
  invoice_amount: number
  boq_amount: number | null
  status: 'match' | 'rate_mismatch' | 'not_in_scope'
  note: string
}

interface ComparisonResult {
  currency: string
  currency_mismatch: boolean
  flags: Flag[]
  total_invoice: number
  total_boq_matched: number
  total_overcharge: number
}

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

type Status = 'idle' | 'loading' | 'success' | 'error'

const LOADING_STEPS = [
  'Reading your documents…',
  'Extracting line items…',
  'Comparing invoice against BOQ…',
  'Flagging discrepancies…',
]

function formatMoney(value: number, currency?: string): string {
  try {
    if (currency) {
      return new Intl.NumberFormat('en', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(value)
    }
  } catch {
    // fall through to plain formatting for currency codes Intl doesn't recognize
  }
  return `${new Intl.NumberFormat('en', { minimumFractionDigits: 2 }).format(value)}${currency ? ' ' + currency : ''}`
}

const STATUS_STYLE: Record<Flag['status'], { label: string; dot: string; row: string }> = {
  match: { label: 'Match', dot: 'bg-emerald-400', row: 'text-slate-300' },
  rate_mismatch: { label: 'Overcharge', dot: 'bg-amber-400', row: 'text-amber-200' },
  not_in_scope: { label: 'Not in BOQ', dot: 'bg-red-400', row: 'text-red-200' },
}

function Dropzone({
  label,
  file,
  onFile,
}: {
  label: string
  file: File | null
  onFile: (f: File | undefined | null) => void
}) {
  const [dragging, setDragging] = useState(false)
  const inputId = `file-${label}`

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        onFile(e.dataTransfer.files?.[0])
      }}
      className={`relative rounded-2xl border-2 border-dashed p-6 text-center transition-all duration-300 ${
        dragging
          ? 'border-violet-400 bg-violet-500/10 scale-[1.02]'
          : 'border-white/15 bg-white/3 hover:border-white/30 hover:bg-white/5'
      }`}
    >
      <input
        id={inputId}
        type="file"
        accept="application/pdf"
        className="absolute inset-0 cursor-pointer opacity-0"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      <p className="pointer-events-none text-xs font-semibold tracking-wide text-violet-300 uppercase">{label}</p>
      {file ? (
        <>
          <p className="pointer-events-none mt-2 font-medium text-white">{file.name}</p>
          <p className="pointer-events-none mt-1 text-xs text-slate-400">
            {(file.size / 1024).toFixed(0)} KB · click to replace
          </p>
        </>
      ) : (
        <p className="pointer-events-none mt-2 text-sm text-slate-400">Drop PDF or browse</p>
      )}
    </div>
  )
}

function App() {
  const [invoice, setInvoice] = useState<File | null>(null)
  const [boq, setBoq] = useState<File | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [result, setResult] = useState<ComparisonResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadingStep, setLoadingStep] = useState(0)

  const acceptInvoice = useCallback((f: File | undefined | null) => {
    if (!f) return
    setInvoice(f)
    setResult(null)
    setStatus('idle')
  }, [])

  const acceptBoq = useCallback((f: File | undefined | null) => {
    if (!f) return
    setBoq(f)
    setResult(null)
    setStatus('idle')
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!invoice || !boq || status === 'loading') return

    setStatus('loading')
    setError(null)
    setLoadingStep(0)

    const stepTimer = setInterval(
      () => setLoadingStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)),
      2500,
    )

    try {
      const form = new FormData()
      form.append('invoice', invoice)
      form.append('boq', boq)

      const res = await fetch(`${API_URL}/compare`, { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) throw new Error(data.detail ?? 'Something went wrong')

      setResult(data as ComparisonResult)
      setStatus('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStatus('error')
    } finally {
      clearInterval(stepTimer)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-200 antialiased">
      <div className="pointer-events-none absolute -top-40 left-1/2 h-125 w-200 -translate-x-1/2 rounded-full bg-violet-600/20 blur-3xl" />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-100 w-100 rounded-full bg-cyan-500/10 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col px-4 py-10 sm:py-16">
        <header className="mb-10 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-slate-300 backdrop-blur">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Live · Llama 3.3 70B · BOQ vs invoice reconciliation
          </div>
          <h1 className="bg-linear-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-4xl font-bold tracking-tight text-transparent sm:text-5xl">
            BOQ Checker
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-400 sm:text-base">
            Upload the original BOQ and a contractor invoice — get every overcharge
            and out-of-scope item flagged automatically.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Dropzone label="Invoice" file={invoice} onFile={acceptInvoice} />
            <Dropzone label="BOQ (original plan)" file={boq} onFile={acceptBoq} />
          </div>

          <button
            type="submit"
            disabled={!invoice || !boq || status === 'loading'}
            className="w-full rounded-xl bg-linear-to-r from-violet-600 to-cyan-600 px-6 py-3.5 font-semibold text-white shadow-lg shadow-violet-900/40 transition-all duration-300 hover:shadow-violet-700/40 hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:shadow-none"
          >
            {status === 'loading' ? (
              <span className="inline-flex items-center gap-3">
                <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                {LOADING_STEPS[loadingStep]}
              </span>
            ) : (
              'Compare'
            )}
          </button>
        </form>

        {status === 'error' && error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {status === 'success' && result && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/4 shadow-2xl shadow-black/40 backdrop-blur">
            {result.currency_mismatch && (
              <div className="flex items-start gap-3 border-b border-amber-500/20 bg-amber-500/10 px-5 py-3.5 text-sm text-amber-200">
                <span>⚠️</span>
                <span>
                  The invoice and BOQ are in different currencies — amount totals below aren't meaningful,
                  only the item-level scope flags are.
                </span>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2 border-b border-white/10 px-5 py-4 text-center">
              <div>
                <p className="text-xs text-slate-400">Invoice total</p>
                <p className="mt-1 font-semibold text-white">{formatMoney(result.total_invoice, result.currency)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Matched to BOQ</p>
                <p className="mt-1 font-semibold text-white">
                  {result.currency_mismatch ? '—' : formatMoney(result.total_boq_matched, result.currency)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Overcharge</p>
                <p className={`mt-1 font-semibold ${result.total_overcharge > 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                  {result.currency_mismatch ? '—' : formatMoney(result.total_overcharge, result.currency)}
                </p>
              </div>
            </div>

            <div className="divide-y divide-white/6">
              {result.flags.map((f, i) => {
                const s = STATUS_STYLE[f.status]
                return (
                  <div key={i} className="flex items-start gap-3 px-5 py-3.5">
                    <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${s.dot}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-medium text-white">{f.description}</p>
                        <span className={`shrink-0 text-xs font-semibold ${s.row}`}>{s.label}</span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{f.note}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <footer className="mt-auto pt-14 text-center text-xs text-slate-500">
          <p>Built by Haris</p>
        </footer>
      </div>
    </div>
  )
}

export default App
