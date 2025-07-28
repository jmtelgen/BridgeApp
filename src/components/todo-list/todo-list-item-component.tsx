import { Badge, ListGroup, ListGroupItem, FormCheck } from 'react-bootstrap';
import useItem, { Status, useChecked } from '../../state-management/todo-list-store';
import { FC, ReactElement } from 'react';

type itemProps = {
  id: number
}

function statusColor(status: Status): ReactElement {
  switch(status) {
    case Status.INCOMPLETE: 
      return (
        <Badge bg="danger" pill>Incomplete</Badge>
      );
    case Status.COMPLETE:
      return (
        <Badge bg="success" pill>Complete</Badge>
      );
    case Status.IN_PROGRESS:
      return (
        <Badge bg="warning" pill>In Progress</Badge>
      );
  }
}

const TodoListItemComponent: FC<itemProps> = ({id}): ReactElement => {
  const item = useItem((state) => state.items[id]);
  const checked = useChecked();
  return (
    <ListGroup>
      <ListGroupItem className="d-flex justify-content-between align-items-start" key={`${item.id}`}>
        <FormCheck type={'radio'} name="todo item" id={`listItem${item.id}`} key={`${item.id}`} aria-label={`radio button ${item.id}`} onClick={() => checked.checkItem(item.id)}/>
        <div className="ms-2 me-auto">
          <div className="fw-bold text-start">{item.title}</div>
          <div className="text-start">{item.description}</div>
          <div className="text-start">
            {item.date}, {item.time}
          </div>
        </div>
        {statusColor(item.status)}
      </ListGroupItem>
    </ListGroup>
  );
}

export default TodoListItemComponent;
