// import React from "react";
// import { render } from "@testing-library/react";
// import Me from "./Me";
//
// const mockUser = {
//     id: "1",
//     name: "Test User",
//     created_at: 1700000000000,
//     last_login: 1700000000000,
//     ssh_keys: [
//         { ssh_value: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...", manual: false }
//     ]
// };
//
// const mockConfig = {
//     second_factor_authentication_required: true
// };
//
// describe("Me", () => {
//     it("matches snapshot with default props", () => {
//         const { asFragment } = render(
//             <Me
//                 user={mockUser}
//                 config={mockConfig}
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
//
//     it("matches snapshot with custom title", () => {
//         const { asFragment } = render(
//             <Me
//                 user={mockUser}
//                 config={mockConfig}
//                 title="Custom Title"
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
//
//     it("matches snapshot with custom description", () => {
//         const { asFragment } = render(
//             <Me
//                 user={mockUser}
//                 config={mockConfig}
//                 description="Custom Description"
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
// });
