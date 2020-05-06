import {applyMiddleware, createStore} from "redux";
import { createAPI, reducer, validation } from '../src';
import ReduxThunk from "redux-thunk";

export const SHOW_ALL = 'show_all'
export const SHOW_COMPLETED = 'show_completed'
export const SHOW_ACTIVE = 'show_active'

export const todoRedactions = {

    addTodo: (text) => ({
        nextId: {
            set: (state) => state.nextId +1
        },
        todos: {
            append: (state) => ({text, completed: false, id: state.nextId}),
        },
        visibilityFilter: {
            set: ({visibilityFilter}) => visibilityFilter === SHOW_COMPLETED ? SHOW_ACTIVE : visibilityFilter
        }
    }),
    insertAfterTodo: (text, ix) => ({
        nextId: {
            set: (state) => state.nextId +1
        },
        todos: {
            insert: (state) => ({text, completed: false, id: state.nextId}),
            after: () => ix
        },
        visibilityFilter: {
            set: ({visibilityFilter}) => visibilityFilter === SHOW_COMPLETED ? SHOW_ACTIVE : visibilityFilter
        }
    }),
    insertBeforeTodo: (text, ix) => ({
        nextId: {
            set: (state) => state.nextId +1
        },
        todos: {
            insert: (state) => ({text, completed: false, id: state.nextId}),
            before: () => ix
        },
        visibilityFilter: {
            set: ({visibilityFilter}) => visibilityFilter === SHOW_COMPLETED ? SHOW_ACTIVE : visibilityFilter
        }
    }),
    deleteTodo: () => ({
        todos: {
            where: (state, item, ix, {id}) => item.id === id,
            delete: true
        }
    }),

    editTodo: (text) => ({
        todos: {
            where: (state, item, ix, {id}) => item.id === id,
            select: {
                text: {
                    set: () => text,
                }
            }
        }
    }),

    completeTodo: () => ({
        todos: {
            where: (state, item, ix, {id}) => item.id === id,
            assign: () => ({completed: true}),
        }
    }),

    setCompleteOnAllTodos: (completeValue) => ({
        todos: {
            where: (state, todo) => todo.completed !== completeValue,
            assign: () => ({completed: completeValue}),
        }
    }),

    clearCompleted: () => ({
        todos: {
            where: (state, item) => item.completed,
            delete: true
        }
    }),

    setFilter: (filter) => ({
        visibilityFilter: {
            set: () => filter,
        }
    }),
}

export const todoSelectors = {

    todos: (state) => state.todos,

    visibilityFilter: (state) => state.visibilityFilter,

    todo: [
        (select, {id, todos}) => select(id, todos),
        (id, todos) => todos.find(t => t.id === id)
    ],

    filteredTodos: [
        (select, {visibilityFilter, todos}) => select(visibilityFilter, todos),
        (visibilityFilter, todos) => {
            switch (visibilityFilter) {
                case SHOW_ALL:
                    return todos
                case SHOW_COMPLETED:
                    return todos.filter(t => t.completed)
                case SHOW_ACTIVE:
                    return todos.filter(t => !t.completed)
                default:
                    throw new Error('Unknown filter: ' + visibilityFilter)
            }
        }
    ],
    completedCount: [
        (select, api) => select(api.todos),
        (todos) => todos.reduce((count, todo) => count + (todo.completed ? 1 : 0), 0)
    ],

    todosCount: [
        (select, api) => select(api.todos),
        (todos) => todos.reduce((count, todo) => count + 1, 0)
    ],

    activeCount: (state, api) => (api.todosCount - api.completedCount),
}
export const todoThunks = {
    updateTodo: ({deleteTodo, editTodo}) => (text) => {
        if (text.length === 0) {
            deleteTodo()
        } else {
            editTodo(text)
        }
    },
    completeAllTodos: ({completedCount, todosCount, setCompleteOnAllTodos}) => () => {
        setCompleteOnAllTodos(completedCount !== todosCount)
    }
}


export const todoAPISpec = {
    redactions: todoRedactions,
    selectors: todoSelectors,
    thunks: todoThunks
}

