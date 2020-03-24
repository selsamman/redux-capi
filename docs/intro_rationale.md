---
id: intro_rationale
title: Rationale for redux-capi
sidebar_label: Rationale
---
When redux was integrated into React with redux-react the primary integration vehicle was the High Order Component (HOC) which was "connected" to the redux store.  As part of that connection actions and selectors were pushed into properties and these properties fed to the lower order component.  With the advent of hooks this concept became inoperative and instead selectors and dispatchable actions were defined within the actual visual component.  In doing so this increased the coupling between "logic" and visual rendering.

redux-capi fully isolates logic from visual rendering.  And unlike HOCs which are bound to their lower level component they can be reused.  The API may contain the complete logic surrounding a subject area and be consumed by many different components each of which may consume only the portion that they need. The magic to making this work is that the selectors are in fact getters.  This allows redux-capi to track which selectors are used by which component and only force a re-render of the affected components.

redux-capi has attempted to address some of the pain points of redux-react while building on the fundemental advantages of reducers and immutability.

**Pain Point** | **Solution**
---|---
Substantial boiler plate code required | Declarative constructs reduce boiler plate by automating actions and reducers
Global name space for action names | Action names are scoped within a specific API
Application logic embedded in components | Application logic contained in API implementation rather than in an HOC or function-based component.
Presentation and logic tested together | Visual components and logic (API) can be tested independently
Composition and re-use (splitting reducer logic) requires significant coordination | API specs are largely independent and can be combined and mapped to different parts of the state shape 
 

