import TransformMatrix from '../TransformMatrix/TransformMatrix';

const DECIMAL = '[-+]?((\\d?\\.\\d+)|(\\d+))';
const ANGLE_ARG = `\\s*${DECIMAL}(?:deg|rad|grad|turn)\\s*`;
const LENGTH_ARG = `\\s*${DECIMAL}px\\s*`;
const UNITLESS_ARG = `\\s*${DECIMAL}\\s*`;

const THREED_FUNCTIONS = 'matrix3d|perspective|rotate3d|rotatex|rotatey|rotatez|scale3d|scalez|translate3d|translatez';

const UNIT_RX = {
    UNITLESS: new RegExp(`^${DECIMAL}$`),
    PX: new RegExp(`${DECIMAL}px`),
    DEG: new RegExp(`${DECIMAL}deg`),
    RAD: new RegExp(`${DECIMAL}rad`),
    GRAD: new RegExp(`${DECIMAL}grad`),
    TURN: new RegExp(`${DECIMAL}turn`),
};

const FUNCTION_RX = {
    FUNCTIONS: /\w+\(.*?\)/gmi,
    IS_THREED: new RegExp(`(${THREED_FUNCTIONS})\\(`, 'i'),
    MATRIX: new RegExp(`matrix\\((${UNITLESS_ARG},){5}${UNITLESS_ARG}\\)`, 'i'),
    TRANSLATE_X: new RegExp(`(translatex\\(${LENGTH_ARG}\\))|(translate\\(${LENGTH_ARG}\\))`, 'i'),
    TRANSLATE_Y: new RegExp(`translatey\\(${LENGTH_ARG}\\)`, 'i'),
    TRANSLATE: new RegExp(`translate\\(${LENGTH_ARG},${LENGTH_ARG}\\)`, 'i'),
    SCALE_X: new RegExp(`scalex\\(${UNITLESS_ARG}\\)`, 'i'),
    SCALE_Y: new RegExp(`scaley\\(${UNITLESS_ARG}\\)`, 'i'),
    SCALE_UNIFORM: new RegExp(`scale\\(${UNITLESS_ARG}\\)`, 'i'),
    SCALE_NONUNIFORM: new RegExp(`scale\\(${UNITLESS_ARG},${UNITLESS_ARG}\\)`, 'i'),
    ROTATE: new RegExp(`rotate\\(${ANGLE_ARG}\\)`, 'i'),
    SKEW_X: new RegExp(`(skewx\\(${ANGLE_ARG}\\))|(skew\\(${ANGLE_ARG}\\))`, 'i'),
    SKEW_Y: new RegExp(`skewy\\(${ANGLE_ARG}\\)`, 'i'),
    SKEW_BOTH: new RegExp(`skew\\(${ANGLE_ARG},${ANGLE_ARG}\\)`, 'i'),
};

/**
 * Converts a string representing a set of CSS transformations into an array
 * of transform matrixes.
 *
 * @export
 * @param {String} func - valid CSS transform.
 * @param {Boolean} safe3D - when true, throw an error if 3D transformation
 *   functions are used; otherwise, return false.
 * @returns {Array<TransformMatrix>}
 */
export default function parseCss(func, safe3D) {
    const clean = func.toLowerCase().trim()
        .replace(/^transform:\s*/, '')
        .replace(/;$/, '')
        .replace(/\s+/g, ' ');
    const functions = _parseFunctions(clean);
    const parsers = [_translate, _scale, _rotate, _skew, _matrix];
    const matrixes = [];
    // console.log(functions);
    functions.forEach(funcStr => {
        let matched = false;
        for (const parser of parsers) {
            const M = parser(funcStr);
            // console.log(parser, M);
            if (M) {
                matched = true;
                matrixes.push(M);
                break;
            }
        }
        if (matched === false) {
            if (FUNCTION_RX.IS_THREED.test(funcStr)) {
                const msg = 'Cannot parse 3D transforms';
                if (safe3D) {
                    throw new Error(msg);
                } else {
                    console.warn(msg);
                }
            } else {
                throw new Error('Invalid CSS transform function');
            }
        }
    });
    return matrixes;
};

