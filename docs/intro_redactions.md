---
id: intro_redactions
title: Redactions - Self Reducing Actions
sidebar_label: Redactions
---
## Redactions

React depends on immutability to accurately determine what needs to be re-rendered state must be managed in that fashion.  Redux is the most popular library for managing this and is based on the action/reducer model.  The action defines what is to be done and supplies data parameters and the reducer delivers a new instance of the state with just the properties that need to be mutated replaced.

Rather than write a reducer for each action, redux-capi comes with a generic reducer what will produce a new state based on graph of what properties need to be modified.  This graph is called the action schema and is simply an object with properties that match nested state properties to indicate which property is to be mutated.  Each action defines the schema and the parameters for that action.  
### set: Mutate a single property
Here is an action that mutates a single property

```
increment: (amount) => ({
    count: {
        set: (state) => state.count + amount
    }
})
```
This will create a self-dispatching action function as part of the API that is passed a parameter (amount).  The schema specifies one property (count) that is to be mutated and provides mutation function (set) that is passed the state and is expected to return a new value for that one property (count).
### assign: Mutating individual properties
The schema is a hierarchy so if your state shape actually had a count property that was contained in an object (gizmo) it would like like this:
```
set: (amount) => ({
    gizmo: {
        count: {
            set: (state) => state.count + amount
        }
    }
})
### append: Adding an element to an array
```
There are also functions for mutating arrays such as appending an element:
```
addTodo: (text) => ({
    todos: {
      append: (state) => ({text, completed: false}),
    },
})
```
### Mutating multiple properties in a single action
One can also have multiple mutations take place for a single action.  Imagine that you want to have an ID value that needs to be incremented when you add a todo:
```
addTodo: (text) => ({
    nextId: {
      set: (state) => state.nextId +1
    },
    todos: {
      append: (state) => ({text, completed: false, id: state.nextId}),
    },
})
```
### insert: Inserting into an array
There are functions for inserting both before and after a point in an array given the index:
```
insertBefore: (text, position) => ({
    todos: {
      before: () => position,
      insert: (state) => ({text, completed: false}),
    },
})
insertafter: (text, position) => ({
    todos: {
      after: () => position,
      insert: (state) => ({text, completed: false}),
    },
})
```
### where: modifying a particular element of an array
To modify one particular element of an array you need to decide what element is to be changed using the where: function:
````
 editTodo: (text, id) => ({
    todos: {
      where: (state, item, ix) => item.id === id,
      assign: (state, item) => ({text: text}),
    }
  }),
````
The where funciton is passed the state, the particular array item and array's index.
### multiple levels of arrays.
Sometimes you have multiple levels of an array (a matrix for example) and in that case you can select a particular element using where and then continue the hierarchy using select
```
setValue: (row, col, value) => ({
    where: (state, item, ix) => ix === row,
    select: {
        where: (state, item, ix) => ix === col,
        set: () => value
    }
}),
```

