import { render } from '@testing-library/react';

import App from '../src/app';
import { describe, it, expect } from 'vitest';
import React from 'react';

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should render the bridge game', () => {
    const { getByText } = render(<App />);
    expect(getByText(/Bridge Game/gi)).toBeTruthy();
  });
});
