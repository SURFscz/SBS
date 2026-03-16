import { describe, it, expect, vi } from 'vitest';
import {addMissingDateEntries, transformToRechartsData} from "../../utils/Stats";
import statsInput from "../data/statsInput.json";
import statsOutput from "../data/statsOutput.json";
import rechartsData from "../data/rechartsData.json";


describe('Stats', () => {
it("addMissingDateEntries", () => {
    const res = addMissingDateEntries(statsInput);
    expect(JSON.stringify(res)).toEqual(JSON.stringify(statsOutput));
});

it("transformToRechartsData", () => {
    const data = transformToRechartsData(statsOutput);
    expect(JSON.stringify(data)).toEqual(JSON.stringify(rechartsData));
});

});
