const stateObj = {a:{b:[()=>(0),[()=>0,{c: {d: true}}]]}};
export function mapStateObjToArray(map) {
    if (!map)
        return undefined;

    let arrayMap = [];
    processLevel(map);
    return arrayMap;

    function processLevel(level) {
        if (typeof level === "object" || level instanceof Array)
            if (level instanceof Array) {
                arrayMap.push(level[0])
                processLevel(level[1])
            } else if (level.where) {
                arrayMap.push(level.where)
                processLevel(level.select);
            } else {
                const props = Object.getOwnPropertyNames(level);
                if (props.length > 1)
                    throw "Incorrect property map " + JSON.stringify(parent);
                const prop = props[0];
                arrayMap.push(prop);
                processLevel(level[prop]);
            }
    }
}

export function mapStateArrayToObj(map, schema) {
    const obj = {}
    let position = obj;
    let prop = undefined;
    map.map((element) => {
        if (typeof element === "function") {
            if (position instanceof Array) {
                position[1] = [element]
                position = position[1]
            } else {
                position[prop] = [element]
                position = position[prop];
            }
            prop = undefined;
        } else {
            if (prop) {
                if (position instanceof Array) {
                    position[1] = {}
                    position[1][prop] = {}
                    position = position[1][prop]
                } else {
                    position[prop] = {};
                    position = position[prop]
                }
            }
            prop = element;
        }
    });
    if (prop) {
        if (position instanceof Array) {
            position[1] = {[prop]: schema || true}
        } else {
            position[prop] = schema || true;
        }
    } else {
        if (position instanceof Array) {
            position[1] = schema || true
        }
    }
    return obj;
}

export function combineStateMapArray(parent, child) {
    if (parent)
        return parent.concat(['__state_marker__']).concat(child)
    else
        return child;
}

export function mapStateMap(rootState, stateMap, apiContext) {
    if (!stateMap)
        return rootState;
    let stateSlice = Object.assign({}, rootState)
    stateMap.map((sliceComponent) => {
        if (sliceComponent === '__state_marker__') {
            rootState = stateSlice;
            return;
        }
        if (typeof sliceComponent == 'function') {
            if (stateSlice instanceof Array)
                stateSlice = stateSlice.find((item, index) => sliceComponent.call(null, rootState, item, index, apiContext));
            else {
                const stateSliceProps = Object.getOwnPropertyNames(stateSlice);
                const stateSliceProp = stateSliceProps.find((prop)=> sliceComponent.call(null, rootState, stateSlice[prop]))
                stateSlice = stateSlice[stateSliceProp];
            }
        } else {
            stateSlice = stateSlice[sliceComponent];
        }
        return undefined; // Not interested in results of map
    });
    return stateSlice;
}
