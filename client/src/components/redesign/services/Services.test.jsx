import React from "react";
import { render } from "@testing-library/react";
import Services from "./Services";

describe("Services", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <Services
                services={[]}
                onServiceClick={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with services", () => {
        const services = [
            { id: 1, name: "Service 1" },
            { id: 2, name: "Service 2" }
        ];
        const { asFragment } = render(
            <Services
                services={services}
                onServiceClick={() => {}}
                user={{ admin: true }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
