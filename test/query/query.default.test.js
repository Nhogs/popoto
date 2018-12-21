import provider from "../../src/provider/provider";
import query from '../../src/query/query.js'
import dataModel from "../../src/datamodel/dataModel";

test("MAX_RESULTS_COUNT should be initialized", () => {
    expect(query.MAX_RESULTS_COUNT).toEqual(100);
});

test("VALUE_QUERY_LIMIT should be initialized", () => {
    expect(query.VALUE_QUERY_LIMIT).toEqual(100);
});

test("USE_PARENT_RELATION should be initialized", () => {
    expect(query.USE_PARENT_RELATION).toEqual(false);
});

test("USE_RELATION_DIRECTION should be initialized", () => {
    expect(query.USE_RELATION_DIRECTION).toEqual(true);
});

test("COLLECT_RELATIONS_WITH_VALUES should be initialized", () => {
    expect(query.COLLECT_RELATIONS_WITH_VALUES).toEqual(false);
});

test("prefilter should be initialized", () => {
    expect(query.prefilter).toEqual("");
});

test("prefilterParameters to be empty", () => {
    expect(query.prefilterParameters).toEqual({});
});
