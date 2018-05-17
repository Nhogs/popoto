import fitTextRenderer from '../../../src/graph/node/fitTextRenderer'
import provider from '../../../src/provider/provider';
import * as d3 from 'd3';
import {measureTextWidth, getLines} from '../../../src/graph/node/fitTextRenderer'

describe("measureTextWidth", function () {
    test("Should measure undefined text correctly", () => {
        expect(measureTextWidth()).toMatchSnapshot();
    });

    test("Should measure empty text correctly", () => {
        expect(measureTextWidth("")).toMatchSnapshot();
    });

    test("Should measure text correctly", () => {
        expect(measureTextWidth("mockedTextValue")).toMatchSnapshot();
    });
});

describe("getLines", function () {

    test("Should works with undefined as text", () => {
        const lines = getLines();
        expect(lines).toMatchSnapshot();
    });

    test("Should works with empty string as text", () => {
        const lines = getLines("");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with simple word as text", () => {
        const lines = getLines("mockedTextValue");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple words on same line", () => {
        const lines = getLines("mocked text a value");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple words as text", () => {
        const lines = getLines("mocked text value");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple spaces and multiple words as text", () => {
        const lines = getLines("        mocked   text       value           ");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with integer as text", () => {
        const lines = getLines(0);
        expect(lines).toMatchSnapshot();
    });

});

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

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mockedTextValue");
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

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mocked text value");
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

            provider.node.getTextValue = jest.fn().mockReturnValueOnce("mocked text a value");
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

            provider.node.getTextValue = jest.fn().mockReturnValueOnce(0);
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