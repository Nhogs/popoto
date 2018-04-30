import fitTextRenderer from '../../../src/graph/node/fitTextRenderer'
import provider from '../../../src/provider/provider';
import * as d3 from 'd3';
import {measureTextWidth, getLines} from '../../../src/graph/node/fitTextRenderer'

describe("measureTextWidth", function () {
    test("Should measure undefined text correctly", () => {
        expect(measureTextWidth()).toEqual(0);
    });

    test("Should measure empty text correctly", () => {
        expect(measureTextWidth("")).toEqual(0);
    });

    test("Should measure text correctly", () => {
        expect(measureTextWidth("mockedTextValue")).toEqual(180);
    });
});

describe("getLines", function () {

    test("Should works with undefined as text", () => {
        const lines = getLines();
        expect(lines).toEqual({"lines": []});
    });

    test("Should works with empty string as text", () => {
        const lines = getLines("");
        expect(lines).toEqual({"lines": [], "textRadius": 0});
    });

    test("Should works with simple word as text", () => {
        const lines = getLines("mockedTextValue");
        expect(lines).toEqual({"lines": [{"linesLength": 1, "text": "mockedTextValue"}], "textRadius": 90.19977827023745});
    });

    test("Should works with multiple words on same line", () => {
        const lines = getLines("mocked text a value");
        expect(lines).toEqual({"lines": [{"linesLength": 3, "text": "mocked"}, {"linesLength": 3, "text": "text"}, {"linesLength": 3, "text": "a value"}], "textRadius": 45.69463863518345});
    });

    test("Should works with multiple words as text", () => {
        const lines = getLines("mocked text value");
        expect(lines).toEqual({"lines": [{"linesLength": 3, "text": "mocked"}, {"linesLength": 3, "text": "text"}, {"linesLength": 3, "text": "value"}], "textRadius": 40.24922359499622});
    });

    test("Should works with multiple spaces and multiple words as text", () => {
        const lines = getLines("        mocked   text       value           ");
        expect(lines).toEqual({"lines": [{"linesLength": 3, "text": "mocked"}, {"linesLength": 3, "text": "text"}, {"linesLength": 3, "text": "value"}], "textRadius": 40.24922359499622});
    });

    test("Should works with integer as text", () => {
        const lines = getLines(0);
        expect(lines).toEqual({"lines": [{"linesLength": 1, "text": "0"}], "textRadius": 8.48528137423857});
    });

});

describe("render", function () {

    const cssClassMockValue = "mocked_css_class_value";

    describe('Should works with undefined text', () => {

        beforeEach(() => {
            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            provider.node.getTextValue = jest.fn().mockReturnValueOnce();
            provider.node.getSize = jest.fn().mockReturnValue(50);
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(1)\"" + ">" +
                "</text>" +
                "</g>" +
                "</div>"
            );
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
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(1)\"" + ">" +
                "</text>" +
                "</g>" +
                "</div>"
            );
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
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(0.5543250876981161)\"" + ">" +
                "<tspan x=\"0\" y=\"3.6000000000000005\">" +
                "mockedTextValue"+
                "</tspan>" +
                "</text>" +
                "</g>" +
                "</div>"
            );
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
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(1.2422599874998832)\"" + ">" +
                "<tspan x=\"0\" y=\"-8.399999999999999\">" +
                "mocked"+
                "</tspan>" +
                "<tspan x=\"0\" y=\"3.6000000000000005\">" +
                "text"+
                "</tspan>" +
                "<tspan x=\"0\" y=\"15.600000000000001\">" +
                "value"+
                "</tspan>" +
                "</text>" +
                "</g>" +
                "</div>"
            );
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
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(1.0942202738310212)\"" + ">" +
                "<tspan x=\"0\" y=\"-8.399999999999999\">" +
                "mocked"+
                "</tspan>" +
                "<tspan x=\"0\" y=\"3.6000000000000005\">" +
                "text"+
                "</tspan>" +
                "<tspan x=\"0\" y=\"15.600000000000001\">" +
                "a value"+
                "</tspan>" +
                "</text>" +
                "</g>" +
                "</div>"
            );
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
            provider.node.getCSSClass = jest.fn().mockReturnValueOnce(cssClassMockValue);
            fitTextRenderer.render(d3.selectAll('g').data([{}]));
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toEqual(
                "<div>" +
                "<g>" +
                "<text class=\"" + cssClassMockValue + "\" style=\"text-anchor: middle; font: 10px sans-serif\" transform=\"translate(0,0) scale(5.892556509887896)\"" + ">" +
                "<tspan x=\"0\" y=\"3.6000000000000005\">" +
                "0"+
                "</tspan>" +
                "</text>" +
                "</g>" +
                "</div>"
            );
        });
    });

});