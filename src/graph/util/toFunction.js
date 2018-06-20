/**
 * Convert the parameter to a function returning the parameter if it is not already a function.
 *
 * @param param
 * @return {*}
 */

export default function toFunction(param) {
    if (typeof param === "function") {
        return param;
    } else {
        return function () {
            return param;
        };
    }
}

