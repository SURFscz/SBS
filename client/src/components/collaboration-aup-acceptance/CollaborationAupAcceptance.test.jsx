import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import CollaborationAupAcceptance from "./CollaborationAupAcceptance";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
t: key => key
}));
vi.mock("../checkbox/CheckBox", () => ({
    default: (props) => (
        <div data-testid="checkbox">{JSON.stringify(props)}</div>
    )
}));
vi.mock("../redesign/logo/Logo", () => ({
    default: (props) => (
        <img data-testid="logo" {...props} />
    )
}));
vi.mock("../../utils/Utils", () => ({
    isEmpty: obj => !obj || (typeof obj === "object" && Object.keys(obj).length === 0)
}));
vi.mock("@fortawesome/react-fontawesome", () => ({
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
                setDisabled={vi.fn()}
                allServiceAupsAgreedOn={false}
            >
                <div>Child content</div>
            </CollaborationAupAcceptance>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
