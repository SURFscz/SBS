// import React from "react";
// import { render } from "@testing-library/react";
// import Collaborations from "./Collaborations";
//
// const mockCollaborations = [
//             { id: "1", name: "Collaboration One", members: [], tags: [], units: [], organisation: { name: "name1" } },
//             { id: "2", name: "Collaboration Two", members: [], tags: [], units: [], organisation: { name: "name2" } }
//         ];
//
// describe("Collaborations", () => {
//     it("matches snapshot with default props", () => {
//         const { asFragment } = render(
//             <Collaborations
//                 user={{ id: "1", name: "Test User" }}
//                 collaborations={mockCollaborations}
//                 onCreate={() => {}}
//                 onDelete={() => {}}
//                 onUpdate={() => {}}
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
//
//     it("matches snapshot with collaborations", () => {
//
//         const { asFragment } = render(
//             <Collaborations
//                 user={{ id: "1", name: "Test User" }}
//                 collaborations={mockCollaborations}
//                 onCreate={() => {}}
//                 onDelete={() => {}}
//                 onUpdate={() => {}}
//             />
//         );
//         expect(asFragment()).toMatchSnapshot();
//     });
// });
