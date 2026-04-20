// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useUIStore } from '@/store/uiStore';
import { act } from '@testing-library/react';

beforeEach(() => {
  // Reset store to defaults before each test
  act(() => {
    useUIStore.setState({ theme: 'light', language: 'en' });
  });
  localStorage.clear();
});

describe('useUIStore', () => {
  it('starts with light theme and English', () => {
    const { theme, language } = useUIStore.getState();
    expect(theme).toBe('light');
    expect(language).toBe('en');
  });

  it('toggles theme to dark', () => {
    act(() => {
      useUIStore.getState().setTheme('dark');
    });
    expect(useUIStore.getState().theme).toBe('dark');
  });

  it('toggles theme back to light', () => {
    act(() => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setTheme('light');
    });
    expect(useUIStore.getState().theme).toBe('light');
  });

  it('switches language to nl', () => {
    act(() => {
      useUIStore.getState().setLanguage('nl');
    });
    expect(useUIStore.getState().language).toBe('nl');
  });

  it('switches language back to en', () => {
    act(() => {
      useUIStore.getState().setLanguage('nl');
      useUIStore.getState().setLanguage('en');
    });
    expect(useUIStore.getState().language).toBe('en');
  });

  it('persists preferences in localStorage under ui-preferences', () => {
    act(() => {
      useUIStore.getState().setTheme('dark');
      useUIStore.getState().setLanguage('nl');
    });
    const stored = JSON.parse(localStorage.getItem('ui-preferences') ?? '{}') as {
      state?: { theme?: string; language?: string };
    };
    expect(stored.state?.theme).toBe('dark');
    expect(stored.state?.language).toBe('nl');
  });
});
