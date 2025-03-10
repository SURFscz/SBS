import {parseBulkInvitation} from "../../utils/CSVParser";

test("parseWithHeaders", () => {
    const csv = `
short_names,intended_role,invitees,groups,invitation_expiry_date,membership_expiry_date,message,sender_name
      
cumulusgrp,admin,rdoe@uniharderwijk.nl,301ee8e6-b5d1-40b5-a27e-47611f803371,1743014227,2025-12-30,Please join the Cumulus research group collaboration page.,Organisation XYZ
"cumulusgrp, cirrusgrp",member,"jdoe@surf.nl, joost@surf.nl","301ee8e6-b5d1-40b5-a27e-47611f803371, 412ee9e8-b6d2-51b6-a38e-58722f914482",,,Please join our collaborations,    
coShortName,admin,rdoe@uniharderwijk.nl, , , , , 
    
    `;
    const results = parseBulkInvitation(csv);
    const data = results.data;
    expect(data.length).toEqual(3);
    expect(results.errors.length).toEqual(0);
    expect(data[0].invitation_expiry_date).toEqual(1743014227);
    expect(data[0].membership_expiry_date).toEqual(1767052800);
    expect(data[1].short_names).toEqual(["cumulusgrp","cirrusgrp"]);
    expect(data[1].invitees).toEqual(["jdoe@surf.nl","joost@surf.nl"]);
    expect(data[2].groups).toEqual([]);
    expect(data[2].message).toEqual(null)
});

test("parseWithoutHeaders", () => {
    const csv = `
      
cumulusgrp,admin,rdoe@uniharderwijk.nl,301ee8e6-b5d1-40b5-a27e-47611f803371,"2025-05-10","2025-05-10",Please join the Cumulus research group collaboration page.,Organisation XYZ
"cumulusgrp, cirrusgrp",member,"jdoe@surf.nl, joost@surf.nl","301ee8e6-b5d1-40b5-a27e-47611f803371, 412ee9e8-b6d2-51b6-a38e-58722f914482",,,Please join our collaborations,    
    
    `;
    const results = parseBulkInvitation(csv);
    const data = results.data;
    expect(data.length).toEqual(2);
    expect(data[1].short_names).toEqual(["cumulusgrp","cirrusgrp"]);
    expect(data[1].invitees).toEqual(["jdoe@surf.nl","joost@surf.nl"]);
});

test("parseWithError", () => {
    const csv = `
Mumbo Jumbo    
    `;
    const results = parseBulkInvitation(csv);
    expect(results.data.length).toEqual(1);
    const errors = results.errors;
    expect(errors.length).toEqual(1);
    expect(errors[0].code).toEqual("TooFewFields");
});

test("parseWithCustomErrors", () => {
    const csv = `
short_names,intended_role,invitees,groups,invitation_expiry_date,membership_expiry_date,message,sender_name
cumulusgrp,admin,rdoe@uniharderwijk.nl,301ee8e6-b5d1-40b5-a27e-47611f803371,1743014227,2025-12-30,Please join the Cumulus research group collaboration page.,Organisation XYZ
,,,301ee8e6-b5d1-40b5-a27e-47611f803371,1743014227174.00,1743014227174.00,Please join the Cumulus research group collaboration page.,Organisation XYZ
`;
    const results = parseBulkInvitation(csv);
    expect(results.data.length).toEqual(2);
    expect(results.errors.length).toEqual(1);
});

test("parseWithDefaults", () => {
    const csv = "ai_computing,,\"rdoe5@uniharderwijk.nl,rdoe4@uniharderwijk.nl\",,,,,";
    const results = parseBulkInvitation(csv);
    expect(results.data.length).toEqual(1);
    expect(results.errors.length).toEqual(0);
});


