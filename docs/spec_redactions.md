---
id: spec_redactions
title: Redactions
sidebar_label: Redactions
---
Redactions are self-reducing actions that contain a state schema which defines the path to a particular property and provides a function for returning a mutated value for that property.  

A redaction is a property with a function as the value.  The name of the property is the name of the self-dispatching function that will be created in the API.  The function is passed the arguments that consumer of the redaction passes to the function.  
```
functionName: (arguments) => (returns schema)
```
### Schema 

The schema defines the path to state properties and defines how those properties will be affected.  The path is defined as a hierarchy of objects where each property name corresponds to a property in the state hierarchy.  The hierarchy continues with subordinate objects until and an object that contains properties with functions attached is reached.  Such an object contains functions which determine what to do based on their property name.  They include:
 * Selecting an array element using **where** 
 * Inserting or appending an element to array with **insert** and **append**
 * Setting a value for a property with **set**
 * Assigning partial properties to an object with **assign**
 
 Because the entire schema is returned by the redaction function which is passed the arguments from consumer the functions may reference these arguments as a closure.
 ```
setFilter: (filterValue) => (
{
    widgetList: {
        filter: {
            set: () => filterValue
        }
    }
}
```
The functions in the schema have particular arguments that are passed to them and in many cases the object that contains them is expected to have other specifically named properties that collectively determine the disposition of the state property.  

### Set and Assign
```
state_property_name: {
    set: (state, property, context) => (return value)
}
```
```
state_property_name: {
    assign: (state, property, context) => (return value)
}
```
The arguments are:
* **state** the previous value of the state
* **property** the previous value of the particular state property
* **context** the component instance context

**set** mutates the state property to the new value returned from the function while **assign** expects an object and the individual propeties present are mutated (Object.assign)
### Append
```
state_array_property_name: {
    append: (state, context) => (return element value)
}
```
The arguments are:
 * **state** the previous value of the state
 * **context** the component instance context
 
 The function returns a new array element to be appended.
### Insert
```
state_array_property_name: {
    before: () => (state, context) => (return index value)
    insert: (state, context) => (return element value)
}
```
or
```
state_array_property_name: {
    after: () => (state, context) => (return index value)
    insert: (state, context) => (return element value)
}
```
The arguments are:
 * **state** the previous value of the state
 * **context** the component instance context
 
 The **after** function returns the index in the array after which the element is to be inserted and the **before** function returns the index in the array before which the element is to be inserted
### Where
When a state property is an array and only one element is to be affected the **where** is used to select that function. 
```
state_array_property_name: {
    where: (state, element, index, context) => (boolean return value)
    action_to_be_taken ...
}
``` 
The arguments are:
 * **state** the previous state of the particular state property
 * **element** the state value of the particular array element
 * **index** the index of the particular array element
 * **context** the context from which context properties can be extracted
 
 The action to be taken may be:
 * **set** 
 * **assign**
 * **select**
 
**select** allows you to select that element and continue the hierarchy
```
state_array_property_name: {
    where: (state, element, index, context) => (boolean return value)
    select: {
        state heirarchy or another where
    }
}
``` 
If the next level is another array you can use **where**
```
state_array_property_name: {
    where: (state, element, index, context) => (boolean return value)
    select: {
        where: (state, element, index, context) => (boolean return value)
        state heirarchy or another where
    }
}
```
Otherwise it would refer to a state property
```
state_array_property_name: {
    where: (state, element, index, context) => (boolean return value)
    select: {
        state_property_name: {
            state heirarchy or other action
        }
    }
}
```
