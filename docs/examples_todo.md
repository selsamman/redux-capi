---
id: examples_todo
title: Todo List
sidebar_label: Todo List
---
The classic example for redux is the todo List.  We will go through it and compare it with the standard redux implementation.
# Application Logic for State
In the standard redux implementation you have state-related code in
* The reducers, suplemented by actions and their related constants
* In high order components which implement selectors
## Standard Redux
### Actions
You have the actions:
```
let nextTodoId = 0
export const addTodo = text => ({
  type: 'ADD_TODO',
  id: nextTodoId++,
  text
})

export const setVisibilityFilter = filter => ({
  type: 'SET_VISIBILITY_FILTER',
  filter
})

export const toggleTodo = id => ({
  type: 'TOGGLE_TODO',
  id
}) 
```
Normally you have constants rather than strings for action types but in the interest of brevity the standard example omits that.  It would also be preferable for the nextTodoId to be part of the state so that if the state is persisted you don't lose the high water mark.
### Reducers
The root reducers combines reducers for the todo list and for setting the filter of what todos are to be displayed 
```
export default combineReducers({
  todos,
  visibilityFilter
})
```
You have the reducers for the todo list that supports adding and toggling
```
const todos = (state = [], action) => {
  switch (action.type) {
    case 'ADD_TODO':
      return [
        ...state,
        {
          id: action.id,
          text: action.text,
          completed: false
        }
      ]
    case 'TOGGLE_TODO':
      return state.map(todo =>
        (todo.id === action.id)
          ? {...todo, completed: !todo.completed}
          : todo
      )
    default:
      return state
  }
}
```
and for setting visibility:
```
const visibilityFilter = (state = VisibilityFilters.SHOW_ALL, action) => {
  switch (action.type) {
    case 'SET_VISIBILITY_FILTER':
      return action.filter
    default:
      return state
  }
}
```
### Containers
In standard redux there are two ways to bind redux to your visual components
* In class-based components you have higher order components which use redux connect to bind the state to component properties.  Usually some logic is present such as for selectors
* In function-based components that use hooks the best practice is to have use functions that implement the hooks and return data and functions for manipulating the store.  This is closer to the pattern one would use with redux-capi

The standard implementation has a container for retreiving the todoList which would be   
```
const getVisibleTodos = (todos, filter) => {
  switch (filter) {
    case VisibilityFilters.SHOW_ALL:
      return todos
    case VisibilityFilters.SHOW_COMPLETED:
      return todos.filter(t => t.completed)
    case VisibilityFilters.SHOW_ACTIVE:
      return todos.filter(t => !t.completed)
    default:
      throw new Error('Unknown filter: ' + filter)
  }
}

const mapStateToProps = state => ({
  todos: getVisibleTodos(state.todos, state.visibilityFilter)
})

const mapDispatchToProps = dispatch => ({
  toggleTodo: id => dispatch(toggleTodo(id))
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(TodoList)
```
This contains a selector with the logic for selecting the appropriate todos and a binding to the toggleTodo function.  The connect function takes the TodoList class as a parameter such that it becomes a higher order component for TodoList, called VisibleTodoList which is then used in place of TodoList.

There is also a container for managing the filter buttons that determine which todos will be displayed:
```
const mapStateToProps = (state, ownProps) => ({
  active: ownProps.filter === state.visibilityFilter
})

const mapDispatchToProps = (dispatch, ownProps) => ({
  onClick: () => dispatch(setVisibilityFilter(ownProps.filter))
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Link)
```
It contains a selector to determine if the link should be active (because it represents the current filter criteria) and a binding to the action for setting the current filter.  It becomes a higher order component of Link.
## Redux-capi  
###API
In redux-capi all of the above is reduced to an API specification
```
export const todoAPI = createAPI({
    redactions: todoRedactions,
    selectors: todoSelectors,
})

```
###Redactions
These redactions replace the actions and individual reducers
```
export const todoRedactions = {

    addTodo: (text) => ({
        nextId: {
            set: (state) => state.nextId +1
        },
        todos: {
            append: (state) => ({text, completed: false, id: state.nextId}),
        },
    }),

    toggleTodo: () => ({
        todos: {
            where: (state, item, ix, {id}) => item.id === id,
            assign: (state, todo) => ({completed: !todo.completed}),
        }
    }),

    setVisibilityFilter: (filter) => ({
        visibilityFilter: {
            set: () => filter,
        }
    }),
}
```
Note that in toggleTodo the id of the todo item is espected in the component context and is passed in when the API is used.
###Selectors
The selectors are implemented as part of the API specification rather than in High Order Components.
```
export const todoSelectors = {

    todos: (state) => state.todos,

    visibilityFilter: (state) => state.visibilityFilter,

    todo: [
        (select, {id, todos}) => select(id, todos),
        (id, todos) => todos.find(t => t.id === id)
    ],

    filteredTodos: [
        (select, {visibilityFilter, todos}) => select(visibilityFilter, todos),
        (visibilityFilter, todos) => {
            switch (visibilityFilter) {
                case VisibilityFilters.SHOW_ALL:
                    return todos
                case  VisibilityFilters.SHOW_COMPLETED:
                    return todos.filter(t => t.completed)
                case VisibilityFilters.SHOW_ACTIVE:
                    return todos.filter(t => !t.completed)
                default:
                    throw new Error('Unknown filter: ' + visibilityFilter)
            }
        }
    ],
 }
```
Note that the todo selector selects an individual todo an expects the id to be in the component context. This example uses the longer form of memoized selectors.
### Component Structure
There are no containers and the visual components simply use the parts of the API they need. The visual components are similar in structure but with one key difference.  In the classic redux example the TodoList component iterates through the todos and passes in all of the properties of each todo list item as well as functions it can use for toggling them.
```
const TodoList = ({ todos, toggleTodo }) => (
  <ul>
    {todos.map(todo =>
      <Todo
        key={todo.id}
        {...todo}
        onClick={() => toggleTodo(todo.id)}
      />
    )}
  </ul>
)
```
In the redux-capi version only the id is passed to the Todo child
```
const TodoList = () => {
  const { filteredTodos } = todoAPI();
  return (
    <ul>
      {filteredTodos.map(todo =>
        <Todo
          key={todo.id} id={todo.id}
        />
      )}
    </ul>
  )
}
``` 
The todo item is then responsible for handling all individual todo concerns interacting directly with the API.
```
const Todo = ({ id }) => {
    const {toggleTodo, todo } = todoAPI({id: id});
    return (
      <li
        onClick={toggleTodo}
        style={{
          textDecoration: todo.completed ? 'line-through' : 'none'
        }}
      >
        {todo.text}
      </li>
    )
}
```
The complete source is in the todos sub-project in https://github.com/selsamman/redux-capi-examples
