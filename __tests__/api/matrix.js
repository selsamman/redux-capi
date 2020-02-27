describe('matrix.js', () => {it('not generate empty test error', () => {})})

export let matrixCalled = 0;
export const matrixAPISpec2D = {
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
export const matrixAPISpec = {
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
