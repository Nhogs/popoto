import * as d3 from "d3"
import appendFittedText from '../../../src/graph/util/appendFittedText'
import {measureTextWidth, getLines} from '../../../src/graph/util/appendFittedText'

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

describe("appendFittedText", function () {

    describe('Should works with text, radius, class parameters as value without data in selection', () => {
        beforeEach(() => {
            const textMockValue = "mocked_text_value";
            const radiusMockValue = 50;
            const cssClassMockValue = "mocked_css_class_value";

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';
            appendFittedText(d3.selectAll('g').data([{}]), textMockValue, radiusMockValue, cssClassMockValue)
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with text, radius, class parameters as function without data in selection', () => {
        beforeEach(() => {
            const textMockValue = function (d) {
                return "mocked_text_value"
            };
            const radiusMockValue = function (d) {
                return 50
            };
            const cssClassMockValue = function (d) {
                return "mocked_css_class_value"
            };

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';

            appendFittedText(d3.selectAll('g').data([{}]), textMockValue, radiusMockValue, cssClassMockValue)
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });

    describe('Should works with text, radius, class parameters as function with data in selection', () => {
        beforeEach(() => {
            const textMockValue = function (d) {
                return d.textMockValue
            };
            const radiusMockValue = function (d) {
                return d.radiusMockValue
            };
            const cssClassMockValue = function (d) {
                return d.cssClassMockValue
            };

            const data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked_text_value2", radiusMockValue: 52, cssClassMockValue: "mocked_css_class_value2"}
            ];

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '<g>' +
                '</g>' +
                '</div>';

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue)
        });

        test('Should render correctly', () => {
            expect(document.body.innerHTML).toMatchSnapshot();
        });
    });
});