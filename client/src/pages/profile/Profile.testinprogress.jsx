// import React from "react";
// import {render} from "@testing-library/react";
// import Profile from "./Profile";
//
// const mockUser = {
//     name: "John Doe",
//     created_at: 1700000000,
//     ssh_keys: [
//         { ssh_value: "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC...", manual: false }
//     ]
// }
//
// const mockConfig = {
//     second_factor_authentication_required: true
// }
//
// describe("Profile", () => {
//     it("matches snapshot with default props", () => {
//         const {asFragment} = render(
//             <Profile
//                 user={mockUser}
//                 config={mockConfig}
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
//
//     it("matches snapshot with custom title", () => {
//         const {asFragment} = render(
//             <Profile
//                 user={mockUser}
//                 config={mockConfig}
//                 title="Custom Profile Title"
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
//
//     it("matches snapshot with custom description", () => {
//         const {asFragment} = render(
//             <Profile
//                 user={mockUser}
//                 config={mockConfig}
//                 description="Custom Profile Description"
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
// });
