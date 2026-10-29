'use client';

import { useState } from 'react';
import { Check, Copy, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ReportActions({ whatsappText }: { whatsappText: string }) {
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);

  function copyWithFallback() {
    const textarea = document.createElement('textarea');
    textarea.value = whatsappText;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const success = document.execCommand('copy');
    textarea.remove();
    return success;
  }

  async function copySummary() {
    setCopyFailed(false);
    let success = false;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(whatsappText);
        success = true;
      }
    } catch {
      success = false;
    }
    if (!success) {
      try {
        success = copyWithFallback();
      } catch {
        success = false;
      }
    }
    if (!success) {
      setCopyFailed(true);
      return;
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div role="group" aria-label="Acciones del reporte" className="flex flex-wrap items-center gap-2 @lg:justify-end">
      <Button type="button" variant="outline" onClick={copySummary} className="pressable">
        {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {copied ? 'Resumen copiado' : 'Copiar para WhatsApp'}
      </Button>
      <Button type="button" variant="default" onClick={() => window.print()} className="pressable">
        <Printer aria-hidden="true" />
        Imprimir o guardar PDF
      </Button>
      <span role="status" aria-live="polite" className="sr-only">{copied ? 'El resumen se copió al portapapeles.' : ''}</span>
      {copyFailed ? <p role="alert" className="basis-full text-xs text-destructive @lg:text-right">No se pudo copiar el resumen. Revisa los permisos del portapapeles del navegador.</p> : null}
    </div>
  );
}
