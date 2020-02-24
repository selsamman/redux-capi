import { useRef, useState } from 'react';

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
        // We have two modes of operastion depending on whethe classes or functions are used for the component
        if (!componentInstance) {
            // eslint-disable-next-line react-hooks/rules-of-hooks
            let contextContainer = useRef(null);
            if (contextContainer.current) {
                // Restore context from reference
                context = contextContainer.current;
                context.__render_count__++; // We don't have a true render count so use calls to api as proxy
            } else {
                // Create a new context for this instance of the api's use in a component.
                contextContainer.current = context = Object.create(apiContext);
                // Since selectors depend on "this" we bind them so they can be called as simple functions
                bindFunctions(context);
                context.__render_count__ = 0;
            }
            // Set up a set state function that can trigger a render by modifying the state
            // eslint-disable-next-line react-hooks/rules-of-hooks
            const [, setSeq] = useState(1);
            context.__force_render__ = () => setSeq(context.__render_count__);
        } else {
            if (componentInstance.__capi_instance__) {
                // retrieve context from a component property
                context = componentInstance.__capi_instance__;
                context.__render_count__++;
            } else {
                // Create a new context for this instance of the api's use in a component.
                componentInstance.__capi_instance__ = context = Object.create(apiContext);
                // setup a function to force a render by modifying the state
                context.__render_count__ = 0;
                context.__force_render__ = () => componentInstance.setState({__render_count__: context.__render_count__});
                // Since selectors depend on "this" we bind them so they can be called as simple functions
                bindFunctions(context);
            }
        }
        Object.assign(context, contextProps ? contextProps : {});
        context.__selector_used__ = {};
        return context;
    }

    api.mount = (store, stateMap) => {
        apiContext.__store__ = store;
        apiContext.__state_map__ = stateMap;
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

        function selectorReferenced (apiInstance, prop, value) {
            apiInstance.__selector_used__[prop] = value;
            if (!apiInstance.__store_state_subscription__)
                apiInstance.__store_state_subscription__ = apiInstance.__store__.subscribe(() => {
                    console.log(JSON.stringify(apiInstance.__store__.getState()));
                    for (let selectorProp in apiInstance.__selector_used__)
                        if (apiInstance[selectorProp] !== apiInstance.__selector_used__[prop]) {
                            forceRender(apiInstance);
                            return;
                        }
                });
        }

        function forceRender (apiInstance) {
            apiInstance.__force_render__();
            // Update state with latest render count
            apiInstance.__store_state_subscription__();  // Unsubscribe
            apiInstance.__store_state_subscription__ = undefined;
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

}
