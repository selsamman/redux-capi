import { useRef, useState, useEffect } from 'react';
import {mapStateObjToArray, mapStateArrayToObj, combineStateMapArray, mapStateMap} from './mapState';
import {validateRedaction, validateSelector, validateThunk} from "./validate";
let componentSequence = 1;
export const trace = {log: false};

/*
createAPI will create context for the api itself that has all of the redaction, selectors, thunks and maps as
properties.  The context is actually a function that when called will create an object inherited from that context
such that it will be unique per-component.  This allows component-context specific properties to be kept separate
and allows for the tracking of selectors references by the component needed to determine when to re-render
 */
export const createAPI = (spec) => {

    // Internal component API context
    let apiContext = {
        __store__ : undefined,    // redux store will be filled by mount()
        __spec__ : spec,
    };

    // Process the api spec recursing as needed for included specs

    // Prepare return value which is the api itself which is called to create a component instance of the api
    const api =  (contextProps, componentInstance) => {
        const componentName = !componentInstance ? "" :
            (typeof componentInstance === 'function' ? componentInstance.name.toString() : componentInstance.constructor.name.toString());
        componentInstance = componentInstance && typeof componentInstance !== "function" ? componentInstance : undefined;
        let context;
        // We have two modes of operation depending on whether classes or functions are used for the component
        if (!componentInstance) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            let contextContainer = useRef(null);
            if (!contextContainer.current)
                contextContainer.current = createFunctionContext(contextProps, componentName);
            context = contextContainer.current;
            manageFunctionSubscriptions(context);
            context.__name__ = componentName;
        } else {
            if (!componentInstance.__capi_instance__)
                componentInstance.__capi_instance__ = context = createComponentContext(componentInstance, contextProps, componentName);
            context = componentInstance.__capi_instance__;
        }
        context.__render_count__++; // We don't have a true render count so use calls to api as proxyc
        assignProps(context, contextProps)
        clearSelectorsUsed(context)
        return apiContext.__mocks__ || context;

        function assignProps(context, contextProps) {
            for (let prop in contextProps)
                if (context[prop] && context[prop].__root_context__)
                    assignProps(context[prop], contextProps[prop])
                else
                    context[prop] = contextProps[prop];
        }
        function clearSelectorsUsed(context) {
            context.__selector_used__ = {}; // Clear values of selectors to determine value changes
            for (let prop in context)
                if (context[prop] && context[prop].__root_context__)
                    clearSelectorsUsed(context[prop]);
        }

    }

    api.validate = (validationStateShape) => {
        apiContext.__validation_state_shape__ = validationStateShape
        return api;
    }

    api.mount = (store, stateMap) => {
        apiContext.__store__ = store;
        processSpec(apiContext.__spec__, apiContext, mapStateObjToArray(stateMap));
        return api;
    }

    api.mock = (mocks, stateMap) => {
        if (!apiContext.__spec_processed__)
            processSpec(apiContext.__spec__, apiContext, stateMap);
        apiContext.__mocks__ = mocks;
        for (let prop in apiContext) {
            const fn = apiContext[prop];
            if (typeof fn === "function") {
                function mockFn () {
                    mocks[prop].calls.push(arguments);
                }
                mocks[prop] = mockFn;
                mocks[prop].calls = [];
            }
        }
        return mocks;
    }

    api.unmock = () => {
        apiContext.__mocks__ = undefined;
    }

    api.getState = () => {
        return apiContext.__store__.getState();
    }

    api._getContext = () => apiContext; // For testing
    api.getStore = () => apiContext.__store__;

    return api;

    // Process the api specification recursing as needed for included specs
    function processSpec(specParam, currentAPIContext, mountInherited, initialState) {

        if (specParam instanceof Array) {
            specParam.map((spec) => processSpec(spec, currentAPIContext, mountInherited))
            return;
        }

        const {selectors, thunks, redactions, mount, api, spec} = specParam;

        const map = mount ? combineStateMapArray(mountInherited, mapStateObjToArray(mount)) : mountInherited;

        // If this is to be a separate property on the api when need a sub-context which will apply to everything
        if (api) {
            currentAPIContext[api] = {
                __root_context__: apiContext,
                __parent_context__: currentAPIContext,
                __validation_state_shape__: currentAPIContext.__validation_state_shape__
            };
            currentAPIContext = currentAPIContext[api];
        }

        // Process inputs
        (spec || []).map(spec => processSpec(spec, currentAPIContext, map));

        for (let prop in selectors || {})
            processSelector(currentAPIContext, prop, selectors[prop], map);

        for (let prop in thunks || {})
            processThunk(currentAPIContext, prop, thunks[prop], map)

        for (let prop in redactions || {})
            processRedaction(currentAPIContext, prop, redactions[prop], map);

        apiContext.__spec_processed__ = true;

    }

    // Create a new context for this instance of the api's use in a function-based component.
    function createFunctionContext(contextProps, componentName) {
        let context = createContext(apiContext);
        // Since selectors depend on "this" we bind them so they can be called as simple functions
        bindFunctions(context);
        context.__render_count__ = 0;
        context.__component_instance__ = `${componentName} (${componentSequence++})`;
        // eslint-disable-next-line react-hooks/rules-of-hooks

        if (trace.log) trace.log(`${context.__component_instance__}: New Instance (${JSON.stringify(contextProps)})`);
        return context;
    }

    // Set up a set state function that can trigger a render by modifying the state
    function manageFunctionSubscriptions (context) {
        const [, setSeq] = useState(0);
        context.__force_render__ = (selectorName) => {
            if (trace.log) trace.log(`${context.__component_instance__}: Will Render (${selectorName} changed)`)
            setSeq(context.__render_count__);
        }       // eslint-disable-next-line react-hooks/rules-of-hooks
        useEffect(() => {
            return () => {
                freeContext(context);
                function freeContext(context) {
                    if (context.__store_state_subscription__)
                        context.__store_state_subscription__();
                    context.__store_state_subscription__ = undefined;
                    for (let prop in context)
                        if (context[prop] && context[prop].__root_context__)
                            freeContext(context[prop]);
                }
            };
        },[]);
    }

    // Create a new context for this instance of the api's use in a component.
    function createComponentContext (componentInstance, contextProps, componentName) {
        let context = createContext(apiContext)

        // setup a function to force a render by modifying the state
        context.__render_count__ = 0;
        context.__force_render__ = (selectorName) => {
            if (trace.log) trace.log(`${context.__component_instance__}: Will Render (${selectorName} changed)`)
            if (componentInstance.setState)
                componentInstance.setState({__render_count__: context.__render_count__});
        }
        context.__component_instance__ = `${componentName} (${componentSequence++})`;
        if (trace.log) trace.log(`${context.__component_instance__}: New Instance (${JSON.stringify(contextProps)})`);
        // Since selectors depend on "this" we bind them so they can be called as simple functions
        bindFunctions(context);
        context.__component_will_unmount = componentInstance.componentWillUnmount;
        componentInstance.componentWillUnmount = function () {
            freeContext(context);
            function freeContext(context) {
                if (context.__store_state_subscription__)
                    context.__store_state_subscription__();
                context.__store_state_subscription__ = undefined;
                for (let prop in context)
                    if (context[prop].__root_context__)
                        freeContext(context[prop]);
            }
            if (context.__component_will_unmount)
                context.__component_will_unmount.call(this);
        }
        return context;
    }
    function createContext(apiContext, rootContext) {
        let context = Object.create(apiContext);
        rootContext = rootContext || context;
        for (let prop in apiContext)
            if (apiContext[prop] && apiContext[prop].__root_context__) {
                    context[prop] = createContext(apiContext[prop], rootContext);
                    context[prop].__root_context__ = rootContext;
            }
        return context;
    }

}
// bind the thunks and redactions to preserve "this" when called standalone
function bindFunctions (obj) {
    for (let prop in obj)
        if (typeof obj[prop] === "function")
            obj[prop] = obj[prop].bind(obj)
        else if (obj[prop] && obj[prop].__root_context__)
            bindFunctions(obj[prop])
}

