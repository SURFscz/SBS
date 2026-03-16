import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import JoinRequestDialog from "./JoinRequestDialog";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
t: (key, opts) => key + (opts ? JSON.stringify(opts) : ""),
}));

vi.mock("../../api", () => ({
    joinRequestForCollaboration: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../utils/Aups", () => ({
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
            close: vi.fn(),
            refresh: vi.fn(),
            history: {push: vi.fn()},
            collaboration: {id: 1, name: "TestCollab", organisation: {}},
            user: {},
            adminEmails: [],
            serviceEmails: [],
        };
        const {asFragment} = render(<JoinRequestDialog {...props} />);
        expect(asFragment()).toMatchSnapshot();
    });
});