export function _parseFunctions(str) {
    let atEndFunc = false;
    let betweenFuncs = true;
    let inFuncName = false;
    let inFuncBody = false;
    const funcs = [];
    let thisFunc = null;
    let thisChar = null;
    const err = new Error('Invalid CSS transform string');
    for (let i = 0; i < str.length; i++) {
        thisChar = str[i];
        if (betweenFuncs) {
            if (thisChar.search(/\w/) === 0) {
                thisFunc = [thisChar];
                betweenFuncs = false;
                inFuncName = true;
            } else if (thisChar !== ' ') {
                throw err;
            }
        } else if (inFuncName) {
            if (thisChar.search(/\w/) === 0) {
                thisFunc.push(thisChar);
            } else if (thisChar === '(') {
                thisFunc.push(thisChar);
                inFuncName = false;
                inFuncBody = true;
            } else {
                throw err;
            }
        } else if (inFuncBody) {
            thisFunc.push(thisChar);
            if (thisChar === ')') {
                funcs.push(thisFunc.join(''));
                inFuncBody = false;
                atEndFunc = true;
            }
        } else if (atEndFunc) {
            if (thisChar === ' ') {
                betweenFuncs = true;
                atEndFunc = false;
            } else {
                throw err;
            }
        }
    }
    if (!betweenFuncs && !atEndFunc) {
        throw err;
    }
    return funcs;
}

export function _parseArgs(str, type) {
    const arr = str.trim()
        .replace(/^\w+\(/, '')
        .replace(/\)$/, '')
        .split(/,/g)
        .map(s => s.trim());
    switch (type) {
        case 'length':
            return arr.map(x => _getPx(x));
        case 'angle':
            return arr.map(x => _getAngle(x));
        default:
            return arr.map(x => _getUnitless(x));
    }
}

function _getUnitless(str) {
    let val = null;
    if (UNIT_RX.UNITLESS.test(str)) {
        val = parseFloat(str);
    }
    if (val == null || isNaN(val)) {
        throw new Error('Invalid argument');
    }
    return val;
}

function _getPx(str) {
    if (!(UNIT_RX.PX.test(str))) {
        throw new Error('Length units must be provided in px');
    }
    const px = parseFloat(str);
    if (isNaN(px)) {
        throw new Error('Invalid unit length');
    }
    return px;
}

function _getAngle(str) {
    let rad;
    if (UNIT_RX.DEG.test(str)) {
        const deg = parseFloat(str);
        rad = deg * (Math.PI / 180);
    } else if (UNIT_RX.TURN.test(str)) {
        const turn = parseFloat(str);
        rad = turn * Math.PI * 2;
    } else if (UNIT_RX.RAD.test(str)) {
        rad = parseFloat(str);
    } else if (UNIT_RX.GRAD.test(str)) {
        const grad = parseFloat(str);
        rad = grad * (Math.PI / 200);
    } else {
        throw new Error('Angle units are not correctly specified; see https://developer.mozilla.org/en-US/docs/Web/CSS/angle');
    }
    if (isNaN(rad)) {
        throw new Error('Invalid angle');
    }
    return rad;
}

export function _matrix(str) {
    if (FUNCTION_RX.MATRIX.test(str)) {
        const [a, b, c, d, e, f] = _parseArgs(str);
        return new TransformMatrix(a, b, c, d, e, f);
    }
}

export function _translate(str) {
    if (FUNCTION_RX.TRANSLATE_X.test(str)) {
        const x = _parseArgs(str, 'length')[0];
        return TransformMatrix.fromTranslation(x, 0);
    } else if (FUNCTION_RX.TRANSLATE_Y.test(str)) {
        const y = _parseArgs(str, 'length')[0];
        return TransformMatrix.fromTranslation(0, y);
    } else if (FUNCTION_RX.TRANSLATE.test(str)) {
        const [x, y] = _parseArgs(str, 'length');
        return TransformMatrix.fromTranslation(x, y);
    }
}

export function _scale(str) {
    let x = 1;
    let y = 1;
    if (FUNCTION_RX.SCALE_UNIFORM.test(str)) {
        x = _parseArgs(str)[0];
        y = x;
    } else if (FUNCTION_RX.SCALE_NONUNIFORM.test(str)) {
        [x, y] = _parseArgs(str);
    } else if (FUNCTION_RX.SCALE_X.test(str)) {
        x = _parseArgs(str)[0];
    } else if (FUNCTION_RX.SCALE_Y.test(str)) {
        y = _parseArgs(str)[0];
    } else {
        return;
    }
    return TransformMatrix.fromScale(x, y);
}

export function _rotate(str) {
    if (FUNCTION_RX.ROTATE.test(str)) {
        const angle = _parseArgs(str, 'angle')[0];
        return TransformMatrix.fromRotate(angle);
    }
}

export function _skew(str) {
    if (FUNCTION_RX.SKEW_X.test(str)) {
        const angle = _parseArgs(str, 'angle')[0];
        return TransformMatrix.fromSkewX(angle);
    } else if (FUNCTION_RX.SKEW_Y.test(str)) {
        const angle = _parseArgs(str, 'angle')[0];
        return TransformMatrix.fromSkewY(angle);
    } else if (FUNCTION_RX.SKEW_BOTH.test(str)) {
        const [x, y] = _parseArgs(str, 'angle');
        return TransformMatrix.fromSkewBoth(x, y);
    }
}
