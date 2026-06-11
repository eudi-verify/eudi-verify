import { describe, it, expect } from 'vitest';
import { VERSION } from './index.js';

describe('@eudi-verify/server', () => {
  it('exports a VERSION constant', () => {
    expect(VERSION).toBe('0.0.0');
  });
});
