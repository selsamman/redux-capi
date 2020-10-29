import React, {Component} from 'react'
import {createStore} from "redux";
import { createRenderer } from 'react-test-renderer/shallow';
import { createAPI, reducer, trace } from '../src';
const renderer = createRenderer();
const apiSpec = {
    redactions: {
        increment: (amount) => ({
            count: {set: (state) => state.count + (amount || 1)}
        })
    },
    selectors: {
        count: (state) => state.count
    }
}
//trace.log = (X)=>{console.log(X)};
describe('Component Testing', () => {
    it('works end to end in a function', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 34}));
        const renderCount = 0;
        const Counter = () => {
            const {count, increment} = api({}, Counter);
            return (
                <button onClick={()=>increment(2)}>{count}</button>
            )
        }
        renderer.render(<Counter />);
        let output = renderer.getRenderOutput();
        expect(output.props.children).toBe(34);
        output.props.onClick({});
        output = renderer.getRenderOutput();
        expect(output.props.children).toBe(36);
    })
    it('works end to end in a class', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 34}));
        const renderCount = 0;
        class Counter extends Component {
            render () {
                const {count, increment} = api({}, this);
                return (
                    <button onClick={()=>increment(2)}>{count}</button>
                )
            }
        }
        renderer.render(<Counter />);
        let output = renderer.getRenderOutput();
        expect(output.props.children).toBe(34);
        output.props.onClick({});
        output = renderer.getRenderOutput();
        expect(output.props.children).toBe(36);
    })
})
