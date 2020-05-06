---
id: reference_utility
title: Utilities
sidebar_label: Utilities
---
There are several utility functions that can be invoked from the API function.
```
apiFunction.getState()
```
Returns the current state and can be useful when testing the API
```
apiFunction.getStore();
```
Returns the redux store that the api was mounted into

In addition for debugging of applications a trace function is exported and may be overridden to log details of how the API is operating such as logging state changes and renders
```
import { reducer, trace } from 'redux-capi';

trace.log = t => console.log(t);
```
