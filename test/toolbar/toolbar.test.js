/**
 * @jest-environment jsdom
 */

import * as d3 from 'd3';
import tools from "../../src/tools/tools"
import toolBar from "../../src/toolbar/toolbar"

describe("render", function () {
    beforeEach(() => {
        tools.CENTER_GRAPH = false;
        tools.RESET_GRAPH = false;
        tools.SAVE_GRAPH = false;
        tools.TOGGLE_TAXONOMY = false;
        tools.TOGGLE_FULL_SCREEN = false;
        tools.TOGGLE_VIEW_RELATION = false;
        tools.TOGGLE_FIT_TEXT = false;
        document.body.innerHTML = "";
    });

    test('Should render correctly empty', () => {
        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly CENTER_GRAPH', () => {
        tools.CENTER_GRAPH = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly RESET_GRAPH', () => {
        tools.RESET_GRAPH = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly SAVE_GRAPH', () => {
        tools.SAVE_GRAPH = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly TOGGLE_TAXONOMY', () => {
        tools.TOGGLE_TAXONOMY = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly TOGGLE_FULL_SCREEN', () => {
        tools.TOGGLE_FULL_SCREEN = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly TOGGLE_VIEW_RELATION', () => {
        tools.TOGGLE_VIEW_RELATION = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly TOGGLE_FIT_TEXT', () => {
        tools.TOGGLE_FIT_TEXT = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

    test('Should render correctly all', () => {
        tools.CENTER_GRAPH = true;
        tools.RESET_GRAPH = true;
        tools.SAVE_GRAPH = true;
        tools.TOGGLE_TAXONOMY = true;
        tools.TOGGLE_FULL_SCREEN = true;
        tools.TOGGLE_VIEW_RELATION = true;
        tools.TOGGLE_FIT_TEXT = true;

        toolBar.render(d3.select("body"));
        expect(document.body.innerHTML).toMatchSnapshot();
    });

});