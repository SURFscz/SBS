import {pagination} from "../../utils/Pagination";

test("pagination", () => {

    const expectations = [[1, 2, 3, "...", 20],
        [1, 2, 3, 4, "...", 20],
        [1, 2, 3, 4, 5, "...", 20],
        [1, 2, 3, 4, 5, 6, "...", 20],
        [1, 2, 3, 4, 5, 6, 7, "...", 20],
        [1, "...", 4, 5, 6, 7, 8, "...", 20],
        [1, "...", 5, 6, 7, 8, 9, "...", 20],
        [1, "...", 6, 7, 8, 9, 10, "...", 20],
        [1, "...", 7, 8, 9, 10, 11, "...", 20],
        [1, "...", 8, 9, 10, 11, 12, "...", 20],
        [1, "...", 9, 10, 11, 12, 13, "...", 20],
        [1, "...", 10, 11, 12, 13, 14, "...", 20],
        [1, "...", 11, 12, 13, 14, 15, "...", 20],
        [1, "...", 12, 13, 14, 15, 16, "...", 20],
        [1, "...", 13, 14, 15, 16, 17, "...", 20],
        [1, "...", 14, 15, 16, 17, 18, 19, 20],
        [1, "...", 15, 16, 17, 18, 19, 20],
        [1, "...", 16, 17, 18, 19, 20],
        [1, "...", 17, 18, 19, 20],
        [1, "...", 18, 19, 20]]
    for (let i = 1; i <= expectations.length; i++) {
        expect(pagination(i, expectations.length)).toEqual(expectations[i - 1]);
    }
});