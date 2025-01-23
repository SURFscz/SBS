import {capitalize, groupBy, removeDuplicates, sortObjects, splitListSemantically} from "../../utils/Utils";

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
    const objects = [{c: 0}, {c: 0}, {c: 1}, {c: 0}];
    const res = sortObjects(objects, "c", false).map(o => o.c);
    expect(res).toEqual([0, 0, 0, 1]);

    const reverse = sortObjects(objects, "c", true).map(o => o.c);
    expect(reverse).toEqual([1, 0, 0, 0]);

    const bug = [{c: 4}, {c: 1}, {c: 0}, {c: 3}];
    const bugfix = sortObjects(bug, "c", true).map(o => o.c);
    expect(bugfix).toEqual([4, 3, 1, 0]);

});

test("Remove duplicates", () => {
    const arr = [
        {id: 1, name: "one"},
        {id: 1, name: "one"},
        {id: 2, name: "two"},
    ];
    const unique = removeDuplicates(arr, "id");
    expect(unique).toEqual([
        {id: 1, name: "one"},
        {id: 2, name: "two"},
    ]);
});

test("Remove duplicates with undefined", () => {
    const arr = [
        {id: 1, name: "one"},
        {id: 1, name: "one"},
        undefined
    ];
    const unique = removeDuplicates(arr, "id");
    expect(unique).toEqual([
        {id: 1, name: "one"},
    ]);
});

test("splitListSemantically", () => {
    const arr = ["1", "2", "3", "4"]
    expect(splitListSemantically(arr, "and")).toEqual("1, 2, 3 and 4");
    expect(splitListSemantically(["1", "2"], "and")).toEqual("1 and 2");
    expect(splitListSemantically(["1"], "and")).toEqual("1");
    expect(splitListSemantically([], "and")).toEqual("");
});

test("capitalize", () => {
    expect(capitalize(undefined)).toEqual(undefined);
    expect(capitalize(null)).toEqual(null);
    expect(capitalize("")).toEqual("");
    expect(capitalize(" ")).toEqual(" ");
    expect(capitalize("test")).toEqual("Test");
})
