import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import Aup from "./Aup";
import { MemoryRouter } from "react-router-dom";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
t: (key, opts) => key,
    locale: "nl"
}));

const mockConfig = { someConfig: true };
const mockAupConfig = { url_aup_nl: "https://example.com/aup-nl", url_aup_en: "https://example.com/aup-en" };
const mockCurrentUser = { guest: false, user_accepted_aup: false, name: "Test User" };
const mockRefreshUser = vi.fn();
const mockHistory = { push: vi.fn() };

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
