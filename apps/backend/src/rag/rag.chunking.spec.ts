import {
  buildNewsChunkText,
  buildProfileChunkText,
  buildTransactionChunkText,
  chunkText,
} from './rag.chunking';

describe('chunkText', () => {
  it('returns [] for empty or blank text', () => {
    expect(chunkText('')).toEqual([]);
    expect(chunkText('   \n\t  ')).toEqual([]);
  });

  it('returns short text as a single chunk', () => {
    expect(chunkText('One short sentence.')).toEqual(['One short sentence.']);
  });

  it('collapses whitespace', () => {
    expect(chunkText('  Too   much\n  space.  ')).toEqual(['Too much space.']);
  });

  it('splits long text into chunks under the cap', () => {
    const sentences = Array.from(
      { length: 20 },
      (_, i) => `Sentence number ${i + 1} carries a small fact.`,
    );
    const chunks = chunkText(sentences.join(' '), { maxChars: 100 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(100);
    }
    // Every sentence survives somewhere.
    const joined = chunks.join(' ');
    for (const sentence of sentences) {
      expect(joined).toContain(sentence);
    }
  });

  it('does not split a sentence across chunks when it fits', () => {
    const text =
      'First sentence is here. Second sentence follows it. Third one ends.';
    const chunks = chunkText(text, { maxChars: 55, overlapChars: 0 });
    expect(chunks).toEqual([
      'First sentence is here. Second sentence follows it.',
      'Third one ends.',
    ]);
  });

  it('overlaps consecutive chunks so boundary facts survive', () => {
    const text =
      'Alpha beta gamma delta. Epsilon zeta eta theta. Iota kappa lambda mu.';
    const chunks = chunkText(text, { maxChars: 45, overlapChars: 15 });
    expect(chunks).toEqual([
      'Alpha beta gamma delta. Epsilon zeta eta theta.',
      'eta theta. Iota kappa lambda mu.',
    ]);
  });

  it('hard-splits one sentence longer than the cap', () => {
    const long = `Word `.repeat(60).trim();
    const chunks = chunkText(long, { maxChars: 50, overlapChars: 0 });
    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(50);
    }
    expect(chunks.join(' ')).toBe(long);
  });

  it('hard-splits a single word longer than the cap', () => {
    const word = 'x'.repeat(130);
    const chunks = chunkText(word, { maxChars: 50, overlapChars: 0 });
    expect(chunks).toEqual(['x'.repeat(50), 'x'.repeat(50), 'x'.repeat(30)]);
  });

  it('caps the overlap at half the chunk size', () => {
    const text = 'One two three four five six. Seven eight nine ten eleven.';
    const chunks = chunkText(text, { maxChars: 30, overlapChars: 999 });
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(30);
    }
  });
});

describe('chunk text builders', () => {
  it('builds news text from title, publisher and date only', () => {
    expect(
      buildNewsChunkText(
        'Reliance profit jumps 12%',
        'Reuters',
        new Date('2026-11-18T10:00:00Z'),
      ),
    ).toBe('Reliance profit jumps 12%. Source: Reuters. Published: 2026-11-18');
  });

  it('omits missing news metadata', () => {
    expect(buildNewsChunkText('Headline only', null, null)).toBe(
      'Headline only',
    );
  });

  it('builds profile text from name, sector and description', () => {
    expect(
      buildProfileChunkText(
        'Reliance Industries',
        'Energy',
        'Oil & Gas',
        'Operates refineries and retail.',
      ),
    ).toBe(
      'Reliance Industries. Sector: Energy. Industry: Oil & Gas. Operates refineries and retail.',
    );
  });

  it('builds transaction text with direction and amount', () => {
    expect(
      buildTransactionChunkText(
        'Swiggy order',
        'Food & Dining',
        -420.5,
        '2026-11-15',
      ),
    ).toBe('Swiggy order: spent ₹420.50 on Food & Dining on 2026-11-15.');
    expect(
      buildTransactionChunkText('Salary', 'Income', 85000, '2026-11-01'),
    ).toBe('Salary: received ₹85000.00 on Income on 2026-11-01.');
  });
});
