import React from "react";
import {render} from "@testing-library/react";
import TabularData from "./TabularData";

describe("TabularData", () => {
    it("matches snapshot with minimal props", () => {
        const {asFragment} = render(
            <TabularData
                data={[]}
                columns={[]}
                onRowClick={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with data and columns", () => {
        const data = [
            { id: 1, name: "Item 1", value: "Value 1" },
            { id: 2, name: "Item 2", value: "Value 2" }
        ];
        const columns = [
            { field: "id", headerName: "ID" },
            { field: "name", headerName: "Name" },
            { field: "value", headerName: "Value" }
        ];
        const {asFragment} = render(
            <TabularData
                data={data}
                columns={columns}
                onRowClick={() => {}}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
