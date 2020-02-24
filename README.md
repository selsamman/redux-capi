# redux-capi

Redux-capi is alternative to react-redux.  It allows you to packages up actions, selectors and thunks as an API designed to be consumed by React components. Unlike the HOC pattern (connect) or hooks, your API is fully independent of any particular component.  A component may consume all or part of the API. 
### Consuming an API
To consume the API you invoke it and unpack any of the selectors, thunks or actions you may need.  This is generally done at the top of your render method when using classes or at the top of the function for function-based components:
 ```
 const { todo, completeTodo, deleteTodo, updateTodo } = todoAPI({todoId: props.id});
```
redux-capi automatically re-renders the component when the value of any selectors that you reference changes because of a state mutation. You may also supply additional properties (id: props.id) as context that the API may use in redactions, thunks or selectors.  The context is specific to the component instance.
### Redactions
For mutating state you don't need reducers because the actions themselves contain meta information that is used by a master reducer.  In effect that are combination of an action and a reducer and are called redactions:

```
  editTodo: (text) => ({
    todos: {
      where: (state, item, {todoId}) => item.id === todoId,
      set: (item) => ({...item, text}),
    }
  }),
```
Redactions are exposed in the api as functions that are self-dispatching.  The meta-information defines a heirarchy of state properties that follow the shape of the state.  The properties to be modified are indicated by defining and action object (containing where and set in the example) that can define which element of an array is to be mutated and the new value.  

### Component Context

Because APIs are designed to be consumed by a component they maintain a per-component-instance context.  That context is made available to thunks and selectors so that thunks can consume selectors and actions.  Selectors may also consume other selectors.  

