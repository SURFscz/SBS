import React from "react";
import {render} from "@testing-library/react";
import ServiceCard from "./ServiceCard";

const service = { logo: "fake_logo_for_testing.png" };

describe("ServiceCard", () => {
    it("matches snapshot with minimal props", () => {
        const {asFragment} = render(
            <ServiceCard
                service={service}
                name="Test Service"
                description="This is a test service."
                icon="test-icon"
                onClick={() => {
                }}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with all props", () => {
        const {asFragment} = render(
            <ServiceCard
                service={service}
                name="Test Service"
                description="This is a test service."
                icon="test-icon"
                onClick={() => {
                }}
                disabled={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
