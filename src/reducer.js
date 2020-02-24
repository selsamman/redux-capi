/*
This reducer will accept actions that contain a state schema and function to return a value for a state property
Actions have a type of 'Redaction'.  This reducer may be combined in the normal fashion for reducers.
 */
export const reducer = (rootState, action) => {

    if (!action.__schema__)
        return rootState;

    // Process each high level state property
    let accumulator = { reactions: action.__schema__, oldState: rootState, newState: {} };
    return Object.getOwnPropertyNames(rootState).reduce(reducer, accumulator).newState;

    // Process state node (arrays normalized to return indes in value parameter)
    function reducer(accumulator, propOrIndex) {

        const oldState = accumulator.oldState[propOrIndex];
        let newState = oldState;

        // Determine whether this node is to be processed or bypassed
        let processChildNodes = false;
        let children = {};
        for (let childReactionNode in accumulator.reactions || {}) {

            // Match up the state with the reaction node and decide if we need to process it.  In the case of
            // stepping through array elements you could have more than one that matched
            const reactionNode = evaluate(accumulator.reactions, childReactionNode, newState, propOrIndex);

            // Process the node?
            if (reactionNode) {
                // execute any actions (set, delete, append, insert etc)
                newState = execute(reactionNode, newState);
                if (reactionNode.children) {
                    processChildNodes |= true;
                    Object.assign(children, reactionNode.children);
                }
            }
        }
        // If we have a reaction defined for this slice of the hierarchy we must copy state
        if (processChildNodes) {
            let subAccumulator;
            if (newState instanceof Array)
                subAccumulator =  oldState.reduce(arrayReducer, { oldState: newState, newState: [], reactions: children });
            else
                subAccumulator = Object.getOwnPropertyNames(oldState).reduce(reducer, { oldState: newState, newState: {}, reactions: children });

            // Trim nulls and undefined values out of arrays if needed
            if (subAccumulator.filterArray)
                newState = subAccumulator.newState.filter((item) => (item !== null && typeof item !== 'undefined'));
            else
                newState = subAccumulator.newState;
        }

        // For array elements that result in undefined we want to alert the top level that a filter may be necessary
        if ((accumulator.oldState instanceof Array && typeof newState === 'undefined') || newState === null)
            accumulator.filterArray = true;

        // If we have reducers for this slice we pass the old state to the reducers one at a time
        // and expect them to return a new state for this slice of the tree
        accumulator.newState[propOrIndex] = newState;

        return accumulator;
    }
    // Normalize object and a array reduction so we allways have and index into the state being copied
    function arrayReducer(accumulator, currentValue, currentIndex) {
        return reducer(accumulator, currentIndex);
    }
    // Execute the reducer function
    function execute(reducer, newState) {
        const context = action.context;
        if (reducer.set) {
            return reducer.set.call(null, mapState(rootState), newState, context);
        } else if (reducer.append) {
            return newState.concat(reducer.append.call(null, mapState(rootState), context));
        } else if (reducer.insert) {
            let position = newState.length;
            if (reducer.after)
                position = reducer.after.call(null, mapState(rootState), context) + 1;
            if (reducer.before)
                position = Math.max(reducer.before.call(null, mapState(rootState), context), 0);
            var insertResult = reducer.insert.call(null, mapState(rootState), context);
            var shallowCopy = newState.slice();
            shallowCopy.splice(position, 0, insertResult);
            return shallowCopy;
        } else if (reducer.assign) {
            return Object.assign({}, newState, reducer.assign.call(null, mapState(rootState), newState, context));
        } else if (reducer.delete) {
            return undefined;
        } else
            return newState
    }

    // Returns a result with all the commands as properties, an array of children reaction nodes to be processed
    // assuming the reaction node matches the state property name or in the case of an array matches the array
    // element as evaluated by calling out to the where function.  When processing the array itself we have
    // to push the reaction node into the children array so it will be processed when the elements are evaluated
    function evaluate(reactionNode, reactionNodeKey, element, propOrIndex) {

        // Make sure reaction node matches state property name (unless processing an array)
        if (typeof propOrIndex != "number" && reactionNodeKey !== propOrIndex)
            return null;

        const result = {};
        for (let key in reactionNode[reactionNodeKey]) {
            const reactionNodeValue = reactionNode[reactionNodeKey][key];

            // Are we dealing with array or array element
            if (typeof reactionNodeValue === "function"  && key === "where") {
                if (typeof propOrIndex !== "number") // An array?
                    // Push this reaction node into children to be evaluated as array elements are stepped through
                    return {children: reactionNode}

                // Otherwise and array instance and we eveluate if this is the correct instance
                if (reactionNode.noMap) {  // If these nodes at root (from stateMap) don't map state passed in
                    if (!reactionNodeValue.call(null, rootState, element, propOrIndex, action.context))
                        return null;
                } else {
                    if (!reactionNodeValue.call(null, mapState(rootState), element, propOrIndex, action.context))
                        return null;
                }
                continue; // Don't add where
            }
            // These are commands to be executed
            if ( typeof reactionNodeValue !== "object")
                result[key] = reactionNodeValue;
            else { // Otherwise just child reactionNodes
                if (!result.children)
                    result.children = {}
                result.children[key] = reactionNodeValue;
            }
        }
        return result;
    }
    /**
     * Substitute state map into top level state
     * @param topLevelState
     * @param stateMap
     * @param action
     */
    function mapState(rootState) {
        return mapStateMap(rootState, action.stateMap);
    }
};

function mapStateMap(rootState, stateMap) {
    if (stateMap) {
        var newState = Object.assign({}, rootState);
        for (var stateProp in stateMap)
            newState[stateProp] = evaluateState(stateMap[stateProp])
        return newState;
    } else
        return rootState;

    function evaluateState(stateSlices) {
        var stateSlice = rootState
        stateSlices.map((sliceComponent) => {
            if (typeof sliceComponent == 'function') {
                if (stateSlice instanceof Array)
                    stateSlice = stateSlice.find((item, index) => sliceComponent.call(null, rootState, item, index));
                else {
                    var stateSliceProps = Object.getOwnPropertyNames(stateSlice);
                    var stateSliceProp = stateSliceProps.find((prop)=> sliceComponent.call(null, rootState, stateSlice[prop]))
                    stateSlice = stateSlice[stateSliceProp];
                }
            } else {
                stateSlice = stateSlice[sliceComponent];
            }
            return undefined; // Not interested in results of map
        });
        return stateSlice;
    }
}

