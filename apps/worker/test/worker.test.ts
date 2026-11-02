import { describe, it, expect } from 'vitest';
import { defaultQueue, backgroundWorker } from '../src/index.js';

describe('Background Worker & Queue Configuration', () => {
  it('initializes default queue with correct name', () => {
    expect(defaultQueue.name).toBe('ai-qa-jobs');
  });

  it('initializes background worker on the correct queue', () => {
    expect(backgroundWorker.name).toBe('ai-qa-jobs');
  });
});
