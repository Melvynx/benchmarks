import { Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'
import { copyText } from '../../lib/clipboard'
import { Button } from '../ui/Button'

export function CopyButton({ getText, label = 'Copy' }: { getText: () => string; label?: string }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = window.setTimeout(() => setCopied(false), 1800)
    return () => window.clearTimeout(timer)
  }, [copied])

  return (
    <Button
      variant="ghost"
      size="sm"
      title="Copy these times in every city’s local time"
      onClick={async () => setCopied(await copyText(getText()))}
    >
      {copied ? <Check aria-hidden className="text-overlap-edge" /> : <Copy aria-hidden />}
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </Button>
  )
}
