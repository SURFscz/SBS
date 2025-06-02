import React from "react";
import {render} from "@testing-library/react";
import Tabs from "./Tabs";

const Tab = (props) => <div>{props.name}</div>;
Tab.displayName = "Tab";

describe("Tabs", () => {
    it("matches snapshot with default props", () => {
        const {asFragment} = render(
            <Tabs tabs={[]} activeTab={null} onTabChange={() => {
            }}>
                {[<Tab key="1" name="first tab" label="first label" activeTab="active"/>]}
            </Tabs>
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("matches snapshot with custom tabs and active tab", () => {
        const tabs = [
            {id: "tab1", label: "Tab 1"},
            {id: "tab2", label: "Tab 2"}
        ];
        const {asFragment} = render(
            <Tabs tabs={tabs} activeTab="tab1" onTabChange={() => {
            }}>
                {[<Tab key="1" name="first tab" label="first label" activeTab="active"/>]}
            </Tabs>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
