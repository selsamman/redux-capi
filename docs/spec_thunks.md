---
id: spec_thunks
title: Thunks
sidebar_label: Thunks
---
Thunks use the redux-thunk mechanism but wrap the thunk such that it has access to the context
```
thunk_function_name: (context) => (arguments) => {
    action to be performed ...
    return value // Optional
}
```
For example:
```
        incrementN: ({increment}) => (iterations) => {
            while (iterations--)
                increment()
        }
```
As with normal redux-thunk they may be asynchronous by returning a promise.  By giving access to the context, the thunk may call redactions, call other thunks or use selectors.  This makes them fully capable of executing any logic needed.  It also provides for easy migration of logic that might have started out in a component to be moved into the API.
