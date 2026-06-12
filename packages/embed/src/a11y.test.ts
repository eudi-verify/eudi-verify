import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getFocusableElements,
  createFocusTrap,
  announce,
  clearAnnouncement,
  STATE_MESSAGES,
  getAnnouncementPriority,
  prefersReducedMotion,
} from './a11y.js';

describe('a11y', () => {
  describe('getFocusableElements', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = document.createElement('div');
      document.body.appendChild(container);
    });

    afterEach(() => {
      container.remove();
    });

    it('returns empty array for empty container', () => {
      expect(getFocusableElements(container)).toEqual([]);
    });

    it('finds buttons', () => {
      container.innerHTML = '<button>Click me</button>';
      const elements = getFocusableElements(container);
      expect(elements).toHaveLength(1);
      expect(elements[0]?.tagName).toBe('BUTTON');
    });

    it('excludes disabled buttons', () => {
      container.innerHTML = '<button disabled>Disabled</button>';
      expect(getFocusableElements(container)).toHaveLength(0);
    });

    it('finds elements with tabindex', () => {
      container.innerHTML = '<div tabindex="0">Focusable</div>';
      const elements = getFocusableElements(container);
      expect(elements).toHaveLength(1);
    });

    it('excludes tabindex="-1"', () => {
      container.innerHTML = '<div tabindex="-1">Not focusable</div>';
      expect(getFocusableElements(container)).toHaveLength(0);
    });

    it('finds links with href', () => {
      container.innerHTML = '<a href="#">Link</a>';
      const elements = getFocusableElements(container);
      expect(elements).toHaveLength(1);
    });

    it('finds multiple focusable elements', () => {
      container.innerHTML = `
        <button>Button 1</button>
        <a href="#">Link</a>
        <button>Button 2</button>
      `;
      expect(getFocusableElements(container)).toHaveLength(3);
    });
  });

  describe('createFocusTrap', () => {
    let container: HTMLElement;
    let deactivate: () => void;

    beforeEach(() => {
      container = document.createElement('div');
      container.innerHTML = `
        <button id="first">First</button>
        <button id="second">Second</button>
        <button id="last">Last</button>
      `;
      document.body.appendChild(container);
    });

    afterEach(() => {
      if (deactivate) deactivate();
      container.remove();
    });

    it('returns a deactivate function', () => {
      deactivate = createFocusTrap(container);
      expect(typeof deactivate).toBe('function');
    });

    it('focuses first element on activation', () => {
      deactivate = createFocusTrap(container);
      expect(document.activeElement?.id).toBe('first');
    });
  });

  describe('announce', () => {
    let liveRegion: HTMLElement;

    beforeEach(() => {
      liveRegion = document.createElement('div');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    });

    afterEach(() => {
      liveRegion.remove();
    });

    it('sets aria-live attribute', () => {
      announce(liveRegion, 'Test message', 'assertive');
      expect(liveRegion.getAttribute('aria-live')).toBe('assertive');
    });
  });

  describe('clearAnnouncement', () => {
    it('clears text content', () => {
      const liveRegion = document.createElement('div');
      liveRegion.textContent = 'Some announcement';

      clearAnnouncement(liveRegion);
      expect(liveRegion.textContent).toBe('');
    });
  });

  describe('STATE_MESSAGES', () => {
    it('has message for all states', () => {
      const states = [
        'idle',
        'loading',
        'showQR',
        'waitingForWallet',
        'verified',
        'rejected',
        'expired',
        'error',
      ] as const;

      for (const state of states) {
        expect(state in STATE_MESSAGES).toBe(true);
      }
    });

    it('idle has empty message', () => {
      expect(STATE_MESSAGES.idle).toBe('');
    });

    it('terminal states have messages', () => {
      expect(STATE_MESSAGES.verified).toBeTruthy();
      expect(STATE_MESSAGES.rejected).toBeTruthy();
      expect(STATE_MESSAGES.expired).toBeTruthy();
      expect(STATE_MESSAGES.error).toBeTruthy();
    });
  });

  describe('getAnnouncementPriority', () => {
    it('returns polite for non-terminal states', () => {
      expect(getAnnouncementPriority('idle')).toBe('polite');
      expect(getAnnouncementPriority('loading')).toBe('polite');
      expect(getAnnouncementPriority('showQR')).toBe('polite');
      expect(getAnnouncementPriority('waitingForWallet')).toBe('polite');
    });

    it('returns assertive for terminal states', () => {
      expect(getAnnouncementPriority('verified')).toBe('assertive');
      expect(getAnnouncementPriority('rejected')).toBe('assertive');
      expect(getAnnouncementPriority('expired')).toBe('assertive');
      expect(getAnnouncementPriority('error')).toBe('assertive');
    });
  });

  describe('prefersReducedMotion', () => {
    it('returns a boolean', () => {
      expect(typeof prefersReducedMotion()).toBe('boolean');
    });
  });
});
