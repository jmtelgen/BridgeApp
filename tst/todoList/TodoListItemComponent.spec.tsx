import { render } from '@testing-library/react';

import TodoListItemComponent from './TodoListItemComponent';

describe('TodoListItemComponent', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<TodoListItemComponent />);
    expect(baseElement).toBeTruthy();
  });
});
