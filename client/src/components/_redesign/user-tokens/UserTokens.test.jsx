import React from "react";
import {render} from "@testing-library/react";
import UserTokens from "./UserTokens";

jest.mock("@fortawesome/react-fontawesome", () => ({
    FontAwesomeIcon: () => <span data-testid="icon"/>
}));

const testUserToken = {service_id: "123", created_at: 1700000000};
const testService = {id: "123", label: "Test Service", token_validity_days: 30};

describe("UserTokens", () => {
    it("renders with default props", () => {
        const {asFragment} = render(
            <UserTokens
                user={{id: "1", username: "testuser"}}
                userTokens={[testUserToken]}
                onDeleteToken={() => {
                }}
                onRevokeToken={() => {
                }}
                services={[testService]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });

    it("renders with tokens", () => {
        const tokens = [
            {id: "1", name: "Token 1", created_at: 1700000000, service_id: "123"},
            {id: "2", name: "Token 2", created_at: 1700000000, service_id: "123"}
        ];
        const {asFragment} = render(
            <UserTokens
                user={{id: "1", username: "testuser"}}
                userTokens={tokens}
                onDeleteToken={() => {
                }}
                onRevokeToken={() => {
                }}
                services={[testService]}
            />
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