// when the store is changed compare all the selector values against the previous ones in this render cycle
function storeChanged(context) {
    for (let prop in context.__selector_used__) {
        let v2 = context.__selector_used__[prop];
        let v1 = context[prop];
        if (v1 !== v2) {
            context.__force_render__(prop);
            return;
        }
    }
}

// selectors are created as "getters" which record a value when they are referenced.  This is how we know
// the selector was referenced and whether or not value has changed because the state changed.
// memoized selectors are only called if the values which the selector uses as inputs change
function processSelector (apiContext, prop, selectorDef, map) {
    if (selectorDef instanceof  Array) {
        // For array definition of selector we capture and momize the selector
        let memoizedSelector = memoize(selectorDef[1]);
        let memoizedInvoker = selectorDef[0];
        // Create a getter that will invoke the invoker function and track the ref
        Object.defineProperty(apiContext, prop, {get: function () {
                const value = memoizedInvoker.call(null, memoizedSelector, this);
                selectorReferenced(this, prop, value);
                return value;
            }});
    } else
        // For a simple selector create a getter that just invokes the selector
        Object.defineProperty(apiContext, prop, {get: function () {
                const apiContext = this.__root_context__ || this;
                const value = selectorDef.call(null, mapStateMap(apiContext.__store__.getState(), map, this), this);
                selectorReferenced(this, prop, value);
                return value;
            }});
    if (apiContext.__validation_state_shape__)
        validateSelector(prop, selectorDef);

    function selectorReferenced (context, prop, value) {
        context.__selector_used__[prop] = value;
        if (!context.__store_state_subscription__) {
            const rootContext = context.__root_context__ || context;
            context.__store_state_subscription__ = rootContext.__store__.subscribe(() => {
                storeChanged(context);
            });
        }
    }

    // Simple memoize based on remembering the last value
    function memoize(selector) {
        let lastArguments = [];
        let lastResult = ()=>(false); // Won't compare the first time
        function getValue() {
            if (!firstLevelEqual(lastArguments, arguments))
                lastResult = selector.apply(null, arguments);
            lastArguments = arguments;
            return lastResult;
        };
        return getValue;
        function firstLevelEqual(obj1, obj2) {
            if (obj1.length !== obj2.length)
                return false;
            for (let prop in obj1)
                if (obj1[prop] !== obj2[prop])
                    return false;
            return true;
        }
    }
}
// Thunks are just dispatched with component context and current state (component context bound to "this")
function processThunk (apiContext, prop, element, map) {
    apiContext[prop] = function() {
        let originalArguments = arguments;
        const apiContext = this.__root_context__ || this;
        return apiContext.__store__.dispatch((dispatch, getState) => {
            return element.call(null, this, mapStateMap(getState(), map, this)).apply(null, originalArguments);
        });
    }
    if (apiContext.__validation_state_shape__)
        validateThunk(prop, element);
}

// Redactions are converted to a quasi-legal action with a type and the schema as a parameter
// They are not serializable because the schema has functions as properties and they use closures
function processRedaction (apiContext, prop, actionFunction, map) {

    apiContext[prop] = function() {
        const action = actionFunction.apply(null, arguments);
        const schema = map ? mapStateArrayToObj(map.concat(['__state_marker__']), action) : action;
        const apiContext = this.__root_context__ || this;
        apiContext.__store__.dispatch({
            type: prop,
            __schema__: schema,
            context: this,
            apiContext: apiContext});
        return schema; // for benefit of validation
    }

    if (apiContext.__validation_state_shape__) {
        const nonDispatchingAction = () => {
            const action = actionFunction();
            return map ? mapStateArrayToObj(map.concat(['__state_marker__']), action) : action;
        }
        validateRedaction(prop, nonDispatchingAction, apiContext.__validation_state_shape__);
    }
}







