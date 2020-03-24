---
id: spec
title: API specification
sidebar_label: API Spec
---
APIs are defined by a specification that uses JSON to define redactions, selectors and thunks.  You may define them all together or split them apart depending on how complex your API is.
```javascript
import { createAPI} from 'redux-capi';
const MyAPISpec = {
    redactions: redactions definitions ...,
    selectors: selector definitions ...,
    thunks: thunk definitions ...
}
export const myAPI = createAPI(MyAPISpec)
```
### Results of API
Every property you define under redactions, selectors and thunks results in a property in the final API once it is used in a component or test.  

***Redactions*** result in self-dispatching functions that are dispatched using the standard redux dispatch from the store

***Selectors*** result in properties that have the selected value.  

***Thunks*** result in functions that use the redux-thunk mechanism but are wrapped to provide the context
### Breaking the Apec into Smaller Pieces
Because the context is passed to most functions in the spec there is no need for functions to reference the spec itself.  Instead they reference the results of the API just as a component would reference them.  This means that you can define them in multiple files and group them together in whatever way makes sense for the logic of your API.
### Combining the Pieces with Arrays
You can combine subject areas like this:
```
const part1 = {
    redactions: some redactions ...
    thunks: some thunks ...
}     
const part2 = {
    redactions: some more redactions ...
    selectors: some selectors ...
}
myAPI = createAPI([part1, part2])     

