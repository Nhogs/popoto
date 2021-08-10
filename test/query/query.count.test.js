/**
 * @jest-environment jsdom
 */

import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

describe("root only", function () {
    beforeEach(() => {
        dataModel.nodes = [
            {
                id: 0,
                label: "Root",
                internalLabel: "root",
                type: 0
            }
        ];

        dataModel.links = [];

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

    test("generateNodeCountQuery", () => {
        var generateNodeCountQuery = query.generateNodeCountQuery(dataModel.nodes[0]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();
    });
});

describe("one very long-branch with value leaf and reverse order", function () {
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
                label: "Label1",
                internalLabel: "label1",
                type: 1,
            },
            {
                id: 2,
                label: "Label2",
                isParentRelReverse: true,
                internalLabel: "label2",
                type: 1,
            },
            {
                id: 3,
                label: "Label3",
                internalLabel: "label3",
                value: [{label: "Label3", attributes: {Nid: "Vid3", Nname: "Vname3"}}],
                isNegative: true,
                type: 1,
            }
        ];

        dataModel.links = [
            {
                id: 1,
                label: "LINKED_TO1",
                source: dataModel.nodes[0],
                target: dataModel.nodes[1],
                type: 1
            },
            {
                id: 2,
                label: "LINKED_TO2",
                source: dataModel.nodes[1],
                target: dataModel.nodes[2],
                type: 1
            },
            {
                id: 2,
                label: "LINKED_TO3",
                source: dataModel.nodes[2],
                target: dataModel.nodes[3],
                type: 1
            }
        ];

        provider.node.Provider = {
            "Root": {
                returnAttributes: ["name", "id"],
                constraintAttribute: "id",
            },
            "Label1": {
                returnAttributes: ["Nname", "Nid"],
                constraintAttribute: "Nid",
            },
            "Label2": {
                returnAttributes: ["Nname", "Nid"],
                constraintAttribute: "Nid",
            },
            "Label3": {
                returnAttributes: ["Nname", "Nid"],
                constraintAttribute: "Nid",
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("generateNodeCountQuery", () => {
        var generateNodeCountQuery = query.generateNodeCountQuery(dataModel.nodes[2]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();

        generateNodeCountQuery = query.generateNodeCountQuery(dataModel.nodes[3]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();
    });
});

describe("Predefined constraints Neo4j id generation", function () {
    beforeEach(() => {
        dataModel.nodes = [
            {
                label: "Person",
                internalLabel: "person",
                type: 0
            },
            {
                id: 1,
                label: "Movie",
                internalLabel: "movie",
                type: 1
            }
        ];

        dataModel.links = [
            {
                id: 1,
                label: "ACTED_IN",
                source: dataModel.nodes[0],
                target: dataModel.nodes[1],
                type: 1
            }
        ];

        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                getPredefinedConstraints: function () {
                    return ["$identifier.born > 1976"];
                }
            },
            "Movie": {
                returnAttributes: ["title", "born"],
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("predefined constraints", () => {
        var generateNodeCountQuery = query.generateNodeCountQuery(dataModel.nodes[0]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();
    });

    test("Neo4j id", () => {
        var generateNodeCountQuery = query.generateNodeCountQuery(dataModel.nodes[1]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();
    });
});