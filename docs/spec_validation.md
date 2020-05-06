---
id: spec_validation
title: Validating the API Spec
sidebar_label: Validation
---
Because the API specification semantics are so specific it is possible to catch many errors before you even get to testing the API.  That is done through the validate api function:

```
import {createAPI, reducer, validation} from '../src';
import { createStore, applyMiddleware } from 'redux';
import ReduxThunk from 'redux-thunk';

describe('API Testing', () => {
    it('spec validation passes', () => {
        validation.errors = [];
        const api = 
            createAPI(matrixAPISpec)
            .validate(defaultShape)
            .mount(createStore(reducer, defaultShape, applyMiddleware(ReduxThunk)));
        expect(validation.errors.length).toBe(0);
    })
})
```
There are a dozen or so different checks that are done on the spec including matching it up against the state shape to ensure that there is a state property for each state reference in the spec.  That is one of the most common mistakes in creating the spec.

Sometimes your initial state may not include all properties.  For example you might have a list of objects that you initially want to be an empty list yet you might have redactions that refer to properties in those nested objects.
  
  For that reason you may need a state shape for validation purposes that fully describes the nested structures in your state.  By doing so you can save a lot of time in debuging your spec since the reducer is not always able to detect missing state properties and simply will not perform the desired update in some instances.

