import React, {Component} from 'react'
import {applyMiddleware, createStore} from "redux";
import { createRenderer } from 'react-test-renderer/shallow';
import { createAPI, reducer, trace } from '../src';
import ReduxThunk from "redux-thunk";
const renderer1 = createRenderer();
const renderer2 = createRenderer();
const apiSpec = {
    redactions: {
        setWidgetData: (data) => ({
            widgets: {
                where: (state, widget, ix, {id}) => widget.id === id,
                assign: () => data
            }
        }),
        setTestValue: (data) => ({
            testValue: {set: () => data}
        })
    },
    selectors: {
        widgets: (state) => state.widgets,
        widget: (state, {id}) => state.widgets.find( w => w.id == id ),
        widgetMemo: [
            (select, {widgets, id}) => select(widgets, id),
            (widgets, id) => {
                log.push("widgetMemo called");
                return widgets.find(w => (w.id === id))
            }
        ],
        testValue: (state) => state.testValue,
        testValueObject: (state) => ({value: state.testValue}), // Will always be detected as a change
        testValueMemo: [ // memoized version won't have that problem
            (select, {testValue}) => select(testValue),
            (testValue) => {value: testValue}
        ]
    },
    thunks: {
        logThunk: ({widgets}) => () => console.log(widgets.length)
    }
}
let log = [];
let initialState = {
    widgets: [
        {id: 0, text: "zero"},
        {id: 1, text: "one"}
    ],
    testValue: 0
}
trace.log = (msg)=>{log.push(msg);console.log(msg)};
describe('Selector Processing', () => {
    it('Renders only the required component', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, initialState));
        const Widget = ({id}) => {
            const {widget} = api({id: id}, Widget);
            return (<text>{widget.text}</text>)
        }
        renderer1.render(<Widget id={0} />);
        renderer2.render(<Widget id={1} />);
        expect(getTextContent(renderer1.getRenderOutput())).toBe("zero");
        expect(getTextContent(renderer2.getRenderOutput())).toBe("one");
        expect(renderCount()).toBe(0);
        {
            const {setWidgetData} = api({id: 0}, {});
            setWidgetData({text: "zerozero"});
            expect(getTextContent(renderer1.getRenderOutput())).toBe("zerozero");
            expect(renderCount()).toBe(1);
        }
        {
            const {setWidgetData} = api({id: 1}, {});
            setWidgetData({text: "oneone"});
            expect(getTextContent(renderer2.getRenderOutput())).toBe("oneone");
            expect(renderCount()).toBe(1);
        }
    })
    it('Renders only the required component with memo', () => {
        const api = createAPI(apiSpec).mount(createStore(reducer, initialState, applyMiddleware(ReduxThunk)));
        const Widget = ({id}) => {
            const {widgetMemo, logThunk} = api({id: id}, Widget);
            logThunk();
            return (<text>{widgetMemo.text}</text>)
        }
        renderer1.render(<Widget id={0} />);
        renderer2.render(<Widget id={1} />);
        expect(getTextContent(renderer1.getRenderOutput())).toBe("zero");
        expect(getTextContent(renderer2.getRenderOutput())).toBe("one");
        expect(renderCount()).toBe(0);
        {
            const {setWidgetData} = api({id: 0}, {});
            setWidgetData({text: "zerozero"});
            expect(getTextContent(renderer1.getRenderOutput())).toBe("zerozero");
            expect(getTextContent(renderer2.getRenderOutput())).toBe("one");
            expect(log.filter(l => l.match(/widgetMemo called/i)).length).toBe(2);
            expect(renderCount()).toBe(1);
        }
        {
            const {setWidgetData} = api({id: 1}, {});
            setWidgetData({text: "oneone"});
            expect(getTextContent(renderer1.getRenderOutput())).toBe("zerozero");
            expect(getTextContent(renderer2.getRenderOutput())).toBe("oneone");
            expect(log.filter(l => l.match(/widgetMemo called/i)).length).toBe(2);
            expect(renderCount()).toBe(1);
        }
    })
    it('Returning new object in selectors cause extra renders ', () => {
        const TestValue = () => {
            const {testValueObject} = api({}, TestValue);
            return (<text>{JSON.stringify(testValueObject)}</text>)
        }
        const Widget = ({id}) => {
            const {widgetMemo} = api({id: id}, Widget);
            return (<text>{widgetMemo.text}</text>)
        }
        const api = createAPI(apiSpec).mount(createStore(reducer, initialState));
        const {setWidgetData, setTestValue} = api({id: 0}, {});
        renderer1.render(<Widget id={0} />);
        renderer2.render(<TestValue />);
        expect(renderCount()).toBe(0);
        setWidgetData({text: "zerozero"});
        // Expected 1 but because selectors use strict equality the testValue
        expect(renderCount()).toBe(2);
    })
    it('Returning new object in momoized selectors does not cause extra renders ', () => {
        const WidgetValue = () => {
            const {testValueMemo} = api({}, WidgetValue);
            return (<text>{JSON.stringify(testValueMemo)}</text>)
        }
        const Widget = ({id}) => {
            const {widgetMemo} = api({id: id}, Widget);
            return (<text>{widgetMemo.text}</text>)
        }
        const api = createAPI(apiSpec).mount(createStore(reducer, initialState));
        const {setWidgetData, setTestValue} = api({id: 0}, {});
        renderer1.render(<Widget id={0} />);
        renderer2.render(<WidgetValue />);
        expect(renderCount()).toBe(0);
        setWidgetData({text: "zerozero"});
        expect(renderCount()).toBe(1);
    })
})

const getTextContent = elem => {
    const children = Array.isArray(elem.props.children) ?
        elem.props.children : [ elem.props.children ]

    return children.reduce((out, child) =>
        out + (child.props ? getTextContent(child) : child)
        , '')
}
const renderCount = () => {
    const count = log.filter(l => l.match(/: render/i)).length;
    log = [];
    return count;
}
