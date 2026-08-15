/** Codex-style markdown directives share one colon-prefixed syntax: `:name{...}` inline,
 *  `::name{...}` leaf, and `:::name{...}` (closed by a bare `:::` line) containers. The names are
 *  open-ended — `writing`, `git-create-branch`, `codex-file-citation`, and others — so this strips
 *  them by syntax alone rather than maintaining a list: any directive present today or added by a
 *  future agent version disappears without a code change. Attributes are required for inline
 *  tokens so ordinary prose like `c:\path` or `12:30` is never mistaken for a directive. */

const DIRECTIVE_ONLY_LINE = /^\s*:{1,3}[a-zA-Z][a-zA-Z0-9-]*(?:\s*\{[^{}]*\})?\s*$/

/** A bare closing fence: a `:::` line with no name, marking the end of a container directive. */
const DIRECTIVE_CLOSE_LINE = /^\s*:::\s*$/

/** An inline directive token inside a line of prose. The attribute block is mandatory so ordinary
 *  text is never mangled: `12:30` has no `{...}`, `C:\path` puts a backslash right after the colon,
 *  and a bare `word:` followed by a noun would just be prose punctuation. */
const DIRECTIVE_ATTRS_TOKEN = /(?<![A-Za-z0-9]):{1,3}[a-zA-Z][a-zA-Z0-9-]*\s*\{[^{}]*\}/g

export function stripMarkdownDirectives(markdown: string): string {
  return markdown
    .split("\n")
    .map((line) => {
      if (DIRECTIVE_ONLY_LINE.test(line) || DIRECTIVE_CLOSE_LINE.test(line)) return ""
      return line.replace(DIRECTIVE_ATTRS_TOKEN, "")
    })
    .join("\n")
}
