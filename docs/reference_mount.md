---
id: reference_mount
title: api.mount()
sidebar_label: api.mount()
---
Mount the API is the equivalent of connect in react-redux except that the store is explicitly passed as an argument rather than being found from the nearest ```<Provider>``` component.  
```
apiFunction.mount(reduxStore, mountPoint);
```
The mounting would normally be done in the top level function where the store is normally created.  This keeps the mounting separate from the spec definition since the specs themselves do not need knowledge of where exactly they are mounted in the state.
