import React from "react";
import {render} from "@testing-library/react";
import CountDownDialog from "./CountDownDialog";

jest.mock("../../locale/I18n", () => ({
    t: (key, opts) => (opts && opts.seconds ? `${key} ${opts.seconds}` : key)
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

describe("CountDownDialog", () => {
    it("matches snapshot", () => {
        const {asFragment} = render(
            <CountDownDialog
                isOpen={true}
                close={jest.fn()}
                confirm={jest.fn()}
                title="Count down"
                subTitle="Counting down"
                confirmationButtonLabel="OK"
                cancelButtonLabel="Cancel"
                confirmDisabled={false}
                seconds={10}
            >
                <div>Dialog content</div>
            </CountDownDialog>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
