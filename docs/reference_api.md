---
id: reference_api
title: Generated API function
sidebar_label: API
---
After mounting the API into the store, the API function, produced by createAPI, is ready for consumption by components.

For function-based components is ivoked like this:
```
componentContext = APIFunction(contextProperties);
```
The API will use React hooks to tie the context to the component.
For class based components the component itself is passed as the second parameter.
```
componentContext = APIFunction(contextProperties, this);
```
The ```contextProperties``` argument allows any arbitrary properties to be assigned to the component context.  This would normally be used to allow the API implementation to select and operate on specific data instances relavent to the instance of a component.  For example a todo list item component might use an id property of the current todo list item.

The ```componentContext``` contains functions for all the redactions and thunks and properties for each selector that will return a value when referenced.

Calling the API simply creates an object from the API itself.  Since the internal implementations and wrappers use the ```this``` variable to reference context and the store the functions must also be bound when the APIFunction is called so they can be referenced on a standalone rather than and object method call basis.

It is recommended that values be unpacked at the time the API Function is called such that selectors have a consistent value of the state rather than a value that might be affected by redactions called during the course of executing the render.
```
const {count, increment, incrementMulti} = api({});
```
