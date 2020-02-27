import { createAPI, reducer } from '../src';
import { createStore } from 'redux';
const apiSpec = {
    redactions: {
        increment: () => ({
            count: {set: (state) => state.count + 1}
        })
    },
    selectors: {
        count: (state) => state.count
    }
}
describe('Counter Testing', () => {
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
