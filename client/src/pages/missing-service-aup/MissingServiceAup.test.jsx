import React from "react";
import {render, fireEvent, waitFor} from "@testing-library/react";
import MissingServiceAup from "./MissingServiceAup";
import {MemoryRouter} from "react-router-dom";

jest.mock("../../api", () => ({
    serviceAupBulkCreate: jest.fn(() => Promise.resolve({location: "/some/path"})),
}));

const mockUser = {
    services_without_aup: [
        {id: "1", name: "Service 1"}
    ],
    service_collaborations: [
        {name: "Collab 1", description: "Description 1"}
    ],
    service_emails: ["test@example.com"]
};

const mockReloadMe = jest.fn(cb => cb());
const mockHistory = {push: jest.fn()};

describe("MissingServiceAup", () => {
    it("renders and matches snapshot", () => {
        const {asFragment} = render(
            <MemoryRouter>
                <MissingServiceAup
                    user={mockUser}
                    reloadMe={mockReloadMe}
                    history={mockHistory}
                />
            </MemoryRouter>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
