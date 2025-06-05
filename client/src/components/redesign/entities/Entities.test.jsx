import React from "react";
import {render} from "@testing-library/react";
import Entities from "./Entities";

const columns = [
    {name: "name", label: "Name"}
];

describe("Entities", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Entities
                entities={[]}
                onEntityClick={() => {
                }}
                onCreateEntity={() => {
                }}
                user={{admin: true}}
                columns={columns}
                modelName="modelName"
                defaultSort="asc"
                loading={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
