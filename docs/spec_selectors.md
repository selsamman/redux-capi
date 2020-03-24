---
id: spec_selectors
title: Selectors
sidebar_label: Selectors
---
Selectors are the only vehicle for providing data to components via the API.  A selector is a function that extracts data from the state and returns it to the consumer of the API.  Selectors may also be used within the API implementation in thunks and within other selectors.

Selectors are implemented as getters so that:
 * The component is only re-rendered when the specifically used selectors change value.
 * The selector is only invoked if the component needs the value
 
 Selectors come in two varaieties:
 
 * Simple selectors just return values based on the state. 
 * Memoized selectors remember their last value which is only recomputed if dependent values change
 
 ### Simple Selectors
 ```
property_name: (state, context) => (return value)
``` 
The arguments are:
 * **state** the previous state of the particular state property
 * **context** the context from which context properties can be extracted
The selector need only return the value. 
### Memoized Selectors
```
property_name: [
    (select, context) => select(dependent values),
    (dependent values) => (return value)
]
```
If the selector is an array:
* The first function is passed a *select* function and the context.  It is expected to call the select function passing it any dependent values based on the context.  Usually this would be the value of other selectors or properties of the context that are injected when the API is used.
* The second function is only called when the dependent values change.  It is expected to return the value of the selector.  The value is saved along with the values of the dependent values in order to prevent this function being called unless the dependent values change

For example:
```
todo: [
    (select, {todoId, todos}) => select(todoId, todos),
    (id, todos) => todos.find(t => t.id === id)
],
todos:  (state) => state.todos,
```
The **todo** item selector has two dependent values
* **todoId** is an example of a context property injected when the consuming component calls the API as in ```const {todo} = todoAPI({todoId: props.todoId})```
* **todos** is a simple selector for the todo list itself
The first function calls the **select** function that it is passed as an argument and passes the two dependent values into that function
The second function is the actual selector and it bases it's result from the dependent values that it is passed.
This mechanism provides equivalent functionality to the reselect library in redux.
