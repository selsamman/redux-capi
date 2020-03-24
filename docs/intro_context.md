---
id: intro_context
title: Component Context
sidebar_label: Context
---
Because APIs are designed to be consumed by a component they maintain a per-component-instance context. The context contains:
 
 * Previous values of selectors that redux-api uses to know whether or not the component needs to re-render. Getters are used so only the referenced selectors force a render.
 * Properties injected into the context by the component that can be used by redactions, thunks and selectors and act as API per-instance parameters.  

Properties may be added to the context when the API is reference in the component render or function.  Take the example of editing a todoList item.  The component that does the editing is likely to be passed the id of the todo item as a property.  It needs to receive the value of the current todo item in a selector and it needs to change the value of the current todo item based on this property.  The API can expect this id as a property, since it is injected when the API is invoked:
```
 const TodoItem = ({id}) => {
    const { todo, updateTodo } = todoAPI({todoId: id});
    return (
        <TodoTextInput onSave={updateTodo}>
            {todo.text}
        </TodoTextInput>
    )
 }
```
The todo selector can then refer to the context parameter to deliver the correct todo:
```
todo:  (state, {todoId}) => state.todos.find(t => t.id === todoId)
```
The second parameter passed to the selector is the context from which the **todoId** can be extracted.

Note that in the real world you would use a memo selector pattern:
```
todo: [
    (select, {todoId, todos}) => select(todoId, todos),
    (id, todos) => todos.find(t => t.id === id)
],
todos:  (state) => state.todos,
```
Here the first function creates the memo using the todo selector and todoId extracted from the context.

Similarly redactions can use the parameterized id to update the appropriate todoItem
```
 updateTodo: (todo) => ({
    todos: {
      where: (state, item, ix, {todoId}) => item.id === todoId,
      assign: (state, item) => (todo),
    }
  }),
```
And of course thunks are passed the context as well and can use properties added to the context.


