import { createAPI, reducer } from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
let matrixCalled = 0;
const matrixAPISpec2D = {
    redactions: {
        setValue: (row, col, value) => ({
            matrix: {
                where: (state, item, ix) => ix === row,
                _: {
                    where: (state, item, ix) => ix === col,
                    set: () => value
                }
            }
        }),
        addRow: () => ({
            matrix: {
                append: () => ({cols: []})
            }
        }),
        insertRowAfter: (row) => ({
            matrix: {
                after: () => row,
                insert: () => ({cols: []})
            }
        }),
        insertRowBefore: (row) => ({
            matrix: {
                before: () => row,
                insert: () => ({cols: []})
            }
        }),
        insertColAfter: (row) => ({
            matrix: {
                where: (state, item, ix) => ix === row,
                _: {
                    after: () => row,
                    insert: () => ({cols: []})
                }
            }
        }),
        insertColBefore: (row) => ({
            matrix: {
                where: (state, item, ix) => ix === row,
                _: {
                    Before: () => row,
                    insert: () => ({cols: []})
                }
            }
        }),
        addCol: (row) => ({
            matrix: {
                where: (state, item, ix) => ix === row,
                cols: {
                    append: () => ({})
                }
            }
        }),
    },
    selectors: {
        matrix: (api,state) => state.matrix
    },
    thunks: {
        set: ({matrix, addRow, addCol, setValue}) => (row, col, value) => {
            let rowsToAdd = row - matrix.rows.length + 1;
            while(rowsToAdd--)
                addRow();
            let colsToAdd = col - (matrix.rows[row] || []).length + 1;
            while(colsToAdd--)
                addCol(row);
            setValue(row, col, value);
        }
    }
}
const matrixAPISpec = {
    redactions: {
        setValue: (row, col, value) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    cols: {
                        where: (state, item, ix) => ix === col,
                        set: () => value
                    }
                }
            }
        }),
        addRow: () => ({
            matrix: {
                rows: {
                    append: () => ({cols: []})
                }
            }
        }),
        insertRowAfter: (row) => ({
            matrix: {
                rows: {
                    after: () => row,
                    insert: () => ({cols: []})
                }
            }
        }),
        insertRowBefore: (row) => ({
            matrix: {
                rows: {
                    before: () => row,
                    insert: () => ({cols: []})
                }
            }
        }),
        insertColAfter: (row) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    cols: {
                        after: () => row,
                        insert: () => ({})
                    }
                }
            }
        }),
        insertColBefore: (row) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    cols: {
                        before: () => row,
                        insert: () => ({})
                    }
                }
            }
        }),
        addCol: (row) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    cols: {
                        append: () => ({})
                    }
                }
            }
        }),
    },
    selectors: {
        matrixNonMemo: ({matrix}) => matrix,
        matrix: [
            (select, {matrixNonMemo}) => select(matrixNonMemo),
            (matrix) => {
                ++matrixCalled;
                return matrix;
            }
        ]
    },
    thunks: {
        set: ({matrix, addRow, addCol, setValue}) => (row, col, value) => {
            let rowsToAdd = row - matrix.rows.length + 1;
            while(rowsToAdd--)
                addRow();
            let colsToAdd = col - (matrix.rows[row] || []).length + 1;
            while(colsToAdd--)
                addCol(row);
            setValue(row, col, value);
        }
    }
}
const defaultShape = {matrix: {rows: []}};
let setState;
let store;
function getAPI (newStore, shape) {
    store = newStore ? createStore(reducer, shape || defaultShape, applyMiddleware(ReduxThunk)) : store;
    const api = createAPI(matrixAPISpec);
    api.mount(store);
    return api;
}
describe('CAPI', () => {
    describe('bindAPI', () => {
        it('can setup componentContext', () => {
            const api = getAPI(true);
            const apiContext = api._getContext();
            expect(typeof apiContext.setValue).toBe("function");
            expect(typeof apiContext.addRow).toBe("function");
            expect(typeof apiContext.set).toBe("function");
            expect(typeof Object.getOwnPropertyDescriptor(apiContext, 'matrix').get).toBe("function");
            expect(apiContext.__store__).toBe(api._getStore());
        })
        it('can create api', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            const componentContext = api({},component);
            expect(typeof componentContext.setValue).toBe("function");
            expect(typeof componentContext.addRow).toBe("function");
            expect(typeof componentContext.set).toBe("function");
            expect(typeof Object.getOwnPropertyDescriptor(componentContext.__proto__, 'matrix').get).toBe("function");
        })

        it('can track selectors', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            {
                let {__selector_used__, matrix, set} = api({}, component);
                expect(matrix.rows.length).toBe(0);
                expect(__selector_used__['matrix'].rows.length).toBe(0);
                set(0, 0, "zero-zero");
                var foo = store.getState();
                expect(api._getStore().getState().matrix.rows[0].cols[0]).toBe("zero-zero");
            } {
                let {matrix} = api({}, component);;
                expect(matrix.rows[0].cols[0]).toBe("zero-zero");
            }
        })

        it('can insert', () => {
            const api = getAPI(true);
            const component = {setState(state) {setState = state}};
            let selectorCalled;
            {
                let {insertRowBefore, insertColBefore, setValue} = api({},component);
                insertRowBefore(0);
                insertColBefore(0, 0);
                setValue(0, 0, "0-0");
            } {
                let {matrix, insertColAfter, setValue} = api({},component);
                expect(matrix.rows[0].cols[0]).toBe("0-0");
                expect(matrix.rows.length).toBe(1);

                insertColAfter(0, 0);
                setValue(0, 1, "0-1");
            } {
                let {matrix, insertRowAfter, insertColBefore, setValue} = api({},component);
                expect(matrix.rows[0].cols[1]).toBe("0-1");
                expect(matrix.rows.length).toBe(1);
                expect(matrix.rows[0].cols.length).toBe(2);
                insertRowAfter(0)
                insertColBefore(1, 0);
                selectorCalled = matrixCalled;
                setValue(1, 0, "1-0");
            } {
                let {matrix} = api({},component);
                expect(matrix.rows[1].cols[0]).toBe("1-0");
                expect(matrix.rows.length).toBe(2);
                expect(matrix.rows[1].cols.length).toBe(1);
                expect(selectorCalled + 1).toBe(matrixCalled);
                selectorCalled = matrixCalled;
            } {
                let {matrix} = api({},component);
                expect(matrix.rows[1].cols[0]).toBe("1-0");
                expect(selectorCalled).toBe(matrixCalled);
            }
        })
    })
})