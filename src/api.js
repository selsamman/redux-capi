import { useRef, useState, useEffect } from 'react';
let componentSequence = 1;
let trace = {log(){}};
export const createAPI = ({selectors, thunks, redactions}) => {

    // Internal component API context
    let apiContext = {
        __store__ : undefined,    // redux store will be filled by mount()
    };

    // Process inputs
    for (let prop in selectors || {})
        processSelector(prop, selectors[prop]);

    for (let prop in thunks || {})
        processThunk(prop, thunks[prop])

    for (let prop in redactions || {})
        processRedaction(prop, redactions[prop]);

    // Prepare return value which is the api itself which is called to create a component instance of the api
    const api =  (contextProps, componentInstance) => {
        let context;
        // We have two modes of operation depending on whether classes or functions are used for the component
        if (!componentInstance) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            let contextContainer = useRef(null);
            if (contextContainer.current) {
                // Restore context from reference
                context = contextContainer.current;
                context.__render_count__++; // We don't have a true render count so use calls to api as proxy
                trace.log("Render Component " + context.__component_instance__);
            } else {
                // Create a new context for this instance of the api's use in a component.
                contextContainer.current = context = Object.create(apiContext);
                // Since selectors depend on "this" we bind them so they can be called as simple functions
                bindFunctions(context);
                context.__render_count__ = 0;
                context.__component_instance__ = componentSequence++;
                trace.log("New Component " + context.__component_instance__ + " props:" + JSON.stringify(contextProps));
                context.__force_render__ = () => {
                    trace.log("force render Component " + context.__component_instance__+ " state " + context.__render_count__)
                    setSeq(context.__render_count__);
                }
            }
            // Set up a set state function that can trigger a render by modifying the state
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [, setSeq] = useState(1);
            // eslint-disable-next-line react-hooks/rules-of-hooks
            useEffect(() => {
                return () => {
                    if (context.__store_state_subscription__)
                        context.__store_state_subscription__();
                    context.__store_state_subscription__ = undefined;
                };
            },[]);
        } else {
            if (componentInstance.__capi_instance__) {
                // retrieve context from a component property
                context = componentInstance.__capi_instance__;
                context.__render_count__++;
                trace.log("Render Component " + context.__component_instance__);
            } else {
                // Create a new context for this instance of the api's use in a component.
                componentInstance.__capi_instance__ = context = Object.create(apiContext);
                // setup a function to force a render by modifying the state
                context.__render_count__ = 0;
                context.__force_render__ = () => {
                    trace.log("force render Component " + context.__component_instance__+ " state " + context.__render_count__)
                    if (componentInstance.setState)
                        componentInstance.setState({__render_count__: context.__render_count__});
                }
                context.__component_instance__ = componentSequence++;
                trace.log("New Component " + context.__component_instance__  + " props:" + JSON.stringify(contextProps));
                // Since selectors depend on "this" we bind them so they can be called as simple functions
                bindFunctions(context);
                context.__component_will_unmount = componentInstance.componentWillUnmount;
                componentInstance.componentWillUnmount = function () {
                    if (context.__store_state_subscription__)
                        context.__store_state_subscription__();
                    context.__store_state_subscription__ = undefined;
                    if (context.__component_will_unmount)
                        context.__component_will_unmount.call(this);
                }
            }
        }
        Object.assign(context, contextProps ? contextProps : {});
        context.__selector_used__ = {};
        return apiContext.__mocks__ || context;
    }

    api.mount = (store, stateMap) => {
        apiContext.__store__ = store;
        apiContext.__state_map__ = stateMap;
        return api;
    }
    api.mock = (mocks) => {
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
    api._getStore = () => apiContext.__store__;
    return api;

    // Utility functions that use apiContext in their closures

    function processSelector (prop, selectorDef) {
        if (selectorDef instanceof  Array) {
            // For array definition of selector we capture and momize the selector
            let memoizedSelector = memoize(selectorDef[1]);
            let memoizedInvoker = selectorDef[0];
            // Create a getter that will invoke the invoker function and track the ref
            Object.defineProperty(apiContext, prop, {get: function () {
                    const value = memoizedInvoker.call(null, memoizedSelector, this);
                    trace.log("selector ref " + prop + ": " + JSON.stringify(value));
                    selectorReferenced(this, prop, value);
                    return value;
                }});
        } else
            // For a simple selector create a getter that just invokes the selector
            Object.defineProperty(apiContext, prop, {get: function () {
                    const value = selectorDef.call(null, this.__store__.getState(), this);
                    selectorReferenced(this, prop, value);
                    return value;
                }});

        function selectorReferenced (context, prop, value) {
            context.__selector_used__[prop] = value;
            if (!context.__store_state_subscription__) {
                context.__store_state_subscription__ = context.__store__.subscribe(() => {
                    storeChanged(context);
                });
            }
        }

        function memoize(selector) {
            let lastArguments = [];
            let lastResult = null;
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

    function processThunk (prop, element) {
        apiContext[prop] = function() {
            let originalArguments = arguments;
            this.__store__.dispatch((dispatch, getState) => {
                element.call(null, this, getState()).apply(null, originalArguments);
            });
        }
    }

    function processRedaction (prop, actionFunction) {
        apiContext[prop] = function() {
            var action = actionFunction.apply(null, arguments);
            this.__store__.dispatch({type: prop, __schema__: {...action}, context: this, stateMap: apiContext.__state_map__});
        }
    }

    function bindFunctions (obj) {
        for (let prop in obj)
            if (typeof obj[prop] === "function")
                obj[prop] = obj[prop].bind(obj)
    }

    function storeChanged(context) {
        trace.log("Store changed for component " + context.__component_instance__ + " : " +JSON.stringify(context.__store__.getState()));
        trace.log("Selectors: " + Object.getOwnPropertyNames(context.__selector_used__));
        for (let prop in context.__selector_used__) {
            let v2 = context.__selector_used__[prop];
            let v1 = context[prop];
            //trace.log("compare " + prop + ": " + JSON.stringify(v1) + " ==? " + JSON.stringify(v2));
            if (v1 !== v2) {
                context.__force_render__(context);
                return;
            }
        }
    }
 }
