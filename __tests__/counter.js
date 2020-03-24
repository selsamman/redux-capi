import React from 'react'
import {createStore} from "redux";
import { createRenderer } from 'react-test-renderer/shallow';
import { createAPI, reducer } from '../src';
const renderer = createRenderer();
const apiSpec = {
    redactions: {
        increment: (amount) => ({
            count: {
                set: (state) => state.count + (amount || 1)
            }
        })
    },
    selectors: {
        count: (state) => state.count
    },
    thunks: {
        incrementN: ({increment}) => (count) => {
            while(count--)
                increment();
        }
    }
}
describe('Counter API Testing', () => {
    it('can increment', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 0}));
        const component = {};
        {
            const {increment} = api({}, component);
            increment();
            expect(api.getState().count).toBe(1);
        } {
            const {count} = api({}, component);
            expect(count).toBe(1);
        }
    })
});
describe('Counter Component Testing', () => {
    it('render', () => {
        const api = createAPI(apiSpec);
        let mock = api.mock({count: 34});
        const Counter = () => {
            const {count, increment, incrementN} = api({});
            return (
                <view>
                    <button onClick={ increment }>+1</button>
                    <button onClick={ () => incrementN(20)}>+20</button>
                    <text>{count}</text>
                </view>
            )
        }
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
