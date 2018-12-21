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
            },
            "Node": {
                returnAttributes: ["Nname", query.NEO4J_INTERNAL_ID],
                constraintAttribute: query.NEO4J_INTERNAL_ID,
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("generateResultQuery", () => {
        var generateResultQuery = query.generateResultQuery(false);
        expect(generateResultQuery.statement).toMatchSnapshot();
        expect(generateResultQuery.parameters).toMatchSnapshot();
    });
});
