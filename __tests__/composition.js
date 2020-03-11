describe('matrix.js', () => {it('not generate empty test error', () => {})})
import {mapStateObjToArray, mapStateArrayToObj} from '../src/mapState';

import {applyMiddleware, createStore} from "redux";
import { createAPI, reducer } from '../src';
import ReduxThunk from "redux-thunk";

const CounterSpecPart1 = {
    redactions: {
        increment: () => ({
            count: {
                set: (state) => (state.count + 1)
            },
            log: {
                set: (state) => state.log + " increment"
            }
        })
    },
    selectors: {
        count: (state) => state.count
    }
};
const CounterSpecPart2 = {
    thunks: {
        increments: ({increment}) => (n) => {
            while (n--)
                increment();
        }
    }
};

const ComposedSpec = [
    {
        spec: [
            CounterSpecPart1, // include a single count api
            CounterSpecPart2
        ],
        mount: {single: true},
    }, {
        api: 'multiCounters',// counters api will be referenced by multiCounters
        spec: [
            CounterSpecPart1, // include a single count api
            CounterSpecPart2,
        ],
         mount: {
            multi: {
                where: (state, item, ix, api) => api.counterIx === ix
            }
        },
    }
]

const initialState = {
    data: {
        single: {
            count: 1, log: ""
        },
        multi: [
            {count: 2, log: ""},
            {count: 3, log: ""}
        ]
    }
}

const mountMap = {
    data: true
}
const stateArray1 = ['a', 'b', ()=>(0), ()=>0, 'c','d'];
const stateObj1 = {a:{b:[()=>(0),[()=>0,{c: {d: true}}]]}};
const stateArray2 = ['a', 'b', ()=>(0), ()=>0];
const stateObj2 = {a:{b:[()=>(0),[()=>0, true]]}};
describe('Composed Counter API Testing', () => {

    it ('can map state obj to Array', () => {
        expect(JSON.stringify(mapStateObjToArray(stateObj1))).toBe(JSON.stringify(stateArray1))
        expect(JSON.stringify(mapStateObjToArray(stateObj2))).toBe(JSON.stringify(stateArray2))
    })

    it ('can map state Array to obj', () => {
        expect(JSON.stringify(mapStateArrayToObj(stateArray1))).toBe(JSON.stringify(stateObj1))
        expect(JSON.stringify(mapStateArrayToObj(stateArray2))).toBe(JSON.stringify(stateObj2))
    });

    it('can increment', () => {
        const api = createAPI(ComposedSpec).mount(createStore(reducer, initialState, applyMiddleware(ReduxThunk)), mountMap);
        const component = {};
        const params = {multiCounters: {counterIx: 1}};
        {
            const {increment, increments, multiCounters} = api(params, component);
            increment();
            increments(2);
            expect(api.getState().data.single.count).toBe(4);
            {
                const {increment, increments} = multiCounters;
                increment();
                increments(2);
                expect(api.getState().data.multi[1].count).toBe(6);
            }
        } {
            const {count, multiCounters} = api(params, component);
            expect(count).toBe(4);
            {
                const {count} = multiCounters;
                expect(count).toBe(6);
            }
        }
    })
});

const phoneState = {
    accounts: {list: [{appleID: ""}], nextId: 1},
    accountData: [
        {
            contacts: {
                list: [],
                nextId: 1
            },
            messages: {
                list: [],
                nextId: 1
            }
        }
    ],
};
const List = (name) => ({
    redactions: {
        add: (item) => ({
            list: {
                append: ({nextId})=>({...item, id: nextId})
            },
            nextID: {
                set: (state, nextId) => nextId + 1
            }
        }),
        mod: (data) => ({
            list: [
                (state, item, ix, {cix}) => ix === cix,
                {set: () => data}
            ]
        })
    },
    selectors: {
        [name + 's']: ({list}) => list,
        [name]: [
            (select, api) => select(api[name + 'ID'], api[name + 's']),
            (id, list) => list.filter((item) => (item.id === id))
        ]
    },
    mount: {[name] : true}
})
const Prop = (prop) => ({
    redactions: (value) => ({
        [prop]: {
            set: (state, item) => value
        }
    }),
    selectors: {
        [prop]: (state) => (state[prop])
    }
})
const Accounts = [
    {
        spec: List('account'),
        state: 'accounts', // acccounts[n].list[3]
    }, {
        api: 'contacts',
        spec: List('contacts'),
        mount: {accountData: [(state, item, ix, {cix}) => (ix === cix)]}
    }, {
        api: 'messages',
        spec: List('messages'), // accountData[n].messages[m]
        mount: {accountData: [(state, item, ix, {cix}) => (ix === cix)]}
    }
]

const ListPair = [
    {
        spec: List('left'),
        api: 'left',
    }, {
        spec: List('right'),
        api: 'right',
    },
    {
        spec: Prop('format')
    },
]
const Diff = [
    {
        spec: [
            List('final'),
            Prop( 'conversionType')
        ]
    }, {
        api: 'source',
        spec: [
            ListPair,
            Prop('format')
        ],
        mount: {source: true}
    }
]
const diffState = {
    final: {list: [], nextId: 1},
    conversionType: 'foo',
    source: {
        left: {list: [], nextId: 1},
        right: {list: [], nextId: 1},
        format: 'ascii'
    }
}


/*
<spec> = {redactions: <redactions>, selectors: <selectors>, thunks: <thunks>, spec: <spec>, prop: <prop>, state: <map>}
         or
         [<spec>, ...]

Mapping has two effects on processing of redactions, thunks and selectors

1) It provides a higher level schema for redactions that causes state references to be deeper

2) It provides state values of lower level properties to be sent to any functions that receive state in their parameters
   including selectors, thunks and functions embedded in a redaction schema

We need a way to work down the

 */
