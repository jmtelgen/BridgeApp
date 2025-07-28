import { render } from '@testing-library/react';

import HomeComponent from './HomeComponent';

describe('HomeComponent', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<HomeComponent />);
    expect(baseElement).toBeTruthy();
  });
});
