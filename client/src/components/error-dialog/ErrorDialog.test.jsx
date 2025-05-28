// client/src/components/error-dialog/ErrorDialog.test.jsx
import React from "react";
import { render } from "@testing-library/react";
import ErrorDialog from "./ErrorDialog";

describe("ErrorDialog", () => {
  it("matches snapshot when open", () => {
    const { asFragment } = render(<ErrorDialog isOpen={true} close={() => {}} />);
    expect(asFragment()).toMatchSnapshot();
  });

  it("renders nothing when closed", () => {
    const { container } = render(<ErrorDialog isOpen={false} close={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
