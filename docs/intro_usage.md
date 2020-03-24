---
id: intro_usage
title: Using redux-capi
sidebar_label: Usage
---

You can use redux-capi in either React or react-native applications.  Redux-capi depends on React (version 16.8) whether you use functional or class components.  react-redux is not required.

## Installation

```
yarn add redux-capi
```
or
```
npm install redux-capi
```
## Usage
Generally you will define your api specification in an include file, create an API from the spec and and export it for consumption by components.

#### myapi.js
```
import { createAPI} from 'redux-capi';
const MyAPISpec = {
    redactions: {
        action1: {redaction_definition},
        action2: {redaction_definition},
    },
    selectors: {
        selector1: {selector_definition},
        selector2: {selector_definition}
    },
    thunks: {
        thunk1: {thunk_definition},
        thunk2: {thunk_definition}

    }
}
export const myAPI = createAPI(MyAPISpec)
```
In your top level file where the store is defined, the API needs to be mounted in the store.  This means that there is no need for a <Provider> component as with react-redux. 

#### app.js
```
import { myAPI } from 'myapi';
import { reducer } from 'redux-capi';
const store = createStore(reducer, initialStat, eapplyMiddleware(ReduxThunk))
api.mount(store, mountSpec);
```
Now any component can import and use the spec in either the render method for class-based components or in the component function.
#### Counter.js

Function-based components look like this:
```
        import { MyAPI } from 'myapi';
        const Counter = () => {
            const {action2, selector1} = MyAPI({});
            return (
                <button onClick={action2}>
                    {selector1}
                </button>
            )
        }
```
redux-api internally uses the hooks api to bind to the component

Class-based components look like this:
```
        import { MyAPI } from 'myapi';
        class Counter extends Component {
            render () {
           const {action2, selector1} = MyAPI({}, this);
                 return (
                    <button onClick={action2}>
                        {selector1}
                    </button>
                )
            }
        }
```
Notice the second parameter to MyAPI is the component itself which allows the API to bind itself to the life cycle of the component.
