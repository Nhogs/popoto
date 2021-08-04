import resolve from "rollup-plugin-node-resolve";
import copy from 'rollup-plugin-copy';

export default {
    input: "index",
    plugins: [
        resolve({}),
        copy({
            "css/font": "dist/font",
            "css/font-icon-list.html": "dist/font-icon-list.html",
            verbose: true
        })
    ],
    external: ["d3"],
    output: {
        extend: true,
        file: "dist/popoto.js",
        format: "umd",
        indent: false,
        name: "popoto",
        globals: {
            d3: "d3",
        }
    }
};