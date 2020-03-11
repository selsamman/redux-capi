import { createAPI, reducer } from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
export let matrixCalled = 0;

export const matrixAPISpec = {
    redactions: {
        setValue: (row, col, value) => ([
            (state, item, ix) => ix === row,
            [
                (state, item, ix) => ix === col,
                {
                    set: () => value
                }
            ]
        ]),
        addRow: () => ({
            append: () => {
                return ([]);
            }
        }),
        insertRowAfter: (row) => ({
            after: () => row,
            insert: () => ([])
        }),
        insertRowBefore: (row) => ({
            before: () => row,
            insert: () => ([])
        }),
        insertColAfter: (row) => ([
            (state, item, ix) => ix === row,
            {
                after: () => row,
                insert: () => ([])
            }
        ]),
        insertColBefore: (row) => ([
                (state, item, ix) => ix === row,
                {
                    before: () => row,
                    insert: () => ({})
                }
            ]
        ),
        addCol: (row) => ([
            (state, item, ix) => ix === row,
            {
                append: () => ({})
            }
        ]),
        delRow: (row) => ([
            (state, item, ix) => ix === row,
            {
                delete: true,
            }
        ]),
        delCol: (row, col) => (
            [
                (state, item, ix) => ix === row,
                [
                        (state, item, ix) => ix === col,
                        {
                            delete: true
                        }
                ]
            ]
        ),
    },
    selectors: {
        matrix: (state) => state
    },
    thunks: {
        set: ({matrix, addRow, addCol, setValue}) => (row, col, value) => {
            let rowsToAdd = row - matrix.length + 1;
            while(rowsToAdd-- > 0)
                addRow();
            let rowValue =  matrix[row]
            let colsToAdd = rowValue ? col - rowValue.length + 1: col + 1;
            while(colsToAdd-- > 0)
                addCol(row);
            setValue(row, col, value);
        }
    },
}

const defaultShape = [];

describe('matrix with rows and columns', () => {
    it('can insert', () => {
        const api = createAPI(matrixAPISpec).mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
        const state = api.getState();
        expect(state instanceof Array).toBe(true);
        const component = {};
        {
            let {insertRowBefore, insertColBefore, setValue} = api({},component);
            insertRowBefore(0);
            let state = api.getState();
            expect(state instanceof Array).toBe(true);
            insertColBefore(0, 0);
            state = api.getState();
            expect(state instanceof Array).toBe(true);
            setValue(0, 0, "0-0");
        } {
            let {matrix, insertColAfter, setValue} = api({},component);
            const state = api.getState();
            expect(state instanceof Array).toBe(true);
            expect(matrix[0][0]).toBe("0-0");
            expect(matrix.length).toBe(1);

            insertColAfter(0, 0);
            setValue(0, 1, "0-1");
        } {
            let {matrix, insertRowAfter, insertColBefore, setValue} = api({},component);
            expect(matrix[0][0]).toBe("0-0");
            expect(matrix[0][1]).toBe("0-1");
            expect(matrix.length).toBe(1);
            expect(matrix[0].length).toBe(2);

            insertRowAfter(0)
            insertColBefore(1, 0);
            setValue(1, 0, "1-0");
        } {
            let {matrix, set} = api({},component);
            expect(matrix[0][0]).toBe("0-0");
            expect(matrix[0][1]).toBe("0-1");
            expect(matrix[1][0]).toBe("1-0");
            expect(matrix.length).toBe(2);
            expect(matrix[1].length).toBe(1);

            set (0, 0, "0-0");
            set (0, 1, "0-1");
            set (0, 2, "0-2");

            set (1, 0, "1-0");
            set (1, 1, "1-1");
            set (1, 2, "1-2");

            set (2, 0, "2-0");
            set (2, 1, "2-1");
            set (2, 2, "2-2");

        } {
            let {matrix, delCol} = api({},component);

            expect(matrix[0][0]).toBe("0-0");
            expect(matrix[0][1]).toBe("0-1");
            expect(matrix[0][2]).toBe("0-2");

            expect(matrix[1][0]).toBe("1-0");
            expect(matrix[1][1]).toBe("1-1");
            expect(matrix[1][2]).toBe("1-2");

            expect(matrix[2][0]).toBe("2-0");
            expect(matrix[2][1]).toBe("2-1");
            expect(matrix[2][2]).toBe("2-2");

            delCol(1,1);
        } {
            let {matrix, delRow} = api({},component);

            expect(matrix[0][0]).toBe("0-0");
            expect(matrix[0][1]).toBe("0-1");
            expect(matrix[0][2]).toBe("0-2");

            expect(matrix[1][0]).toBe("1-0");
            expect(matrix[1].length).toBe(2);
            expect(matrix[1][1]).toBe("1-2");

            expect(matrix[2][0]).toBe("2-0");
            expect(matrix[2][1]).toBe("2-1");
            expect(matrix[2][2]).toBe("2-2");

            delRow(1);
        } {
            let {matrix} = api({},component);

            expect(matrix.length).toBe(2);

            expect(matrix[0][0]).toBe("0-0");
            expect(matrix[0][1]).toBe("0-1");
            expect(matrix[0][2]).toBe("0-2");


            expect(matrix[1][0]).toBe("2-0");
            expect(matrix[1][1]).toBe("2-1");
            expect(matrix[1][2]).toBe("2-2");
        }
    })

})
