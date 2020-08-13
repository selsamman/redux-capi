import React from 'react'
import {createStore, applyMiddleware} from "redux";
import { createRenderer } from 'react-test-renderer/shallow';
import { createAPI, reducer } from '../src';
import ReduxThunk from 'redux-thunk';
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
        incrementNAsync: ({increment}) => async (count) => {
            const ret = count;
            while(count--)
                increment();
            await (new Promise(resolve => setTimeout(resolve, 1)))
            return ret;
        },
        incrementN: ({increment}) => (count) => {
            const ret = count;
            while(count--)
                increment();
            return ret;
        },
        multiply: ({count})=> (by) => count * by
    }
}
describe('Counter API Testing', () => {
    it('can increment', async () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, {count: 0}, applyMiddleware(ReduxThunk)));
        const component = {};
        {
            const {incrementN, incrementNAsync} = api({}, component);
            expect(await incrementN(1)).toBe(1);
            expect(await incrementNAsync(1)).toBe(1);
            expect(api.getState().count).toBe(2);
        } {
            const {count, multiply} = api({}, component);
            expect(count).toBe(2);
            expect(multiply(2)).toBe(4);
        }
    })
});
