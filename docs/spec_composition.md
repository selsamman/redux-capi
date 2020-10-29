---
id: spec_composition
title: Composing API Specs
sidebar_label: Composing
---
There are times when you want to compose an API spec from other specs.  The challange in combining specs is to:
* Apply the spec to a specific part of the state shape
* Making sure you don't have naming conflicts in the API itself.

The array form of the spec offers the ability to address both of these issues.  First you can include a spec in another spec and establish a mount point for it.
```
const todoAPI = {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks,
}
const composedAPI = createAPI(
[
  {
    ...todoAPI,
    api: 'home',
    mount: {homeTodos: true}     
  }, {
    ...todoAPI,
    api: 'work',
    mount: {workTodos: true}     
  }
]
);
```
Here we have the same todoList api that is used for a work list and a home list.  Each will be mounted to a separate state property (homeTodos and workTodos) and within the API itself there needs to be a separate set of redactions each of which is available on it's own propertery (home and work).
  
  In the API you would access each like this
```
const {work, home} = composedAPI();
work.addItem("Foo")
home.addItem("Bar");
```

Remember that in most cases it is better to just create separate APIs and if this was all there was to the combined APIs that would probably be the better option.  However they may be cases where logic, maybe even in the API itself needs access to both specs and that case you can use the api property as in this example.   

In case you need to include multiple specs and apply them to a single API property and mount point you can use the spec property as in:
```
const composedAPI = createAPI([
  {
    spec: [normalTodoAPI, extendedTodoAPI],
    api: 'home',
    mount: {homeTodos: true}     
  }
]);
```

Another popular use case is to structure your APIs such that they are not aware of their containment structure and then mount them into the appropriate part of the data structure.  Often this may be with arrays.  For example assume you have a data structure as follows:
```
{
	cards: [
        {
            workouts: [
                {excercise: "pec press", reps: 7}
            ],
            workoutIx: 0
        }
    ]
	cardIx: 0,
}
```
You might have a workout API that does not need no know it is part of a collection of workouts embedded in a gym card and as such only processes one workout at a time.  You might mount that like this:
```
const composedAPI = createAPI([
  {
    spec: [workoutAPISpec],
    mount: {
        cards: {
            where: (state, item, ix) => ix === state.cardIx,
            select: {
                workouts: {
                    where: (state, item, ix) =>
                           { return ix === state.cards[state.cardIx].workoutIx }
                }
            }
        }
    }
  }
])
```


