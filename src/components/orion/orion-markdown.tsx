import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

const components: Components = {
  p: ({ children }) => <p className="mb-3.5 leading-[1.65] last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-3.5 list-disc space-y-1.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-3.5 list-decimal space-y-1.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="leading-[1.6] marker:text-gold/70">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => (
    <h3 className="mb-2 mt-4 border-b border-border/60 pb-1.5 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h2: ({ children }) => (
    <h3 className="mb-2 mt-4 border-b border-border/60 pb-1.5 text-sm font-semibold text-foreground first:mt-0">
      {children}
    </h3>
  ),
  h3: ({ children }) => <h4 className="mb-1.5 mt-3.5 text-sm font-semibold text-foreground first:mt-0">{children}</h4>,
  a: ({ children, href }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-gold underline underline-offset-2 hover:text-gold/80"
    >
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-3 border-l-2 border-gold/40 pl-3 italic text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-3 border-border" />,
  table: ({ children }) => (
    <div className="mb-3 overflow-x-auto last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border px-2 py-1 text-left font-semibold text-foreground">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border/60 px-2 py-1">{children}</td>,
};

/** Renders Orion's chat replies as properly spaced markdown (paragraphs, lists, bold, headers) instead of one dense pre-wrapped blob. */
export function OrionMarkdown({ content, className }: { content: string; className?: string }) {
  return (
    <div className={cn("text-sm", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
