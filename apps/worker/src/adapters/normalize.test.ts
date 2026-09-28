import { describe, expect, it } from 'vitest';
import { lineDiff } from './diff';
import { normalizeWebsiteHtml } from './normalize';

const PRICING_PAGE_BEFORE = `
<html>
<head><title>Pricing - Acme</title></head>
<body>
  <nav>Home | Pricing | Docs</nav>
  <header>Acme Inc</header>
  <main>
    <h1>Pricing</h1>
    <div id="plan-standard">
      <h2>Standard</h2>
      <p class="price">$19/month</p>
    </div>
    <div id="plan-pro">
      <h2>Pro</h2>
      <p class="price">$49/month</p>
    </div>
  </main>
  <div class="cookie-banner">We use cookies. <button>Accept</button></div>
  <footer>© 2026 Acme Inc. <time datetime="2026-01-01">Jan 1</time></footer>
  <script>var sessionId = "abc123";</script>
</body>
</html>`;

// Cosmetic-only change: cookie banner text, footer year/timestamp, a session id in a script -
// none of that is real content, and normalization should strip all of it.
const PRICING_PAGE_COSMETIC_CHANGE = `
<html>
<head><title>Pricing - Acme</title></head>
<body>
  <nav>Home | Pricing | Docs</nav>
  <header>Acme Inc</header>
  <main>
    <h1>Pricing</h1>
    <div id="plan-standard">
      <h2>Standard</h2>
      <p class="price">$19/month</p>
    </div>
    <div id="plan-pro">
      <h2>Pro</h2>
      <p class="price">$49/month</p>
    </div>
  </main>
  <div class="cookie-banner">This site uses cookies for a better experience. <button>OK</button></div>
  <footer>© 2027 Acme Inc. <time datetime="2027-06-15">Jun 15</time></footer>
  <script>var sessionId = "xyz789-different-every-load";</script>
</body>
</html>`;

// Real change: the Standard plan's price actually moved.
const PRICING_PAGE_REAL_CHANGE = PRICING_PAGE_BEFORE.replace('$19/month', '$29/month');

describe('normalizeWebsiteHtml + lineDiff (F3 done-when)', () => {
  it('produces no diff for a cosmetic-only change (cookie banner, footer year, session script)', () => {
    const before = normalizeWebsiteHtml(PRICING_PAGE_BEFORE, 'https://acme.example/pricing');
    const after = normalizeWebsiteHtml(
      PRICING_PAGE_COSMETIC_CHANGE,
      'https://acme.example/pricing',
    );
    expect(lineDiff(before, after).hasChange).toBe(false);
  });

  it('produces a diff for a real content change (a price)', () => {
    const before = normalizeWebsiteHtml(PRICING_PAGE_BEFORE, 'https://acme.example/pricing');
    const after = normalizeWebsiteHtml(PRICING_PAGE_REAL_CHANGE, 'https://acme.example/pricing');
    const diff = lineDiff(before, after);
    expect(diff.hasChange).toBe(true);
    expect(diff.addedLines.some((l) => l.includes('$29'))).toBe(true);
    expect(diff.removedLines.some((l) => l.includes('$19'))).toBe(true);
  });

  it('strips nav/footer/script/cookie-banner noise entirely', () => {
    const normalized = normalizeWebsiteHtml(PRICING_PAGE_BEFORE, 'https://acme.example/pricing');
    expect(normalized.text).not.toContain('sessionId');
    expect(normalized.text).not.toContain('cookies');
    expect(normalized.text).not.toContain('Home | Pricing | Docs');
  });

  it('keeps the actual page content', () => {
    const normalized = normalizeWebsiteHtml(PRICING_PAGE_BEFORE, 'https://acme.example/pricing');
    expect(normalized.text).toContain('Standard');
    expect(normalized.text).toContain('$19/month');
    expect(normalized.text).toContain('Pro');
  });
});
