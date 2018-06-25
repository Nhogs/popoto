import * as d3 from "d3"
import {default as appendFittedText, measureTextWidth, extractLines} from '../../../src/graph/util/appendFittedText'

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

describe("extractLines", function () {

    test("Should works with undefined as text", () => {
        const lines = extractLines();
        expect(lines).toMatchSnapshot();
    });

    test("Should works with empty string as text", () => {
        const lines = extractLines("");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with simple word as text", () => {
        const lines = extractLines("mockedTextValue");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple words as text", () => {
        const lines = extractLines("mocked text value");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple words on same line", () => {
        const lines = extractLines("mocked text a value");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with multiple spaces and multiple words as text", () => {
        const lines = extractLines("        mocked   text       value           ");
        expect(lines).toMatchSnapshot();
    });

    test("Should works with integer as text", () => {
        const lines = extractLines(0);
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

    describe('Should works without class parameters', () => {
        beforeEach(() => {
            const textMockValue = "mocked_text_value";
            const radiusMockValue = 50;

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '</div>';
            appendFittedText(d3.selectAll('g').data([{}]), textMockValue, radiusMockValue)
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

    describe('Should not mutate data', () => {
        const data = [
            {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
            {textMockValue: "mocked_text_value2", radiusMockValue: 52, cssClassMockValue: "mocked_css_class_value2"}
        ];

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

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '<g>' +
                '</g>' +
                '</div>';

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
        });

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

    });

    describe('Should update correctly', () => {
        let textMockValue;
        let radiusMockValue;
        let cssClassMockValue;
        beforeEach(() => {
            textMockValue = function (d) {
                return d.textMockValue
            };
            radiusMockValue = function (d) {
                return d.radiusMockValue
            };
            cssClassMockValue = function (d) {
                return d.cssClassMockValue
            };

            document.body.innerHTML =
                '<div>' +
                '<g>' +
                '</g>' +
                '<g>' +
                '</g>' +
                '</div>';

        });

        test('Should update correctly if data changed', () => {
            let data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked_text_value2", radiusMockValue: 52, cssClassMockValue: "mocked_css_class_value2"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

            data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked_text_value3", radiusMockValue: 53, cssClassMockValue: "mocked_css_class_value3"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

        });

        test('Should update correctly if data add text div', () => {
            let data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

            data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked_text_value2", radiusMockValue: 52, cssClassMockValue: "mocked_css_class_value2"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

        });

        test('Should update correctly if data add span', () => {
            let data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked_text_value2", radiusMockValue: 52, cssClassMockValue: "mocked_css_class_value2"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

            data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"},
                {textMockValue: "mocked text value 3", radiusMockValue: 53, cssClassMockValue: "mocked_css_class_value3"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

        });

        test('Should update correctly if data remove span', () => {

            let data = [
                {textMockValue: "mocked text value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

            data = [
                {textMockValue: "mocked_text_value", radiusMockValue: 50, cssClassMockValue: "mocked_css_class_value"}
            ];

            appendFittedText(d3.selectAll('g').data(data), textMockValue, radiusMockValue, cssClassMockValue);
            expect(document.body.innerHTML).toMatchSnapshot();

        });
    });
});