---
id: reference_createAPI
title: createAPI
sidebar_label: createAPI
---
createAPI is used to transform a spec into an API.
```
apiFunction = createAPI(apiSpec);
```
It processes all of the redactions, thunks and selectors, creating an API context object that contains:
* functions for each redaction that call the dispatch function which will be obtained from the store once the API is mounted
* getters for each selector that will record the previous value and subscribe to the store looking for changes in value.  The component will have it's state mutated should the value of a referenced selector change
* functions for each thunk that are dispatched, expecting redux-thunk to process them.  The functions are wrapped to provide the context

This context is never used on it's own but is the base for an inherited object that will created with the API is used in the component.

Normally one would include the createAPI call in the files where the spec is defined and then export the resulting apiFunction so it can be imported and consumed by components or tests.  If spec composition is used the spec may also be exported.

