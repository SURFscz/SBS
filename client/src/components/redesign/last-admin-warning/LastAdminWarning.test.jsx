import React from "react";
import { render } from "@testing-library/react";
import LastAdminWarning from "./LastAdminWarning";

describe("LastAdminWarning", () => {
    it("renders with default props", () => {
        const { asFragment } = render(
            <LastAdminWarning
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={true}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with currentUserDeleted false", () => {
        const { asFragment } = render(
            <LastAdminWarning
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={false}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with custom localePrefix", () => {
        const { asFragment } = render(
            <LastAdminWarning
                organisation={{ name: "Test Organisation" }}
                currentUserDeleted={true}
                localePrefix="customLocale"
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
