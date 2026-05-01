import { describe, it, expect } from 'vitest';
import { stripJsonFences } from '@/lib/ai/client';

describe('stripJsonFences', () => {
  it('passes through plain JSON unchanged', () => {
    const json = '{"key": "value"}';
    expect(stripJsonFences(json)).toBe(json);
  });

  it('strips ```json ... ``` fences', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(stripJsonFences(input)).toBe('{"key": "value"}');
  });

  it('strips ``` ... ``` fences without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(stripJsonFences(input)).toBe('{"key": "value"}');
  });

  it('trims surrounding whitespace from fenced content', () => {
    const input = '```json\n  {"key": "value"}  \n```';
    expect(stripJsonFences(input)).toBe('{"key": "value"}');
  });

  it('trims whitespace from plain JSON', () => {
    expect(stripJsonFences('  {"key": "value"}  ')).toBe('{"key": "value"}');
  });

  it('handles multi-line JSON inside fences', () => {
    const inner = '{\n  "a": 1,\n  "b": 2\n}';
    const input = `\`\`\`json\n${inner}\n\`\`\``;
    expect(stripJsonFences(input)).toBe(inner);
  });

  it('returns empty string for empty fences', () => {
    expect(stripJsonFences('```json\n```')).toBe('');
  });

  it('returns plain text unchanged when no fences present', () => {
    expect(stripJsonFences('just some text')).toBe('just some text');
  });

  it('does not strip partial or unclosed fences', () => {
    const input = '```json\n{"key": "value"}';
    // No closing fence — returned as-is (trimmed)
    expect(stripJsonFences(input)).toBe(input.trim());
  });
});
