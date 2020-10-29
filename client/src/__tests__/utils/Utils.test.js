import {groupBy, sortObjects} from "../../utils/Utils";

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

test("Sort", () => {
    const objects = [{c:0},{c:0},{c:1},{c:0}];
    const res = sortObjects(objects,"c",false).map(o => o.c);
    expect(res).toEqual([0,0,0,1]);

    const reverse = sortObjects(objects,"c",true).map(o => o.c);
    expect(reverse).toEqual([1,0,0,0]);

    const bug = [{c:4},{c:1},{c:0},{c:3}];
    const bugfix = sortObjects(bug,"c",true).map(o => o.c);
    expect(bugfix).toEqual([4,3,1,0]);

});
