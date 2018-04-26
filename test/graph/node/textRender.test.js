import textRenderer from '../../../src/graph/node/textRenderer'

test('test defaults', () => {
    expect(textRenderer.TEXT_Y).toEqual(8);
});