import { vi } from 'vitest';
import React from "react";
import {render} from "@testing-library/react";
import ConfirmationDialog from "./ConfirmationDialog";

vi.mock("../../locale/I18n", () => ({
      default: { t: key => key },
t: (key, opts) => (opts && opts.name ? `${key} ${opts.name}` : key)
}));
vi.mock("@surfnet/sds", () => ({
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
                close={vi.fn()}
                confirm={vi.fn()}
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
