/**
 * @jest-environment jsdom
 */

import fitTextRenderer from '../../../src/graph/node/fitTextRenderer'
import provider from '../../../src/provider/provider';
import * as d3 from 'd3';

describe("render", function () {

    const cssClassMockValue = "mocked_css_class_value";
    const colorMockValue = "mocked_color_value";

    describe('Should works with undefined text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce();
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 0, height: 0});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
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
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 0, height: 0});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with 1 word as text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mockedTextValue").mockReturnValueOnce("mockedTextValue");
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 100, height: 100});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with multiple words as text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mocked text value").mockReturnValueOnce("mocked text value");
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 100, height: 100});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with multiple words on same span', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mocked text a value").mockReturnValueOnce("mocked text a value");
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 100, height: 100});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with integer as text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce(0).mockReturnValueOnce(0);
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue).mockReturnValueOnce(cssClassMockValue);
            provider.node.getColor = jest.fn().mockReturnValue(colorMockValue);
            fitTextRenderer.getNodeBoundingBox = jest.fn().mockReturnValue({x: -50, y: -50, width: 100, height: 100});
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

});