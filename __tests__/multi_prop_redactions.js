import {createAPI, reducer, validation} from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';

export const matrixAPISpec = {
    redactions: {
        addTodo: (text) => ({
            nextId: {
                set: (state) => state.nextId +1
            },
            todos: {
                append: (state) => ({text, completed: false, id: state.nextId}),
            },
         }),

        deleteTodo: (id) => ({
            todos: {
                where: (state, item) => item.id === id,
                delete: true
            },
            log: {
                set: () => `deleted ${id}`
            }
        }),

        editTodo: (id, data) => ({
            todos: {
                where: (state, item) => item.id === id,
                assign: () => data,
            }
        }),
    },
      selectors: {
        todos: (state) => state.todos,
        log: (state) => state.log,
    },
    thunks: {
    },
}

const defaultShape = {
    todos: [
    ],
    nextId: 1,
    log: "",
}

describe('multi prop redactions', () => {
    it('can validate', () => {
        validation.errors = [];
        const api = createAPI(matrixAPISpec).validate(defaultShape)
            .mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
        expect(validation.errors.length).toBe(0);
    })
    it('can add, edit, delete', () => {
        const api = createAPI(matrixAPISpec).mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
        const state = api.getState();
        const component = {};
        {
            let {addTodo} = api({},component);
            addTodo("foo");
        } {
            let {todos,editTodo} = api({},component);
            expect(todos[0].text).toBe("foo");
            editTodo(todos[0].id, {text: "bar"})
        } {
            let {todos,deleteTodo} = api({},component);
            expect(todos[0].text).toBe("bar");
            deleteTodo(todos[0].id)
        } {
            let {todos} = api({},component);
            expect(todos.length).toBe(0);
        }
    })
})

