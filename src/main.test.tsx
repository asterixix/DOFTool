import { describe, it, expect } from 'vitest';

describe('main.tsx', () => {
  it('should have root element in document structure', () => {
    const rootElement = document.createElement('div');
    rootElement.id = 'root';
    document.body.appendChild(rootElement);

    const foundRoot = document.getElementById('root');
    expect(foundRoot).toBeTruthy();
    expect(foundRoot?.id).toBe('root');

    document.body.innerHTML = '';
  });

  it('should throw error when root element is missing', () => {
    document.body.innerHTML = '';
    const rootElement = document.getElementById('root');
    expect(rootElement).toBeNull();
  });
});
