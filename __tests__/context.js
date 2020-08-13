import {createAPI, reducer, validation} from '../src';
import {applyMiddleware, createStore} from "redux";
import ReduxThunk from "redux-thunk";
const CounterSpecPart1 = {
    context: {
        boo: "hoo"
    }
};
const CounterSpecPart2 = {
    context: {
        ha: "haa",
    }
};

const ComposedSpec = [
    {
        spec: [
            CounterSpecPart1
        ],
    }, {
        api: 'sub',
        spec: [
            CounterSpecPart2,
        ],
    }
]

describe('Composed Counter API Testing', () => {

    it('can validate', () => {
        validation.errors = [];
        const api = createAPI(ComposedSpec).validate({})
                    .mount(createStore(reducer, {}));
        expect(validation.errors.length).toBe(0);
    })

    it('can boo/ha', () => {
        const api = createAPI(ComposedSpec).mount(createStore(reducer, {}));

        const {boo, sub} = api({}, {});
        expect(boo).toBe("hoo");
        expect(sub.ha).toBe("haa");
    })
});

const someAPISpec = {
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
const initialState = {
    files: [{name: "foo"}]
}

describe('Counter API Testing', () => {
    it('can delete', async () => {
        let deletedFile = [];
        let component = {};
        let FileSystemMock = {
            deleteAsync: (name) => deletedFile.push(name),
            documentDirectory: "docdir"
        }
        const api = createAPI({...someAPISpec, context: {FileSystem: FileSystemMock}})
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
