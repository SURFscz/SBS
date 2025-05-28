import React from "react";
import {render} from "@testing-library/react";
import JoinRequestDialog from "./JoinRequestDialog";

jest.mock("../../locale/I18n", () => ({
    t: (key, opts) => key + (opts ? JSON.stringify(opts) : ""),
}));

jest.mock("../../api", () => ({
    joinRequestForCollaboration: jest.fn(() => Promise.resolve()),
}));

jest.mock("../../utils/Aups", () => ({
    aupData: () => ({
        services: [],
        hasServices: false,
        requiresOrganisationAup: false,
        allServiceAupsAgreedOn: true,
    }),
}));

describe("JoinRequestDialog", () => {
    it("matches snapshot when open", () => {
        const props = {
            isOpen: true,
            close: jest.fn(),
            refresh: jest.fn(),
            history: {push: jest.fn()},
            collaboration: {id: 1, name: "TestCollab", organisation: {}},
            user: {},
            adminEmails: [],
            serviceEmails: [],
        };
        const {asFragment} = render(<JoinRequestDialog {...props} />);
        expect(asFragment()).toMatchSnapshot();
    });
});
