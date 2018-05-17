import dataModel from '../../src/datamodel/dataModel'

describe("initial state", function () {
    test("Should be empty array of nodes", () => {
        expect(dataModel.nodes).toEqual([]);
    });

    test("Should be empty array of links", () => {
        expect(dataModel.links).toEqual([]);
    });
});

describe("getRootNode", function () {
    afterEach(() => {
        dataModel.nodes = [];
    });

    describe("empty node dataModel", () => {
        beforeEach(() => {
            dataModel.nodes = [];
        });

        test('should return Undefined', () => {
            expect(dataModel.getRootNode()).toBeUndefined()
        });
    });

    describe("one node in dataModel", () => {
        beforeEach(() => {
            dataModel.nodes = [{type:"rootNode"}];
        });

        test('Should return the correct node', () => {
            expect(dataModel.getRootNode()).toBe(dataModel.nodes[0]);
        });
    });

    describe("multiple node in dataModel", () => {
        beforeEach(() => {
            dataModel.nodes = [{type:"rootNode"},{type:"otherNode"}];
        });

        test('should return the correct node', () => {
            expect(dataModel.getRootNode()).toBe(dataModel.nodes[0]);
        });
    });
});