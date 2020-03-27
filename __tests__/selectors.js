import { createAPI, reducer } from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
let setState;
let store;
let selectorCalled = 0;
let memoSelectorCalled = 0;
const apiSpec = {
    redactions: {
        increment: (amount) => ({
            count: {set: (state) => state.count + (amount || 1)}
        }),
        incrementWithSelector: (amount) => ({
            count: {set: (state, prop, {count}) => count + (amount || 1)}
        }),
    },
    selectors: {
        count: (state) => {
            selectorCalled++;
            return state.count;
        },
        memoCount: [
            (selector, api) => selector(api.count),
            (count) => {
                memoSelectorCalled++;
                return count
            }
        ]
    }
}

function getAPI (newStore, shape) {
    store = newStore ? createStore(reducer, {count: 0}, applyMiddleware(ReduxThunk)) : store;
    const api = createAPI(apiSpec);
    api.mount(store);
    return api;
}
describe('CAPI', () => {
    describe('bindAPI', () => {
        it('create api context', () => {
            const api = getAPI(true);
            const apiContext = api._getContext();
            expect(typeof apiContext.increment).toBe("function");
            expect(typeof Object.getOwnPropertyDescriptor(apiContext, 'count').get).toBe("function");
            expect(typeof Object.getOwnPropertyDescriptor(apiContext, 'memoCount').get).toBe("function");
            expect(apiContext.__store__).toBe(api.getStore());
        })
        it('create component context', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            const componentContext = api({},component);
            expect(typeof componentContext.increment).toBe("function");
        })

        it('can track selectors', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            selectorCalled = 0;
            {
                let {__selector_used__, count, increment} = api({}, component);
                expect(selectorCalled).toBe(1);
                expect(count).toBe(0);
                expect(__selector_used__['count']).toBe(0);
                expect(selectorCalled).toBe(1);
                expect(setState).toBe(undefined);
                increment();
                expect(selectorCalled).toBe(2);  // store called and compare made
            } {
                let {count} = api({}, component);;
                expect(count).toBe(1);
                expect(selectorCalled).toBe(3);
            }
        })

        it('can track memo selectors', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            memoSelectorCalled = 0;
            {
                let {__selector_used__, memoCount, increment} = api({}, component);
                expect(memoSelectorCalled).toBe(1);
                expect(memoCount).toBe(0);
                expect(__selector_used__['memoCount']).toBe(0);
                increment();
                expect(memoSelectorCalled).toBe(1); // Because memo never examined since count changed
            } {
                let {memoCount} = api({}, component);;
                expect(memoCount).toBe(1);
                expect(memoSelectorCalled).toBe(2);
            } {
                let {memoCount} = api({}, component);;
                expect(memoCount).toBe(1);
                expect(memoSelectorCalled).toBe(2);
            }
        })
        it('you cannot reference a selector in a redaction', () => {
            const api = getAPI(true);
            const component = {};
            {
                let {incrementWithSelector} = api({}, component);
                expect(incrementWithSelector).toThrow();
            } {
                let {memoCount} = api({}, component);;
                expect(memoCount).toBe(0);
            }
        })
    })
})
