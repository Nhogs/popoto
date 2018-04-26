import fitTextRenderer from '../../../src/graph/node/fitTextRenderer'
import {measureTextWidth, getLines} from '../../../src/graph/node/fitTextRenderer'

describe("measureTextWidth", function () {
    test("should measure simple text correctly", () => {
        expect(measureTextWidth("toto")).toEqual(48);
    });

    test("should be 0 when string is empty", () => {
        expect(measureTextWidth("")).toEqual(0);
    });
});

