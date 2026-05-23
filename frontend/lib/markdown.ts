import { parse, postprocess, preprocess, compile } from 'micromark';
import { gfm, gfmHtml } from 'micromark-extension-gfm';

/**
 * Render markdown with clickable checkbox support.
 * Uses the real micromark tokenizer to collect exact source offsets for task
 * list items, then strips `disabled` and injects `data-source-pos` into each
 * rendered checkbox for O(1) click-to-source mapping.
 */
export function renderMarkdown(source: string): string {
  // Run the exact same tokenizer pipeline that micromark() uses internally.
  const parser = parse({ extensions: [gfm()] });
  const chunks = preprocess()(source, undefined, true);
  const events = postprocess(parser.document().write(chunks));

  // Collect the exact source offset of every real task-list checkbox.
  // The tokenizer does NOT emit 'taskListCheck' inside codeFenced or
  // codeIndented blocks, so code blocks are naturally excluded.
  const positions: number[] = [];
  for (const event of events) {
    if (event[0] === 'enter' && (event[1] as any).type === 'taskListCheck') {
      positions.push(event[1].start.offset);
    }
  }

  // Compile to HTML using the already-tokenized events.
  const html = compile({ htmlExtensions: [gfmHtml()] })(events);

  // Pair each rendered <input> with its pre-computed source position.
  // micromark emits checkboxes in strict document order, so the Nth <input>
  // always corresponds to the Nth source position.
  let idx = 0;
  return html.replace(
    /<input\s+type="checkbox"\s+([^>]*)\bdisabled\b(?:="")?\s*([^>]*)>/g,
    (_full, before: string, after: string) => {
      const pos = positions[idx++];
      // Defensive: if the parser and HTML somehow drift, fall back to the
      // original disabled input so the UI doesn't silently corrupt data.
      if (pos === undefined) return _full;
      const cleanBefore = before.replace(/\s*\bdisabled\b(?:="")?/g, '');
      const cleanAfter = after.replace(/\s*\bdisabled\b(?:="")?/g, '');
      return `<input type="checkbox"${cleanBefore} data-source-pos="${pos}"${cleanAfter}>`;
    },
  );
}
