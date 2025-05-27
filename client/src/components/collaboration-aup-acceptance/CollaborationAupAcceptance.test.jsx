import React from "react";
import {render} from "@testing-library/react";
import CollaborationAupAcceptance from "./CollaborationAupAcceptance";

jest.mock("../../locale/I18n", () => ({
    t: key => key
}));
jest.mock("../checkbox/CheckBox", () => props => (
    <div data-testid="checkbox">{JSON.stringify(props)}</div>
));
jest.mock("../_redesign/Logo", () => props => (
    <img data-testid="logo" {...props} />
));
jest.mock("../../utils/Utils", () => ({
    isEmpty: obj => !obj || (typeof obj === "object" && Object.keys(obj).length === 0)
}));
jest.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => <span data-testid="icon"/>
}));

const services = [
    {
        id: 1,
        name: "Service One",
        logo: "logo1.png",
        accepted_user_policy: "https://aup.example.com",
        privacy_policy: "https://privacy.example.com"
    }
];

const serviceEmails = {
    1: ["support@example.com"]
};

describe("CollaborationAupAcceptance", () => {
    it("matches snapshot", () => {
        const {asFragment} = render(
            <CollaborationAupAcceptance
                services={services}
                disabled={true}
                serviceEmails={serviceEmails}
                setDisabled={jest.fn()}
                allServiceAupsAgreedOn={false}
            >
                <div>Child content</div>
            </CollaborationAupAcceptance>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
