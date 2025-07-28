/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Button, Col, Container, Form, FormControl, FormGroup, FormLabel, ListGroup, Modal, Row } from 'react-bootstrap';
import TodoListItemComponent from './todo-list-item-component';
import useItem, { Status, useChecked } from '../../state-management/todo-list-store';
import React, { ReactElement, useState } from 'react';
import { Formik } from 'formik';
import * as yup from 'yup';
import moment from 'moment';

export function TodoListComponent() {
  const listState = useItem((state) => state);
  const checked = useChecked();
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const curItem = checked.id === undefined ? undefined : listState.items[checked.id];
  const status = curItem?.status;
  const description = curItem && curItem.description;
  const date = curItem && curItem.date;
  const title = curItem && curItem.title;
  const time = curItem && curItem.time;
  const today = new Date();

  const modalSchema = yup.object().shape({
    Status: yup.string().required(),
    Title: yup.string().required(),
    Date: yup.date()
      .transform(function (value, originalValue) {
        const timezone = (new Date()).getTimezoneOffset();
        const utcDate = new Date(originalValue);
        const result = new Date(utcDate.getTime() + timezone * 60 * 1000);
        console.log(result.getDate(), today.getDate());
        return result;
      })
      .required()
      .test(
        "test-date",
        "Date must be on or after today",
        (value) => value.getFullYear() > today.getFullYear() || value.getMonth() > today.getMonth() || value.getDate() >= today.getDate()
      ),
    Time: yup.string().required()
  })


  function handleAdd(id?: number): void {
    if (id === undefined) {
      handleShow();
      return;
    }
    const element = document.getElementById(`listItem${id}`) as HTMLInputElement;
    element.checked = false;
    checked.unCheckItem();
    handleShow();
  }

  function statusForm(checkStatus: Status, handleChange: (e: React.ChangeEvent<unknown>) => void): ReactElement {
    return (
      <Form.Check
        inline
        type="radio"
        name="Status"
        label={checkStatus}
        value={checkStatus}
        onChange={handleChange}
        id="checkboxInput"
      />
    )
  }
  
  function ModalInput(status?: Status, title?: string, description?: string, date?: string, time?: string): ReactElement {
    const addOrEdit = description === undefined ? "Add" : "Edit";
    const placeholderdate = moment().format("YYYY-MM-DD");
    return (
      <Formik validationSchema={modalSchema} 
        onSubmit={(values) => {
          console.log(values, checked)
          checked.id === undefined ? 
            listState.addItem(values.Title!, values.Status!, values.Date, values.Time!, values.Description) : 
            listState.updateItem(checked.id, values.Status!, values.Date, values.Time!, values.Description);
          handleClose();
        }}
        initialValues={{
          Status: status ?? Status.INCOMPLETE,
          Title: title === undefined ? "" : title,
          Description: description,
          Date: date ?? placeholderdate,
          Time: time ?? "00:00",
        }}
      >
        {({ handleSubmit, handleChange, values, errors, setFieldValue }) => (
          <Form noValidate onSubmit={handleSubmit}>
            <FormGroup hidden={addOrEdit === "Add" ? false : true} className="mb-3" controlId="exampleForm.ControlTextarea1">
              <Form.Label>{addOrEdit} Title</Form.Label>
              <Form.Control
                type="text"
                placeholder={values.Title === "" ? "Todo Title" : ""}
                value={values.Title}
                onChange={handleChange}
                isInvalid={!!errors.Title}
                name="Title"
              />
              <Form.Control.Feedback type="invalid">
                {errors.Title}
              </Form.Control.Feedback>
            </FormGroup>
            <FormGroup>
              <div className='mb-3'>
                <p className='mb-2'>{addOrEdit} Status</p>
                {statusForm(Status.INCOMPLETE, handleChange)}
                {statusForm(Status.IN_PROGRESS, handleChange)}
                {statusForm(Status.COMPLETE, handleChange)}
              </div>
            </FormGroup>
            <FormGroup className="mb-3" controlId="exampleForm.ControlTextarea1">
              <FormLabel>{addOrEdit} Description</FormLabel>
              <FormControl as="textarea" 
                value={values.Description} 
                onChange={handleChange} 
                placeholder={values.Description === undefined ? "Todo description" : ""} 
                rows={2}
                name="Description"
              />
            </FormGroup>
            <FormGroup className="mb-3" controlId="exampleForm.ControlTextarea1">
              <FormLabel>{addOrEdit} Due Date and Time</FormLabel>
              <Row>
                <Col md={4}>
                  <FormControl type="Date" 
                    value={values.Date} 
                    onChange={(e) => setFieldValue('Date', e.target.value)} 
                    name="date"
                    isInvalid={!!errors.Date} />
                  <Form.Control.Feedback type="invalid">
                    {errors.Date}
                  </Form.Control.Feedback>
                </Col>
                <Col md={3}>
                  <FormControl type="time" 
                    value={values.Time} 
                    onChange={(e) => setFieldValue('Time', e.target.value)} 
                    name="time"
                    isInvalid={!!errors.Time} />
                  <Form.Control.Feedback type="invalid">
                    {errors.Time}
                  </Form.Control.Feedback>
                </Col>
              </Row>
            </FormGroup>
            <Row className="d-flex justify-content-end">
              <Col md="auto">
                <Button variant="secondary" onClick={handleClose}>Close</Button>
              </Col>
              <Col md="auto">
                <Button variant="primary" type='submit'>Save changes</Button>
              </Col>
            </Row>
          </Form>
        )}
      </Formik>
    );
  }

  return (
    <>
      <Container className='pt-5'>
        <Row className="justify-content-md-center text-center">
          <Col md="8">
            <h1 className='pb-3'>Welcome to your todo list!</h1>
            <ListGroup>
              {listState.items.map((item) => 
                <TodoListItemComponent id={item.id}/>
              )}
            </ListGroup>
          </Col>
        </Row>
      </Container>
      <Container className='pt-5'>
        <Row className="justify-content-md-center">
          <Col md="auto">
            <Button className='align-items-center' onClick={handleShow} disabled={!checked.checked}>Edit Item</Button>
          </Col>
          <Col md="auto">
            <Button className='align-items-center' onClick={() => handleAdd(checked.id)}>Add Item</Button>
          </Col>
        </Row>
      </Container>
      <Modal show={show} onHide={handleClose} size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Dialog className='mb-0 mt-0 w-100'>
          <Modal.Header closeButton>
            <Modal.Title>{status === undefined ? "Add Item" : "Edit Item"}</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            {ModalInput(status, title, description, date, time)}
          </Modal.Body>
        </Modal.Dialog>
      </Modal>
    </>
  );
}

export default TodoListComponent;
