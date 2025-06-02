import React from "react";
import {render} from "@testing-library/react";
import ConfirmationDialog from "./ConfirmationDialog";

jest.mock("../../locale/I18n", () => ({
    t: (key, opts) => (opts && opts.name ? `${key} ${opts.name}` : key)
}));
jest.mock("@surfnet/sds", () => ({
    Modal: props => (
        <div data-testid="modal">
            <div>{props.title}</div>
            <div>{props.subTitle}</div>
            <div>{props.children}</div>
            <button disabled={props.confirmDisabled}>{props.confirmationButtonLabel}</button>
            <button>{props.cancelButtonLabel}</button>
        </div>
    )
}));

describe("ConfirmationDialog", () => {
    it("matches snapshot", () => {
        const {asFragment} = render(
            <ConfirmationDialog
                isOpen={true}
                close={jest.fn()}
                confirm={jest.fn()}
                title="Confirm"
                subTitle="Are you sure?"
                confirmationButtonLabel="Yes"
                cancelButtonLabel="No"
                confirmDisabled={false}
            >
                <div>Dialog content</div>
            </ConfirmationDialog>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
