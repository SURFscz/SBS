import {groupBy} from "../../utils/Utils";

test("GroupBy", () => {
    expect({
        "bar": [
            {"foo": "bar", "id": 1},
            {"foo": "bar", "id": 1},
            {"foo": "bar", "id": 3}
        ],
        "barbar": [
            {"foo": "barbar", "id": 2},
            {"foo": "barbar", "id": 2}
        ]
    }).toEqual(groupBy([
        {foo: "bar", id: 1},
        {foo: "barbar", id: 2},
        {foo: "bar", id: 1},
        {foo: "bar", id: 3},
        {foo: "barbar", id: 2},], "foo"));
});
