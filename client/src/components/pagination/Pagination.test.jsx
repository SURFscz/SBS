import React from "react";
import {render} from "@testing-library/react";
import Pagination from "./Pagination";

describe("Pagination", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Pagination
                page={1}
                totalPages={5}
                onPageChange={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom page and totalPages", () => {
        const {asFragment} = render(
            <Pagination
                page={2}
                totalPages={10}
                onPageChange={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with no pages", () => {
        const {asFragment} = render(
            <Pagination
                page={1}
                totalPages={0}
                onPageChange={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
