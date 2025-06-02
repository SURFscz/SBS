import React from "react";
import { render } from "@testing-library/react";
import Aup from "./Aup";
import { MemoryRouter } from "react-router-dom";

jest.mock("../../locale/I18n", () => ({
    t: (key, opts) => key,
    locale: "nl"
}));

const mockConfig = { someConfig: true };
const mockAupConfig = { url_aup_nl: "https://example.com/aup-nl", url_aup_en: "https://example.com/aup-en" };
const mockCurrentUser = { guest: false, user_accepted_aup: false, name: "Test User" };
const mockRefreshUser = jest.fn();
const mockHistory = { push: jest.fn() };

describe("Aup", () => {
    it("matches snapshot with default props", () => {
        const { asFragment } = render(
            <MemoryRouter>
                <Aup
                    config={mockConfig}
                    aupConfig={mockAupConfig}
                    currentUser={mockCurrentUser}
                    refreshUser={mockRefreshUser}
                    history={mockHistory}
                />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });

});
