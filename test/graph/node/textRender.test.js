import textRenderer from '../../../src/graph/node/textRenderer'
import provider from '../../../src/provider/provider';
import * as d3 from 'd3';

test('Test TEXT_Y default value to center text vertically', () => {
    expect(textRenderer.TEXT_Y).toMatchSnapshot();
});

describe("render", function () {
    const cssClassMockValue = "mocked_css_class_value";
    const cssClassMockValue2 = "mocked_css_class_value2";
    const colorMockValue = "mocked_color_value";
    const idClipPathMockValue = "mocked_id_clip_path_value";
    provider.node = {};
    provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);

    describe('Should works with normal simple text', () => {
        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g clip-path="url(#node-view' + idClipPathMockValue + ')" >' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mocked text value");
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue2);
            textRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 100, height: 100});
            textRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });

        test('MouseOver should remove correctly the parent clip path', () => {
            expect(d3.select('g').attr("clip-path")).toMatchSnapshot();
            d3.select('text').dispatch("mouseover");
            expect(d3.select('g').attr("clip-path")).toMatchSnapshot();
        });

        test('Mouseout after the mouseover should reAdd correctly the parent clip path', () => {
            d3.select('g').data([{id: idClipPathMockValue}]);

            expect(d3.select('g').attr("clip-path")).toMatchSnapshot();
            d3.select('text').dispatch("mouseover");
            d3.select('text').dispatch("mouseout");
            expect(d3.select('g').attr("clip-path")).toMatchSnapshot();
        });
    });

    describe('Should works with empty text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("");
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue2);
            textRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 0, height: 0});
            textRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with undefined text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce();
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue2);
            textRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 0, height: 0});
            textRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with integer text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce(0);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue2);
            textRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 0, height: 0});
            textRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    })
});