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

    test("generateNodeValueQuery", () => {
        var generateNodeCountQuery = query.generateNodeValueQuery(dataModel.nodes[0]);
        expect(generateNodeCountQuery.statement).toMatchSnapshot();
        expect(generateNodeCountQuery.parameters).toMatchSnapshot();
    });
});

describe("COLLECT_RELATIONS_WITH_VALUES", function () {
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
            }
        ];

        dataModel.links = [
            {
                id: 1,
                label: "LINKED_TO1",
                source: dataModel.nodes[0],
                target: dataModel.nodes[1],
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
            }
        };

        query.COLLECT_RELATIONS_WITH_VALUES = true;
    });

    afterEach(() => {
        delete provider.node.Provider;
        query.COLLECT_RELATIONS_WITH_VALUES = false;
    });

    test("generateNodeValueQuery", () => {
        var generateNodeCountQuery = query.generateNodeValueQuery(dataModel.nodes[1]);
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

    test("generateNodeValueQuery", () => {
        var generateNodeValueQuery = query.generateNodeValueQuery(dataModel.nodes[2]);
        expect(generateNodeValueQuery.statement).toMatchSnapshot();
        expect(generateNodeValueQuery.parameters).toMatchSnapshot();

        generateNodeValueQuery = query.generateNodeValueQuery(dataModel.nodes[3]);
        expect(generateNodeValueQuery.statement).toMatchSnapshot();
        expect(generateNodeValueQuery.parameters).toMatchSnapshot();
    });
});

describe("Predefined constraints Neo4j id generation", function () {
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
                type: 1
            },
            {
                id: 2,
                label: "Node",
                internalLabel: "node2",
                value: [{label: "Node", internalID: 102, attributes: {Nname: "name2"}}],
                type: 1,
            },
            {
                id: 3,
                label: "Node",
                internalLabel: "node3",
                type: 1,
                value: [
                    {label: "Node", internalID: 1031, attributes: {Nname: "name31"}},
                    {label: "Node", internalID: 1032, attributes: {Nname: "name32"}}
                ],
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
            },
            {
                id: 0,
                label: "LINKED_TO3",
                source: dataModel.nodes[0],
                target: dataModel.nodes[3],
                type: 1
            },
        ];

        provider.node.Provider = {
            "Root": {
                returnAttributes: [query.NEO4J_INTERNAL_ID],
                constraintAttribute: query.NEO4J_INTERNAL_ID,
                getPredefinedConstraints: function () {
                    return ["$identifier.x > 18"];
                }
            },
            "Node": {
                returnAttributes: ["Nname", query.NEO4J_INTERNAL_ID],
                constraintAttribute: query.NEO4J_INTERNAL_ID,
                getPredefinedConstraints: function () {
                    return ["$identifier.y < 20"];
                }
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("predefined constraints", () => {
        var generateNodeValueQuery = query.generateNodeValueQuery(dataModel.nodes[0]);
        expect(generateNodeValueQuery.statement).toMatchSnapshot();
        expect(generateNodeValueQuery.parameters).toMatchSnapshot();
    });

    test("Neo4j id", () => {
        var generateNodeValueQuery = query.generateNodeValueQuery(dataModel.nodes[2]);
        expect(generateNodeValueQuery.statement).toMatchSnapshot();
        expect(generateNodeValueQuery.parameters).toMatchSnapshot();
    });

    test("Neo4j id", () => {
        var generateNodeValueQuery = query.generateNodeValueQuery(dataModel.nodes[3]);
        expect(generateNodeValueQuery.statement).toMatchSnapshot();
        expect(generateNodeValueQuery.parameters).toMatchSnapshot();
    });
});