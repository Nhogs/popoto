import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

describe("taxonomy count generation", function () {
    beforeEach(() => {
        provider.node.Provider = {
            "Person": {
                returnAttributes: ["name", "born"],
                constraintAttribute: "name",
            },
            "Movie": {
                returnAttributes: ["title", "born"],
            }
        };
    });

    afterEach(() => {
        delete provider.node.Provider;
    });

    test("Person", () => {
        var countQuery = query.generateTaxonomyCountQuery("Person");
        expect(countQuery).toMatchSnapshot();
    });
    test("Movie", () => {
        var countQuery = query.generateTaxonomyCountQuery("Movie");
        expect(countQuery).toMatchSnapshot();
    });
});