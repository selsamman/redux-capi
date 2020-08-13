---
id: spec_dependency
title: Dependency Injection
sidebar_label: Injection
---
Thunks end up becoming the core logic of an application.  As such that have to have many dependencies with other external components like file systems and other libraries.  Dependency injection allows you to inject these dependencies.  The thunks then reference the injected dependencies which can easily be substituted when testing.

This is done by defining "context" in the API spec.  Assume you have this spec:
```
export const apiSpec = {
   selectors: {
       files: (state) => state.files
   },
   thunks: {
       deleteFile: ({FileSystem, deleteLocalFile}) => async name => {
           await FileSystem.deleteAsync(FileSystem.documentDirectory + "/" + name);
           deleteLocalFile(name);
       }
   },
   redactions: {
       deleteLocalFile: (name) => ({
           files: {
               where: (state, file) => {
                   return file.name === name},
               delete: true
           }
       })
   }
}
```
In your application you simply inject FileSystem where you create the API

```
import * as FileSystem from 'expo-file-system';
import {apiSpec} from './capi/someAPI'

const export someAPI = createAPI({...apiSpec, context: {FileSystem: FileSystem}});  
```
Now the API will have the normal file system available to it but in the test you can mock it:
```
import {apiSpec} from './capi/someAPI'

const initialState = {
    files: [{name: "foo"}]
}

describe('Counter API Testing', () => {
    it('can delete', async () => {
        let deletedFile = [];
        let component = {};
        const FileSystemMock = {
            deleteAsync: (name) => deletedFile.push(name),
            documentDirectory: "docdir"
        }
        const api = createAPI({...apiSpec, context: {FileSystem: FileSystemMock}})
                    .mount(createStore(reducer, initialState, applyMiddleware(ReduxThunk)));
        {
            let {deleteFile} = api({}, component);
            await deleteFile("foo");
        }
        {
            let {files} = api({}, component);
            expect(deletedFile[0]).toBe("docdir/foo");
            expect(files.length).toBe(0);
        }
    })
});
```
