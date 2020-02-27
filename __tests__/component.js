import React from 'react'
import { createRenderer } from 'react-test-renderer/shallow';
import {applyMiddleware, createStore} from "redux";
import {createAPI, reducer} from "../src";
import ReduxThunk from "redux-thunk";
import {matrixAPISpec} from "./api/matrix";
const renderer = createRenderer();
const defaultShape = {matrix: {rows: []}};
describe('render', () => {
    it('render', () => {
         let store = createStore(reducer, defaultShape, applyMiddleware(ReduxThunk));
         const api = createAPI(matrixAPISpec);
         api.mount(store);
         let mock = api.mock({matrix: {rows: [{ cols: ["foo"]}]}});
         const Matrix = () => {
             const {matrix, addCol} = api({});
             return (
             <ul>
                 {matrix.rows.map((row, ix) =>
                     <button key={ix + 1} onClick={()=>addCol(ix)}>{row.cols[0]}</button>
                 )}
             </ul>
             )
         }
         renderer.render(<Matrix />);
         const output = renderer.getRenderOutput();
         expect(output.props.children.length).toBe(1);
         expect(output.props.children[0].props.children).toBe("foo");
         output.props.children[0].props.onClick({});
         expect(mock.addCol.calls[0][0]).toBe(0);
         api.unmock();
     })
})
