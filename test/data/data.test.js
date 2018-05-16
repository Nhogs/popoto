import dataModel from '../../src/datamodel/dataModel'

describe("initial state", function () {
    test("Should be empty array of nodes", () => {
        expect(dataModel.nodes).toEqual([]);
    });

    test("Should be empty array of links", () => {
        expect(dataModel.links).toEqual([]);
    });
});