In addition the component may add property values to the context that selectors, redactions and thunks can use.  In the example above for editing a todoList item, the where function qualifies which todo is to be modified.  It is passed the state, the specific todo item and the api context:
```
  where: (state, item, {todoId}) => item.id === todoId,
``` 
todoId is a property of the context that is expected to be added at the time the api is consumed by the component:
```
 const { todo, completeTodo, deleteTodo, updateTodo } = todoAPI({todoId: props.id});
```
### Selectors
This is particularly important for selectors which cannot accept parameters.  So for example to select the "current" todo the selector can use the id from the context:
```
 todo: (state, api) => state.todos.find(t => t.id === api.todoId)
```
### Memoizing Selectors
You would not want to invoke the find function everytime the selector is referenced since the todoList may not have changed.  To memoize the selector two functions are needed.  The first is the "invoker" which is passed the memoized selector, the api and the state.  It simply invokes the memomized selector to do the actual work.  The second is the selector which will automatically be memoized.  With this arrangement you can memoize any values such as from the state or from other selectors.
```
 todo: [
    (select, api) => select(api.todoId, api.todos),
    (id, todos) => todos.find(t => t.id === id)
  ],

```
### Thunks
Thunks in redux-capi use redux-thunk but are wrapped such that they have access to both api context and the state.  This makes it easy to access selectors, redactions and other thunks:
```
  updateTodo: ({deleteTodo, editTodo}) => (text) => {
    if (text.length === 0) {
      deleteTodo()
    } else {
      editTodo(text)
    }
  }
```
### Creating an API
The API consists of redactions, actions and thunks which are bound together to form the API
```
const todoRedactions = {
  editTodo: (text) => ({
    todos: {
      where: (state, item, {todoId}) => item.id === todoId,
      set: (item) => ({...item, text}),
    }
  })
}
const todoThunks = {
  updateTodo: ({deleteTodo, editTodo}) => (text) => {
    if (text.length === 0) {
      deleteTodo()
    } else {
      editTodo(text)
    }
  }
}
const todoSelectors = {
 todo: [
    (select, api) => select(api.todoId, api.todos),
    (id, todos) => todos.find(t => t.id === id)
  ],
}
const todoAPI = createAPI({
  redactions: todoRedactions,
  selectors: todoSelectors,
  thunks: todoThunks
})

```
Before you can use the api it needs to be mounted into the store:
```
const initialState = {
  todos: []
  todoFilter: SHOW_ALL  
}

const store = createStore(reducer, initialState, applyMiddleware(ReduxThunk))
todoAPI.mount(store);
```
You don't necessarily need to mount the API at the root of your state.  
You might, for example, want to keep all of the data that is to be persisted in one slice of the state and the data is transient in another. So your state shape would look like:
```
const initialState = {
  data: {
    todos: []
  },
  app: {
    todoFilter: SHOW_ALL
  }  
}
``` 
This can be done with a map when you mount the api:
```
todoAPI.mount(store, {todos: {data: {}}, todoFilter: {app: {}})
```
To avoid having to map every single element of your state it is best to group your state as data and app to start with and then all of the properties can be mounted to where ever the consuming app wants to place the persistent data.
## Composition
There are times you want to compose APIs.  For example if you have an API that handles a single todo list you can easily extend it to handle multiple todo lists.  Let's say your multiple todo list state looks like this:
```
const initialState = {
  lists: [
    {
      todos: []
      todoFilter: SHOW_ALL
    }
  ],
  currentListIndex: 0  
}
```
You need one more redaction to manage the current list:
```
const todoListRedactions = {
  setList: (listIx) => ({
    currentListIndex: {set: () => listIx}
  })
}
```  
Then you can compose your API by adding that new redaction and mouting the single todoList API into the multiple todolist state shape:
```  
const todoAPI = createAPI([
  {
    redactions: todoListRedactions,
  },
  {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,
    mount: {
      todos: {
        lists: {
          where (state, list, ix) => ix === state.currentListIndex
        }
      }
      todoFilter: {
        lists: {
          where (state, list, ix) => ix === state.currentListIndex
        }
      }
    }
  }
])
```
The previous example showed composing at the same level - that is the setList is at the same level as all of the other redactions, thunks and selectors.  You can also position them 
```
const composedAPI = createAPI({
  todoListAPI: {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,     
  }, {
    redactions: rootRedactions,
    selectors: rootSelectors,
    thunks: rootThunks, 
  }
]);
```
Now you would use the API like this:
```
const {todoListAPI, root1, root2 } = composedAPI({todoAPI: {todoId: props.id}});
const { todo, completeTodo, deleteTodo, updateTodo } = todoListAPI;
```
In this example there would be little benefit to composing these two APIs.  If, however, one API needed to reference another within it's thunks this would make it possible:
```
    rootThunk: (api) => (text) => api.todoList.add(text)
```
## Rationale
When redux was integrated into React with redux-react the primary integration vehicle was the High Order Component (HOC) which was "connected" to the redux store.  As part of that connection actions and selectors were pushed into properterties and these properties fed to the lower order component.  With the advent of hooks this concept became inoperative and instead selectors and dispatchable actions were defined within the actual visual component.  In doing so this increased the coupling between "logic" and visual rendering.

redux-capi fully isolates logic from visual rendering.  And unlike HOCs which are bound to their lower level component they can be reused.  The API may contain the complete logic surrounding a subject area and be consumed by many different components each of which may consume only the portion that they need. The magic to making this work is that the selectors are in fact getters.  This allows the framework to track which selectors are used by which component and only force a re-render of the affected component.

### Component State

Components often have logic that manages data local to that component.  An entirely different paradigm is used where one has to choose whether to represent the data as part of the component state so that changes will trigger a re-render or as component member variables such that changes won't always trigger a rerender. Any change to the component's state triggers a render.  When using component functions there are no classes and no member variables so one has to use the useRef to represent component data that should not force a re-render.

Since redux-capi already has a selector-based mechanism to determine when a re-render needs to occur, we can use that in conjunction with the component context to build reusable pieces of logic that present data to components via selectors.  This is done by simply having thunks that modify the component context and selectors that use input from the component context.

### API Composition and Mounting other than in the root pending implementation ###

