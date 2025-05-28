import React from "react";
import {render} from "@testing-library/react";
import Tab from "./Tab";

describe("Tab", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Tab
                id="test-tab"
                label="Test Tab"
                onClick={() => {}}
                selected={false}
                activeTab="activeTab"
                name="tabName"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot when selected", () => {
        const {asFragment} = render(
            <Tab
                id="test-tab"
                label="Test Tab"
                onClick={() => {}}
                selected={true}
                activeTab="activeTab"
                name="tabName"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom className", () => {
        const {asFragment} = render(
            <Tab
                id="test-tab"
                label="Test Tab"
                onClick={() => {}}
                selected={false}
                className="custom-class"
                activeTab="activeTab"
                name="tabName"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
