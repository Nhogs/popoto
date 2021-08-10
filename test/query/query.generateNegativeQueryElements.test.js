/**
 * @jest-environment jsdom
 */

import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

describe("one branch", function () {
    beforeEach(() => {
        dataModel.nodes = [
            {
                id: 0,
                label: "Root",
                internalLabel: "root",
                type: 0
            },
            {
                id: 1,
                label: "Node1",
                internalLabel: "node1",
                type: 1
            },
            {
                id: 2,
                label: "Node2",
                internalLabel: "node2",
                type: 1,
                isNegative: true
            }
        ];

        dataModel.links = [
            {
                id: 0,
                label: "LINKED_TO1",
                source: dataModel.nodes[0],
                target: dataModel.nodes[1],
                type: 1
            },
            {
                id: 1,
                label: "LINKED_TO2",
                source: dataModel.nodes[1],
                target: dataModel.nodes[2],
                type: 1
            }
        ];

        provider.node.Provider = {
            "Root": {
                returnAttributes: ["name", "id"],
                constraintAttribute: "id",
            },
            "Node": {
                returnAttributes: ["Nname", "Nid"],
                constraintAttribute: "Nid",
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("", () => {
        var generateResultQuery = query.generateNegativeQueryElements();
        expect(generateResultQuery.whereElements).toMatchSnapshot();
    });
});

describe("one branch with 2 values", function () {
    beforeEach(() => {
        dataModel.nodes = [
            {
                id: 0,
                label: "Root",
                internalLabel: "root",
                type: 0
            },
            {
                id: 1,
                label: "Node",
                internalLabel: "node1",
                value: [{label: "Node", attributes: {Nid: "Vid", Nname: "Vname"}}],
                type: 1,
            },
            {
                id: 2,
                label: "Node",
                internalLabel: "node2",
                value: [{label: "Node", attributes: {Nid: "Vid2", Nname: "Vname2"}}],
                type: 1,
                isNegative: true
            }
        ];

        dataModel.links = [
            {
                id: 0,
                label: "LINKED_TO1",
                source: dataModel.nodes[0],
                target: dataModel.nodes[1],
                type: 1
            },
            {
                id: 1,
                label: "LINKED_TO2",
                source: dataModel.nodes[1],
                target: dataModel.nodes[2],
                type: 1
            }
        ];

        provider.node.Provider = {
            "Root": {
                returnAttributes: ["name", "id"],
                constraintAttribute: "id",
            },
            "Node": {
                returnAttributes: ["Nname", "Nid"],
                constraintAttribute: "Nid",
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("", () => {
        var generateResultQuery = query.generateNegativeQueryElements();
        expect(generateResultQuery.whereElements).toMatchSnapshot();
    });
});
