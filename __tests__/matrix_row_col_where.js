import {createAPI, reducer, validation} from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';
export let matrixCalled = 0;

export const matrixAPISpec = {
    redactions: {
        setValue: (row, col, value) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    select: {
                        cols: {
                            where: (state, item, ix) => ix === col,
                            set: () => value
                        }
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
                rows: [
                    (state, item, ix) => ix === row,
                    {
                        cols: {
                            after: () => row,
                            insert: () => ({})
                        }
                    }
                ]
            }
        }),
        insertColBefore: (row) => ({
            matrix: {
                rows: [
                    (state, item, ix) => ix === row,
                    {
                        cols: {
                            before: () => row,
                            insert: () => ({})
                        }
                    }
                ]
            }
        }),
        addCol: (row) => ({
            matrix: {
                rows: [
                    (state, item, ix) => ix === row,
                    {
                        cols: {
                            append: () => ({})
                        }
                    }
                ]
            }
        }),
        delRow: (row) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    delete: true,
                }
            }
        }),
        delCol: (row, col) => ({
            matrix: {
                rows: {
                    where: (state, item, ix) => ix === row,
                    select: {
                        cols: {
                            where: (state, item, ix) => ix === col,
                            delete: true
                        }
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
            while(rowsToAdd-- > 0)
                addRow();
            let rowValue =  matrix.rows[row]
            let colsToAdd = rowValue ? col - rowValue.cols.length + 1: col + 1;
            while(colsToAdd-- > 0)
                addCol(row);
            setValue(row, col, value);
        }
    }
}


const defaultShape = {matrix: {rows: []}};

describe('matrix with rows and columns', () => {
    it('can validate', () => {
        validation.errors = [];
        const api = createAPI(matrixAPISpec).validate({matrix: {rows: [{cols: []}]}})
            .mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
        expect(validation.errors.length).toBe(0);
    })
     it('can insert', () => {
         const api = createAPI(matrixAPISpec).mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
         const component = {};
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
            expect(matrix.rows[0].cols[0]).toBe("0-0");
            expect(matrix.rows[0].cols[1]).toBe("0-1");
            expect(matrix.rows.length).toBe(1);
            expect(matrix.rows[0].cols.length).toBe(2);

            insertRowAfter(0)
            insertColBefore(1, 0);
            setValue(1, 0, "1-0");
        } {
            let {matrix, set} = api({},component);
            expect(matrix.rows[0].cols[0]).toBe("0-0");
            expect(matrix.rows[0].cols[1]).toBe("0-1");
            expect(matrix.rows[1].cols[0]).toBe("1-0");
            expect(matrix.rows.length).toBe(2);
            expect(matrix.rows[1].cols.length).toBe(1);

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

             expect(matrix.rows[0].cols[0]).toBe("0-0");
             expect(matrix.rows[0].cols[1]).toBe("0-1");
             expect(matrix.rows[0].cols[2]).toBe("0-2");

             expect(matrix.rows[1].cols[0]).toBe("1-0");
             expect(matrix.rows[1].cols[1]).toBe("1-1");
             expect(matrix.rows[1].cols[2]).toBe("1-2");

             expect(matrix.rows[2].cols[0]).toBe("2-0");
             expect(matrix.rows[2].cols[1]).toBe("2-1");
             expect(matrix.rows[2].cols[2]).toBe("2-2");

             delCol(1,1);
         } {
             let {matrix, delRow} = api({},component);

             expect(matrix.rows[0].cols[0]).toBe("0-0");
             expect(matrix.rows[0].cols[1]).toBe("0-1");
             expect(matrix.rows[0].cols[2]).toBe("0-2");

             expect(matrix.rows[1].cols[0]).toBe("1-0");
             expect(matrix.rows[1].cols.length).toBe(2);
             expect(matrix.rows[1].cols[1]).toBe("1-2");

             expect(matrix.rows[2].cols[0]).toBe("2-0");
             expect(matrix.rows[2].cols[1]).toBe("2-1");
             expect(matrix.rows[2].cols[2]).toBe("2-2");

             delRow(1);
         } {
             let {matrix} = api({},component);

             expect(matrix.rows.length).toBe(2);

             expect(matrix.rows[0].cols[0]).toBe("0-0");
             expect(matrix.rows[0].cols[1]).toBe("0-1");
             expect(matrix.rows[0].cols[2]).toBe("0-2");


             expect(matrix.rows[1].cols[0]).toBe("2-0");
             expect(matrix.rows[1].cols[1]).toBe("2-1");
             expect(matrix.rows[1].cols[2]).toBe("2-2");
        }
     })

})
