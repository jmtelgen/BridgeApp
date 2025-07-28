import { render } from '@testing-library/react';

import TodoListComponent from '../../src/app/todoList/todoListComponent';

describe('TodoListComponent', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<TodoListComponent />);
    expect(baseElement).toBeTruthy();
  });
});
