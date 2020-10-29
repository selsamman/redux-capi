---
id: spec_mounting
title: Mounting a spec
sidebar_label: Mounting
---
In redux you can combine reducers and made them apply to specific parts of the state by using combineReducers.  The equivalent functionality in redux-capi is called mounting though it can do much more.  Mounting is establishing a state path that is the starting point (mount point) for an API spec.  It can be specified:
* When you mount the API into the store
* As part of declaring the spec though usually that would be when composing a spec from other specs
The state graph looks exactly like the schema in a redaction except that the last property is set to the boolean true value.
```
mountPoint = {
    data: {
        telephones: {
            list: true
        }
    }
}
```
When this mount point is applied to a spec as in
```
myAPI.mount(store, mountPoint)
```
all references to the list property in spec will refer to ```data.telephones.list```.  This means:
* The ```list``` property in the schema in all redactions
* Any state passed to the functions within the schema will be relative ```list``` rather than ```data.telephones.list```

This means that the spec can be completely unaware of where exactly in the state shape the properties it is dealing with actually reside.  This makes it possible to re-use specs and to organize state shape in a large application without naming conflicts.
### Using Arrays in Mount Points
There may be times when you want to use spec and mount it into an array element.  Suppose you have multiple lists and a current one.  You want the spec to only apply to the current one.  In that case you can use  **where** just as you would in a redaction to qualify which element of the array the spec is to apply to.
```
mountPoint = {
    todoLists: {
         where: (state, item, ix, api) => state.currentListIx === ix
    }
}
```
or you may have multiple levels of arrays by nesting where and optionally select as for redactions:
```
mountPoint = {
    companies: {
        where: where: (state, item, ix, api) => state.companyIx == Ix,
        select: {
            todoLists: {
                 where: (state, item, ix, api) => 
                        state.companies[state.companyIx].listIx === ix,
            }
        }
    }
}
```