const initialState = {
    todos: [
        {
            text: 'Use Redux',
            completed: false,
            id: 0
        },
    ],
    nextId: 1,
    visibilityFilter: SHOW_ACTIVE
}
const ComposedSpec = [
    {
        ...todoAPISpec,
        api: 'list1',
        mount: {list1: true},
    }, {
        ...todoAPISpec,
        api: 'list2',
        mount: {list2: true},
    }, {
        ...todoAPISpec,
        mount: {
            lists: {
                where: (state, item, ix, {listIx}) => listIx === ix
            }
        },
    }
];
const composedShape = {
    list1: initialState,
    list2: initialState,
    lists: [initialState]
}
describe('Validation', () => {

    it('can mount and validate with no errors', () => {
        validation.errors = [];
        const todoAPI = createAPI(todoAPISpec);
        todoAPI.validate(initialState)
        todoAPI.mount(createStore(reducer, initialState, applyMiddleware(ReduxThunk)));
        expect(validation.errors.length).toBe(0);
    })

    it('can mount and validate with errors', () => {
        validation.errors = [];
        const todoAPI = createAPI(todoAPISpec);
        todoAPI.validate({})
        todoAPI.mount(createStore(reducer, initialState, applyMiddleware(ReduxThunk)));
        expect(validation.errors.filter(e => e.match("corresponding state")).length).toBe(15);
        expect(validation.errors.length).toBe(15);
    })


    it('can mount with map and validate ', () => {
        validation.errors = [];
        const todoAPI = createAPI(ComposedSpec);
        todoAPI.validate(composedShape);
        todoAPI.mount(createStore(reducer, composedShape, applyMiddleware(ReduxThunk)));
        expect(validation.errors.length).toBe(0);
    })

    it('can mount with map and validate ', () => {
        validation.errors = [];
        const todoAPI = createAPI(ComposedSpec);
        todoAPI.validate({});
        todoAPI.mount(createStore(reducer, composedShape, applyMiddleware(ReduxThunk)));
        expect(validation.errors.filter(e => e.match("corresponding state")).length).toBe(27);
        expect(validation.errors.length).toBe(27);
    })

    it('can mount with map and validate ', () => {
        validation.errors = [];
        const todoAPI = createAPI(errorSpec);
        todoAPI.validate(errorShape);
        todoAPI.mount(createStore(reducer, errorShape, applyMiddleware(ReduxThunk)));
        expect(get("selector1")).toMatch("selector arrays must have two instances of functions");
        expect(get("selector2")).toMatch("selector must be an array or a function");
        expect(get("thunk1")).toMatch("thunks must be a function")
        expect(get("redaction1")).toMatch("redaction did not return a schema")
        expect(get("redaction2")).toMatch("redaction returned an exception");
        expect(get("redaction3")).toMatch("[] first element must be function and second schema path");
        expect(get("redaction4")).toMatch("does not have corresponding state shape");
        expect(get("redaction5")).toMatch("must be a function");
        expect(get("redaction6")).toMatch("must be a function");
        expect(get("redaction7")).toMatch("must be a function");
        expect(get("redaction8")).toMatch("must be a function");
        expect(get("redaction9")).toMatch("must be a function");
        expect(get("redaction11")).toMatch("must be an object");
        expect(get("redaction12")).toMatch("must be true");
        expect(get("redaction13")).toMatch("extraneous property");
        expect(get("redaction14")).toMatch("not paired with action");
        expect(get("redaction15")).toMatch("corresponding state must be an Array");
        expect(get("redaction16")).toMatch("must be paired with insert");
        expect(get("redaction17")).toMatch("must be paired with insert");
        expect(get("redaction18")).toMatch("must be paired with insert");
        expect(get("redaction19")).toMatch("must be paired with insert");
        expect(validation.errors.length).toBe(21);
        function get(api, error) {
            return validation.errors.find(e => e.match(api));
        }
    })

});
const errorShape = {
    number: 23,
    array: []
}
const errorSpec = {
    selectors: {
        selector1: [
            () => {}
        ],
        selector2: false
    },
    thunks: {
        thunk1: true,
    },
    redactions: {
        redaction1: () => undefined,
        redaction2: () => {throw "foo"},
        redaction3: () => ({array: [() => null, () => null]}),
        redaction4: () => ({invalid: {}}),
        redaction5: () => ({array: {where: false, set: ()=>[]}}),
        redaction6: () => ({array: {where: () => true, set: true}}),
        redaction7: () => ({array: {where: () => ({}), assign: true}}),
        redaction8: () => ({array: {insert: () => ({}), before: true}}),
        redaction9: () => ({array: {insert: () => ({}), after: true}}),
        redaction11: () => ({array: {where: () => true, select: () => true}}),
        redaction12: () => ({array: {where: () => true, delete: 1}}),
        redaction13: () => ({array: {where: () => true, delete: true, somethingElse: false}}),
        redaction14: () => ({array: {where: () => true}}),
        redaction15: () => ({number: {where: () => true, delete: true}}),
        redaction16: () => ({array: {insert: () => true, before: () => 1, after: () => 1}}),
        redaction17: () => ({array: {insert: () => true}}),
        redaction18: () => ({array: {after: () => 1}}),
        redaction19: () => ({array: {before: () => 1}}),
    }
}
