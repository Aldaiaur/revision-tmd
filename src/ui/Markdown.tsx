import { marked } from 'marked';
import { useMemo } from 'react';

marked.setOptions({ gfm: true, breaks: false });

/**
 * Rend le Markdown des fiches (source locale de confiance : tes propres fichiers).
 * Les notes saisies dans l'app ne passent jamais par ce composant.
 */
export function Markdown({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  const html = useMemo(() => (inline ? (marked.parseInline(text) as string) : (marked.parse(text) as string)), [text, inline]);
  const Tag = inline ? 'span' : 'div';
  return <Tag className={className ? `md ${className}` : 'md'} dangerouslySetInnerHTML={{ __html: html }} />;
}
