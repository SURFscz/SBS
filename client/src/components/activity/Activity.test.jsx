import React from "react";
import { render } from "@testing-library/react";
import Activity from "./Activity";

jest.mock("../../locale/I18n", () => ({
  t: key => key
}));
jest.mock("../../utils/Utils", () => ({
  escapeDeep: jest.fn(),
  isEmpty: obj => !obj || (typeof obj === "object" && Object.keys(obj).length === 0)
}));
jest.mock("../../utils/Date", () => ({
  pseudoIso: () => "2024-01-01T00:00:00Z"
}));
jest.mock("../../utils/AuditLog", () => ({
  filterAuditLogs: (logs, query) => logs
}));

const auditLogs = {
  audit_logs: [
    {
      id: 1,
      created_at: 1700000000,
      user: { email: "test@example.com", username: "testuser" },
      action: 1,
      target_type: "collaborations",
      target_name: "Test Collaboration",
      state_before: "{}",
      state_after: '{"name":"Test Collaboration"}'
    }
  ]
};

const user = { admin: true };

describe("Activity", () => {
  it("matches snapshot", () => {
    const { asFragment } = render(
      <Activity auditLogs={auditLogs} user={user} collectionName="collaborations" />
    );
    expect(asFragment()).toMatchSnapshot();
  });
});
