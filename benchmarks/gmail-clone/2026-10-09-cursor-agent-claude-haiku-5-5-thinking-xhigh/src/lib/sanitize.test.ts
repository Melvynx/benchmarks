// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './sanitize';

describe('sanitizeHtml', () => {
  it('drops scripts, event handlers and inline styles', () => {
    const out = sanitizeHtml('<p onclick="x()" style="color:red">hi</p><script>alert(1)</script>');
    expect(out).toContain('<p>hi</p>');
    expect(out).not.toContain('script');
    expect(out).not.toContain('onclick');
    expect(out).not.toContain('style=');
  });

  it('keeps http, https and mailto links and forces safe link attributes', () => {
    const out = sanitizeHtml('<a href="https://example.com" onmouseover="x()">site</a>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noreferrer noopener"');
    expect(out).not.toContain('onmouseover');
  });

  it('removes javascript: links', () => {
    const out = sanitizeHtml('<a href="javascript:alert(1)">bad</a>');
    expect(out).not.toContain('javascript:');
    expect(out).toContain('bad');
  });

  it('drops images and iframes', () => {
    const out = sanitizeHtml('<img src="https://tracker.example/p.gif"><iframe src="https://x"></iframe><p>text</p>');
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<iframe');
    expect(out).toContain('text');
  });

  it('collapses quoted replies into a details element once', () => {
    const quoted = '<p>reply</p><blockquote class="quote"><p>original</p></blockquote>';
    const once = sanitizeHtml(quoted);
    expect(once).toContain('<details');
    expect(once).toContain('Show trimmed content');
    const twice = sanitizeHtml(once);
    expect(twice.match(/<details/g)?.length).toBe(1);
  });
});
