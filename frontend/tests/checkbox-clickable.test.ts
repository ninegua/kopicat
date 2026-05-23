import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../lib/markdown';

describe('renderMarkdown source-position binding', () => {
  it('injects data-source-pos for a single checkbox', () => {
    const html = renderMarkdown('- [ ] one');
    expect(html).toContain('data-source-pos="2"');
    expect(html).not.toContain('disabled');
  });

  it('injects correct positions for multiple checkboxes', () => {
    const html = renderMarkdown('- [ ] one\n- [x] two\n- [ ] three');
    const posMatches = [...html.matchAll(/data-source-pos="(\d+)"/g)];
    expect(posMatches.map((m) => parseInt(m[1], 10))).toEqual([2, 12, 22]);
  });

  it('handles nested and ordered lists', () => {
    const html = renderMarkdown('- [ ] a\n  1. [x] b\n* [X] c');
    const posMatches = [...html.matchAll(/data-source-pos="(\d+)"/g)];
    expect(posMatches.map((m) => parseInt(m[1], 10))).toEqual([2, 13, 21]);
  });

  it('preserves checked state from source', () => {
    const htmlUnchecked = renderMarkdown('- [ ] todo');
    expect(htmlUnchecked).not.toContain('checked');

    const htmlChecked = renderMarkdown('- [x] done');
    expect(htmlChecked).toContain('checked');
  });

  it('excludes checkboxes inside fenced code blocks', () => {
    const html = renderMarkdown(
      '- [ ] real task\n```\n- [ ] inside code\n```\n- [ ] another real',
    );
    const posMatches = [...html.matchAll(/data-source-pos="(\d+)"/g)];
    // Only two positions: the two real task list items outside the code block.
    expect(posMatches.length).toBe(2);
    expect(posMatches.map((m) => parseInt(m[1], 10))).toEqual([2, 44]);
  });
});
