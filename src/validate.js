export const validateSelector = (prop, selector) => {
    if (selector instanceof Array) {
        if (selector.length !== 2 || typeof selector[0] !== 'function' || typeof selector[1] !== 'function')
            error(prop, "selector arrays must have two instances of functions")
    } else if (typeof selector !== 'function')
        error(prop, "selector must be an array or a function");
    return;
}

export const validateThunk = (prop, thunk) => {
    if (typeof thunk !== 'function')
        error(prop, "thunks must be a function")
}

export const validateRedaction = (redactionName, redaction, initialState) => {

    let schema;
    try {
        schema = redaction();
        if (typeof schema !== 'object') {
            error(redactionName, "redaction did not return a schema")
            return;
        }
    } catch (e) {
        error(redactionName, "redaction returned an exception " + e);
        return;
    }
    validateRedactionSchema(schema);
    function validateRedactionSchema(schema, path, state) {
        path = path || "";
        state = state || initialState;

        if (schema instanceof Array) {
            if (typeof schema[0] !== 'function' || typeof schema[1] !== 'object') {
                error(redactionName + path, "[] first element must be function and second schema path");
                return;
            }
            if (!(state instanceof Array)) {
                error(redactionName + path, "does not have corresponding state shape");
                return;
            }
            validateRedactionSchema(schema[1], path + ".[]", state[0])
        }
        else if (Object.keys(schema).find(p =>
                typeof schema[p] === 'function' || typeof schema[p] === 'boolean')) {
            if (typeof state === 'undefined') {
                error(redactionName + path, "does not have corresponding state shape");
                return
            }
            Object.keys(schema).map( actionProp => {
                const actionPath = path + "." + actionProp;
                switch(actionProp) {
                    case 'where':
                    case 'set':
                    case 'assign':
                    case 'before':
                    case 'after':
                    case 'insert':
                    case 'append':
                        if (typeof schema[actionProp] !== 'function')
                            error(redactionName + actionPath, "must be a function");
                        break;
                    case 'select':
                        if (typeof schema[actionProp] !== 'object')
                            error(redactionName + actionPath, "must be an object");
                        break;
                    case 'delete':
                        if (schema[actionProp] !== true)
                            error(redactionName + actionPath, "must be true");
                        break;
                    default:
                        error(redactionName + actionPath, "extraneous property");
                }
                if (actionProp === 'where' &&
                    !(schema.select || schema.set || schema.assign || schema.delete))
                    error(redactionName + path, actionProp + " not paired with action");
                if (['append', 'insert', 'after', 'where'].includes(actionProp) &&
                    !(state instanceof Array))
                    error(redactionName + path, "corresponding state must be an Array");
                if ((actionProp === 'insert' && !(schema.before || schema.after)) ||
                    (actionProp === 'after' && schema.before) ||
                    (actionProp === 'after' && !schema.insert) ||
                    (actionProp === 'before' && !schema.insert))
                    error(redactionName + path, "before/after must be paired with insert");
                if (actionProp === 'select')
                    validateRedactionSchema(schema.select, path + ".select", state[0])
            })

        } else
            Object.keys(schema).map(prop => {
                const schemaPath = path + "." + prop;
                if (prop === '__state_marker__')
                    validateRedactionSchema(schema[prop], path, state)
                else if (typeof state[prop] === 'undefined')
                    error(redactionName + schemaPath, "does not have corresponding state shape");
                else
                    validateRedactionSchema(schema[prop], schemaPath, state[prop])
            })
    }
}
export const validation = {errors: [], isValid: true};
function error (prop, error) {
    const errorMsg = `redux-capi - ${prop}: ${error}`;
    validation.errors.push(errorMsg);
    validation.isValid = false;
    console.log(errorMsg);
}


