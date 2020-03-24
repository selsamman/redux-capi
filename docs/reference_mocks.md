---
id: reference_mocks
title: api.mock()
sidebar_label: api.mock()
---
The mock function allows components to be tested independently of the API implementation.  It allows selector values to be provided and record when thunks and redactions are called along with their arguments.
```
const mock = api.mock(contextValues);
...
mock.unmock();
```
The ```contextValues``` argument is an object that contains property and values for selectors that will be used in a component being tested.  You can then test render the component with the React test renderer and extract values from the DOM:
```
import { createRenderer } from 'react-test-renderer/shallow';
const renderer = createRenderer();

const api = createAPI(apiSpec);
const mock = api.mock({count: 34});

renderer.render(<Counter />);

const output = renderer.getRenderOutput();
expect(output.props.children[2].props.children).toBe(34);
```

mock returns a mock context which is used to analyze calls that the component may make in response to clicks.  The context contains a property for each thunk and redaction which will contain a two dimensional array.  The first dimension is sequence of the call and the second is the arguments passed.
```
output.props.children[0].props.onClick({});
output.props.children[1].props.onClick({});
expect(mock.increment.calls.length).toBe(1);
expect(mock.incrementN.calls[0][0]).toBe(20);
``` 
Since mock has to modifying the API itself you should unmock at the end of the test and run tests on the same API sequentially.  
