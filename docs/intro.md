---
id: intro
title: What is redux-capi?
sidebar_label: What it is
---
Redux-capi is alternative to react-redux.  It allows you to package up actions, selectors and thunks as an API to be consumed by React components.  

Key features include:
* Reducers and actions are automatically generated from a spec
* API implementation is completely isolated from the React component structure
* API implementation can be reused across multiple components
* API and components can be tested independently
* API spec can be validated to catch common errors
* Same usage pattern for both function-based and class-based components 

### Create an API spec
An API spec is a JSON structure for defining redactions (self-reducing actions), selectors and thunks.  
```javascript
import { createAPI, reducer } from 'redux-capi';
const apiSpec = {
    redactions: {  
        increment: () => ({
            count: {
                set: (state) => state.count + 1
            }
        })
    },
    selectors: {
        count: (state) => state.count
    },
    thunks: {
        incrementN: ({increment}) => (iterations) => {
            while (iterations--)
                increment()
        }
    }
}
```
### Create and Mount the API
Create the API from the spec and mount it into a store.
```
import { createAPI, reducer } from 'redux-capi';

const api = createAPI(apiSpec);
api.mount(createStore(reducer, {count: 0}, applyMiddleware(ReduxThunk));
```
Note that the reducer itself is supplied by redux-capi.
### Use the API
And in your component use the API.  Your redacations, selectors and thunks are all exposed as properties returned by calling the api.
```
const Counter = () => {
    const {count, increment, incrementMulti} = api({});
    return (
         <view>
            <button onClick={ increment }>+1</button>
            <button onClick={ () => incrementN(20) }>+20</button>
            <text>{count}</text>
        </view>
    )
}
```
There is no need for a ```<Provider>``` since you already mounted the API in the store.
### Test the API Independently
You can test your API on it's own using it the same way you would within a component.  You pass a dummy component to provide context across the multiple invocations of the API.
```
describe('Counter API Testing', () => {
    it('can increment', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 0}));
        const component = {}; 
        {
            const {increment} = api({}, component);
            increment();
        } {
            const {count, incrementN} = api({}, component);
            expect(count).toBe(1);

            incrementN(2);
        } {
            const {count} = api({}, component);
            expect(count).toBe(3);
        }
    })
});
```
### Test the Consuming Component
With the ability to mock the API, you can test your component on it's own without invoking the API itself.  You provide values for selectors and redu-capi will record all calls to thunks and redactions along with the arguments passed.
```
describe('Counter Component Testing', () => {
    it('render', () => {
        const api = createAPI(apiSpec);
        let mock = api.mock({count: 34});

        renderer.render(<Counter />);

        const output = renderer.getRenderOutput();
        expect(output.props.children[2].props.children).toBe(34);

        output.props.children[0].props.onClick({});
        output.props.children[1].props.onClick({});
        expect(mock.increment.calls.length).toBe(1);
        expect(mock.incrementN.calls[0][0]).toBe(20);

        api.unmock();
    })
})
```
