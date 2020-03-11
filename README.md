# redux-capi

Redux-capi is alternative to react-redux.  It allows you to packages up actions, selectors and thunks as an API designed to be consumed by React components. Unlike the HOC pattern (connect) or hooks, your API is fully independent of any particular component.  A component may consume all or part of the API. 
### Consuming an API
To consume the API you invoke it and unpack any of the selectors, thunks or actions you may need.  This is generally done at the top of your render method when using classes or at the top of the function for function-based components:
 ```
 const { todo, deleteTodo, updateTodo } = todoAPI({todoId: props.id});
```
redux-capi automatically re-renders the component when the value of any selectors that you reference change due to a state mutation. You may also supply additional properties (id: props.id) as context that the API may use in redactions, thunks or selectors.  The context is specific to the component instance.
### Redactions
For mutating state you don't need reducers because the actions themselves contain meta information that is used by a master reducer.  In effect that are combination of an action and a reducer and are called redactions:

```
  editTodo: (text) => ({
    todos: [
      (state, item, {todoId}) => item.id === todoId,
      {set: (item) => ({...item, text})},
    ]
  }),
```
Redactions are exposed in the api as functions that are self-dispatching.  The meta-information defines a heirarchy of state properties that follow the shape of the state.  For the properties to be modified you provide functions which can select a particular array element to be mutated and provide values.  Other meta indicators are used for deletion, insertion and appending data.  Under the covers this is all accomplished with a reducer.  

### Component Context

Because APIs are designed to be consumed by a component they maintain a per-component-instance context.  That context is made available to thunks and selectors so that thunks can consume selectors and redactions.  Selectors may also consume other selectors.  

