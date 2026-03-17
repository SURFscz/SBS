import { vi } from 'vitest';
import React from "react";
import { render } from "@testing-library/react";
import Activity from "./Activity";

vi.mock("../../locale/I18n", () => ({
    default: { t: key => key },
t: key => key
}));
vi.mock("../../utils/Utils", () => ({
  escapeDeep: vi.fn(),
  isEmpty: obj => !obj || (typeof obj === "object" && Object.keys(obj).length === 0)
}));
vi.mock("../../utils/Date", () => ({
  pseudoIso: () => "2024-01-01T00:00:00Z"
}));
vi.mock("../../utils/AuditLog", () => ({
  // eslint-disable-next-line no-unused-vars
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
