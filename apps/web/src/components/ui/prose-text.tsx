/** Renders AI-generated text (paragraphs separated by blank lines) as real <p> elements
 * inside a `prose` wrapper, so the typography plugin's paragraph spacing actually applies
 * — a single <p> with `whitespace-pre-line` doesn't get that spacing. */
export function ProseText({ text, className = "" }: { text: string; className?: string }) {
  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      {paragraphs.map((paragraph, i) => (
        <p key={i}>{paragraph}</p>
      ))}
    </div>
  );
}