In addition the component may set property values in the context that selectors, redactions and thunks can use.  In the example above for editing a todoList item, the array reference in the redaction qualifies which todo is to be modified.  It is passed the state, the specific todo item and the api context so it can select the current todo item relavent to a component instance:
```
  [(state, item, {todoId}) => item.id === todoId]
``` 
todoId is a property of the context that is expected to be added at the time the api is consumed by that component:
```
 const { todo, deleteTodo, updateTodo } = todoAPI({todoId: props.id});
```
### Selectors
Providing context properties is particularly important for selectors which cannot accept parameters.  It is what allows the selectors to be defined outside of a component.  So for example to select the "current" todo the selector can use the id from the context:
```
 todo: (state, api) => state.todos.find(t => t.id === api.todoId)
```
### Memoizing Selectors
You would not want to invoke the find function every time the selector is referenced since the todoList may not have changed.  To memoize the selector two functions are needed.  The first is the "invoker" which is passed the memoized selector, the api and the state.  It simply invokes the memomized selector to do the actual work.  The second is the selector which will automatically be memoized.  With this arrangement you can memoize based any values such as from the state or from other selectors.  You can even memoize based on values from the context itself.
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
    todos: [
      (state, item, {todoId}) => item.id === todoId,
      {
        set: (item) => ({...item, text}
      ),
    ]
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
You don't necessarily need to mount the API at the root of your state.  You might have a complex state and want to mount each api at a different portion of the state. So your state shape would look like:
```
const initialState = {
  timeManagement:  {
    todos: [],
    todoFilter: SHOW_ALL
  }  
}
``` 
This can be done with a map when you mount the api:
```
workTodos.mount(store, {timeManagement: true});
```
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
Then you can compose your API by adding that new redaction and mounting the single todoList API into the multiple todolist state shape:
```  
const todoAPI = createAPI([
  {
    redactions: todoListRedactions,  // To choose which todoList
  },
  {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,
    mount: {
      lists: [
          (state, list, ix) => ix === state.currentListIndex
      ]
    }
  }
])
```
Sometimes when composing complex apis you might have more than one instance an api that you need to refer to separately in the api.  For example if you had home todos and work todos you would need to distinguish which thunks, selectors and redactions apply to which todoList.  Assume the state structure is:
```
const initialState = {
  homeTodos: {
      todos: []
      todoFilter: SHOW_ALL
  }
  workTodos: {
      todos: []
      todoFilter: SHOW_ALL
  }
}
```
Now you would create an api that included two sets of the todoList api spec.  By using the api property you are saying that you would each spec on a different api property (home or work) 
```
const composedAPI = createAPI([
  {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,
    api: 'home',
    mount: {homeTodos: true}     
  }, {
   redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,
    api: 'work',
    mount: {workTodos: true}     
  }
]);
```
Now you would use the API to reference the home todos like this:
```
const {home} = composedAPI({home: {todoId: props.id}});
const { todo, completeTodo, deleteTodo, updateTodo } = home;
```

## Rationale
When redux was integrated into React with redux-react the primary integration vehicle was the High Order Component (HOC) which was "connected" to the redux store.  As part of that connection actions and selectors were pushed into properterties and these properties fed to the lower order component.  With the advent of hooks this concept became inoperative and instead selectors and dispatchable actions were defined within the actual visual component.  In doing so this increased the coupling between "logic" and visual rendering.

redux-capi fully isolates logic from visual rendering.  And unlike HOCs which are bound to their lower level component they can be reused.  The API may contain the complete logic surrounding a subject area and be consumed by many different components each of which may consume only the portion that they need. The magic to making this work is that the selectors are in fact getters.  This allows the framework to track which selectors are used by which component and only force a re-render of the affected component.

### Component State

Components often have logic that manages data local to that component.  An entirely different paradigm is used where one has to choose whether to represent the data as part of the component state so that changes will trigger a re-render or as component member variables such that changes won't always trigger a rerender. Any change to the component's state triggers a render.  When using component functions there are no classes and no member variables so one has to use the useRef to represent component data that should not force a re-render.

Since redux-capi already has a selector-based mechanism to determine when a re-render needs to occur, we can use that in conjunction with the component context to build reusable pieces of logic that present data to components via selectors.  This is done by simply having thunks that modify the component context and selectors that use input from the component context.

### API Composition and Mounting other than in the root pending implementation ###

## Unit Testing 
Because there is a clean line between visual components and your api you test these separately.  You make sure that your api responds property all redaction and thunk calls and that all selectors return the appropriate value.  With that done you only need to test that your component renders properly based on API selector values and that it calls the appropriate thunks and mutations with the correct values passed.

###API Testing
There are two strategies for testing the API:
* If your API is simple enough you can test only it's inputs and outputs (e.g. redactions, thunks and selectors).
* If your API is complex you may want to test how thunks and redactions affect the state and how selectors transform information that you manually put in the state.

You test the API the way that it would be used in a component:

```
const apiSpec = {
    redactions: {
        increment: () => ({
            count: {set: (state) => state.count + 1}
        })
    },
    selectors: {
        count: (state) => state.count
    }
}
describe('Counter Testing', () => {
    it('can increment', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 0}));
        const component = {};
        {
            const {increment} = api({}, component);
            increment();
            expect(api.getState().count).toBe(1);
        } {
            const {count} = api({}, component);
            expect(count).toBe(1);
        }
    })
});
```
### Component Testing
For React you can use react-test-renderer/shallow (or other libraries) to render components and test them. A mock facility is provied that will:
* Let you provide values for all selectors in the api
* Record the the fact that redactions and thunks were called along with the argument values.

With that you can setup test values for you component (much the same you used to be able to do with High Order Components) and then examine the rendered structure to verify the results.  You can click on buttons or otherwise cause events to be dispatched that will ulimately result in a call to a thunk or a redaction and then verify the results:
```
describe('Counter Component Testing', () => {
    it('render', () => {
        const api = createAPI(apiSpec);
        let mock = api.mock({count: 34});
        const Counter = () => {
            const {count, increment} = api({});
            return (
                <button onClick={()=>increment(2)}>{count}</button>
            )
        }
        renderer.render(<Counter />);
        const output = renderer.getRenderOutput();
        expect(output.props.children).toBe(34);
        output.props.onClick({});
        expect(mock.increment.calls[0][0]).toBe(2);
        api.unmock();
    })
})
``` 


