import assert from 'node:assert/strict'

const { stripMarkdownDirectives } = await import('./markdownDirectives.ts')

const strip = (text) => stripMarkdownDirectives(text).trim()

// A block container directive, closed by a bare `:::` line, carrying prose inside: the fence lines
// go, the inner content stays. Not a name-specific fix: any `:::name{...}` fence strips itself.
assert.equal(
  strip(':::writing{variant="document" id="58421"}\nGuida applicativa\n:::\n'),
  'Guida applicativa',
  'container directives should drop their fence lines but keep any content inside'
)

// A leaf directive on its own line disappears entirely, along with whatever the harness echoed in
// its attributes: it carries no prose for the user.
assert.equal(
  strip('::git-create-branch{cwd="C:" branch="codex/topic"}\nRamo creato.'),
  'Ramo creato.',
  'leaf directive lines should be removed whole'
)

// Inline directives embedded in prose are removed without losing the sentence around them. They
// begin a line or follow a whitespace break, so the attribute block is what distinguishes a real
// directive from prose: a colon glued to a word, or any colon without `{...}` attributes, is safe.
assert.equal(
  strip(':codex-file-citation{path="C:\\tmp\\a.docx" purpose="output"} consultato il verbale.'),
  'consultato il verbale.',
  'inline directives at a prose break should be removed without losing surrounding text'
)
assert.equal(
  strip('Riga utile:codex-file-citation{path="p.docx" purpose="output"}.'),
  'Riga utile:codex-file-citation{path="p.docx" purpose="output"}.',
  'a colon glued to a word is prose punctuation, not an inline directive: it must be left alone'
)

// Ordinary prose must not be confused with directives: colons in paths, times, and Windows drive
// letters are not names followed by an attribute block.
assert.equal(strip('alle 12:30 finito.'), 'alle 12:30 finito.', 'time colons are not directives')
assert.equal(strip('su C:\\Users\\tmp\\a.docx'), 'su C:\\Users\\tmp\\a.docx', 'drive letters and paths are not directives')

// Directives whose names are added by a future Codex version still strip: the pattern keys off
// syntax, not a curated list.
assert.equal(
  strip(':::pdf-citation{id="1"}\ncertificato\n:::'),
  'certificato',
  'unknown directive names must be stripped like any other'
)