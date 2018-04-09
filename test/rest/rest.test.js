import rest from '../../src/rest/rest'

test('test defaults', () => {
    expect(rest.CYPHER_URL).toEqual("http://localhost:7474/db/data/transaction/commit");
    expect(rest.AUTHORIZATION).toBeUndefined();
    expect(rest.WITH_CREDENTIALS).toEqual(false);
});