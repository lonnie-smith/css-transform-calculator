import 'babel-polyfill';

/**
 * Frequently, we need to obtain coordinates of a point relative to an
 * element which has had 2D transforms applied to it. This is a nontrivial
 * process due to the fact that `window.getComputedStyle` returns the
 * matrix() function rather than the individual translate(), scale(),
 * rotate() and skew() tranformation functions, and because multiple
 * transformations may be applied to various ancestors of a given element.
 *
 * This utility class implements the math necessary to obtain the matrix
 * transforms of a given element, invert those transformations, and, if
 * multiple different 2D transformations have been applied, decompose those
 * transformations so you can apply (or invert) just some of them.
 *
 * A CssTransformCalculator calculates the matrixes it needs to effeciently find
 * transformed coordinates as soon as it is created. If some elements in the
 * DOM are transformed dynamically after this element is created, it will
 * give incorrect results, so it's best to instatiate a CssTransformCalculator
 * right before you intend to use it.
 * @class CssTransformCalculator
 */
class CssTransformCalculator {
    /**
     * Create a new CssTransformCalculator instance. It will only pay attention
     * to transforms in the elements in the path between `baseAncestor`
     * and `el`. If `baseAncestor` is undefined, pay attention to all
     * ancestors of `el` up to the `<body>` element.
     * @param {HTMLElement} el - target element
     * @param {HTMLElement} baseAncestor
     */
    constructor(el, baseAncestor = null) {
        this.el = el;
        this._matrixes = CssTransformCalculator
            .getTransformMatrixesBetween(el, baseAncestor);
        this._invertedMatrixes = this._matrixes.map(CssTransformCalculator.invertMatrix);
    }

    /**
     * From an Array [x, y], `coords`, relative to an untransformed coordinate
     * space, find the equivalent coords [x1, y1] relative to the transformed
     * element.
     * @param {Array} coords - [x, y]
     * @return {Array} - [x1, y1]
     */
    transformCoords(coords) {
        return CssTransformCalculator
            .compositeTransform(this._matrixes, coords);
    }

    /**
     * From an Array [x1, y1], `coords`, relative to this transformed
     * element, find the equivalent coords [x, y] relative to the
     * untransformed space.
     * @param {Array} coords - [x, y]
     * @return {Array} - [x1, y1]
     */
    untransformCoords(coords) {
        return CssTransformCalculator
            .compositeTransform(this._invertedMatrixes, coords);
    }

    /**
     * From an Array [x, y], `coords`, relative to an untransformed coordinate
     * space, find the equivalent coords [x1, y1] scaled up to match the
     * element. This will ignore any transformations other than scaling.
     * @param {Array} coords - [x, y]
     * @return {Array} - [x1, y1]
     */
    scaleCoords(coords) {
        const { x, y } = this.getCompositeScale();
        return [coords[0] * x, coords[1] * y];
    }

    /**
     * From an Array [x1, y1], `coords`, relative to this transformed
     * element, find the equivalent coords [x, y] relative to the
     * unscaled space. This will ignore any transformations other than scaling.
     * @param {Array} coords - [x, y]
     * @return {Array} - [x1, y1]
     */
    unscaleCoords(coords) {
        const { x, y } = this.getCompositeScale();
        return [coords[0] * (1 / x), coords[1] * (1 / y)];
    }

    /**
     * Find the scale relative to the `baseAncestor`. This method looks at
     * all the transform matrixes and decomposes them, extracts just the
     * scale transforms, and them multiplies them to reduce to a pair of
     * scalar scale values.
     *
     * Since this relies on decomposing transforms, this method isn't
     * guaranteed to deliver correct results if rotate or skew transforms
     * are in use.
     *
     * @return {Object} like { x: {Number}, y: {Number} }
     */
    getCompositeScale() {
        // check for spoilers
        for (const M of this._matrixes) {
            if (CssTransformCalculator.isSkewedOrRotated(M)) {
                console.warn('An ancestor of this element appears to have a rotate or skew transformation applied.');
                console.warn(this.el);
                console.warn(this._matrixes);
                break;
            }
        }

        return this._matrixes.reduce(reducer, { x: 1, y: 1 });

        function reducer(product, M) {
            const decomp = CssTransformCalculator.decompose(M);
            const scales = decomp
                .filter(obj => (obj.matrix != null) && (obj.type === 'scale'))
                .map(obj => obj.matrix);
            const newXy = Object.assign({}, product); // shallow clone
            for (const scaleMatrix of scales) {
                const newScale = getScales(scaleMatrix);
                newXy.x = newXy.x * newScale.x;
                newXy.y = newXy.y * newScale.y;
            }
            return newXy;
        }

        function getScales(M) {
            return { x: M[0][0], y: M[1][1] };
        }
    }

    /**
     * Traverses the DOM up from `el` to `baseAncestor` (including both `el`
     * and `baseAncestor`) and creates an array of 2D CSS transform matrixes
     * currently applied to all elements in the path. The first matrix in
     * the return array is the transform applied closest to `el`.
     *
     * Note: This method will attempt to find `baseElement` even if it
     * belongs to a document hosting this page inside an iFrame.
     * @param {HTMLElement} element
     * @param {HTMLElement} baseAncestor, or the `<body>` element if
     *   undefined.
     * @return {Array}
     */
    static getTransformMatrixesBetween(element, baseAncestor = null) {
        const base = baseAncestor || document.body;
        return recurse(element, null, []);

        // we have to account for elements in the Shadow DOM. That means
        // ignoring document fragments and drilling down into the Shadow DOM
        // when an ancestor is distributed content.
        function recurse(el, distributedParent, matrixes) {
            if (el == null) { return matrixes; }

            // traverse into host document if `element` is root of a document
            // hosted in an iFrame
            if (el.nodeType === el.DOCUMENT_NODE) {
                if (el.defaultView && el.defaultView.frameElement) {
                    return recurse(el.defaultView.frameElement, null, matrixes);
                } else {
                    return matrixes;
                }
            }

            // traverse into host element if `element` is the root of a shadow
            // DOM tree.
            if (el.nodeType === el.DOCUMENT_FRAGMENT_NODE) {
                return recurse(el.host, null, matrixes);
            }

            // fetch matrix for this element
            const matrix = CssTransformCalculator.getTransformMatrix(el);
            if (matrix != null) {
                matrixes.push(matrix);
            }

            // stop recursing if we've reached the specified `baseAncestor`
            if (el === base) { return matrixes; }

            // find the correct parent node, allowing for the fact that this
            // `element` may be distributed nodes into the shadow DOM
            // via a `<content>` or `<slot>` element
            let parent;
            if (distributedParent != null) {
                parent = distributedParent.parentNode;
            } else {
                parent = el.parentNode;
            }

            // if `element` is distributed into a shadow tree, we want to
            // traverse the flattened tree (following how the DOM is rendered)
            // rather than the normal DOM structure
            if (parent) {
                const root = parent.root || parent.shadowRoot;
                if (root != null) {
                    const contentEls = root.querySelectorAll(
                        'content, slot');
                    if ((contentEls == null) || (contentEls.length === 0)) {
                        return recurse(parent, null, matrixes);
                    }
                    for (const cEl of contentEls) {
                        let distributed;
                        if (cEl.getDistributedNodes) {
                            distributed = cEl.getDistributedNodes();
                        } else if (cEl.assignedNodes) {
                            distributed = cEl.assignedNodes();
                        } else {
                            distributed = [];
                        }
                        for (const n of distributed) {
                            if (n === el) {
                                return recurse(el, cEl, matrixes);
                            }
                        }
                    }
                }
            }

            // otherwise, we'll just traverse up the normal DOM tree.
            return recurse(parent, null, matrixes);
        }
    }

    /**
     * Given the element `el`, see if it has a 2D transform applied to it.
     * If it does, return the 3x3 matrix (Array) that represents the
     * transform. Otherwise, return null.
     * @param {HTMLElement} el
     * @return {Array|null}
     */
    static getTransformMatrix(el) {
        // we may be working on an element that belongs to a different window.
        // be sure to use the right window to calculate the style.
        const { getComputedStyle } = el.ownerDocument.defaultView;
        const str = getComputedStyle(el).transform.trim().toLowerCase();

        if (str === 'none') { return null; }

        // browsers will represent transforms as a composite matrix like this:
        // "matrix(a, b, c, d, e, f)"
        if (str.indexOf('matrix3d') > -1) {
            throw new Error(
                'TransformElement does not work if there are elements with 3D transforms');
        }
        if (str.indexOf('matrix(') !== 0) { return null; }
        const css = str.split(/[^.0-9]+/).slice(1, 7)
            .map(parseFloat);
        if (css == null) { return null; }

        return CssTransformCalculator.matrixify(
            css[0], css[1], css[2], css[3], css[4], css[5]);
    }

    /**
     * Given a 3x3 matrix M representing a transform, and a 2-element Array
     * representing x and y coordinates, return an array [x1, y1]
     * representing the input `coords` transformed into the new space.
     * @param {Array|null} M - if null, assume there's no transform
     *   applied
     * @param {Array} coords - [x, y]
     * @return {Array} - [x1, y1]
     */
    static transform(M, coords) {
        if (M == null) { return coords; }
        // 2D transforms use a vector of length 3; the last element is
        // always 1.
        const v = coords.concat(1);
        const v1 = CssTransformCalculator.matrixVectorProduct(M, v);
        return v1.slice(0, 2);
    }

    /**
     * find M * v
     * @param {Array} M
     * @param {Array} v
     * @return {Array}
     */
    static matrixVectorProduct(M, v) {
        return M.map(row => {
            return v.reduce(((sum, a, i) => sum + (a * row[i])), 0);
        });
    }

    /**
     * Find the dot product of two 3x3 matrixes
     * @param {Array} M1
     * @param {Array} M2
     * @return {Array}
     */
    static dotProduct(M1, M2) {
        function product(v1, v2) {
            return v1.reduce(((sum, a, i) => sum + (a * v2[i])), 0);
        }

        // column vectors of M2
        const M2t = [
            [M2[0][0], M2[1][0], M2[2][0]],
            [M2[0][1], M2[1][1], M2[2][1]],
            [M2[0][2], M2[1][2], M2[2][2]],
        ];

        return M1.map(row =>
            M2t.map(col => product(row, col))
        );
    }

    /**
     * Apply a series of transformations to a set of coordinates in series.
     * @param {Array} matrixes - array of 3x3 transformation matrixes in the
     *   order in which they should be applied.
     * @param {Array} coords - [x, y]
     * @returns {Array} - [x1, y1]
     */
    static compositeTransform(matrixes, coords) {
        return matrixes.reduce(
            ((txCoords, M) => CssTransformCalculator.transform(M, txCoords)),
            coords);
    }

    /**
     * Creates a deep copy of a 3x3 matrix
     * @param {Array} M
     * @return {Array}
     */
    static cloneMatrix(M) {
        return [
            [].concat(M[0]),
            [].concat(M[1]),
            [].concat(M[2]),
        ];
    }

    /**
     * Creates a new 3x3 identity matrix
     * @return {Array}
     */
    static identityMatrix() {
        return [
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ];
    }

    /**
     * Returns true if `M` is the identity matrix.
     * @param {Array} M
     * @return {Boolean}
     */
    static isIdentity(M) {
        return (
            (M[0][0] === 1) &&
            (M[0][1] === 0) &&
            (M[0][2] === 0) &&
            (M[1][0] === 0) &&
            (M[1][1] === 1) &&
            (M[1][2] === 0) &&
            (M[2][0] === 0) &&
            (M[2][1] === 0) &&
            (M[2][2] === 1)
        );
    }

    /**
     * Returns `true` if transformation appears to include a rotation or skew.
     * @param {Array} M - 3x3 matrix
     * @return {Boolean}
     */
    static isSkewedOrRotated(M) {
        return (M[0][1] !== 0) || (M[1][0] !== 0);
    }

    /**
     * Given a 3x3 `matrix` representing a transform from an original
     * space into a tranformed space, find the inverse of the matrix
     * so that we can take coordinates in the transformed space and
     * find their original values.
     * @param {Array} M
     * @return {Array} inverse of `M`
     */
    static invertMatrix(M) {
        // Gauss-Jordan elimination lifted from
        // http://blog.acipo.com/matrix-inversion-in-javascript/

        const C = CssTransformCalculator.cloneMatrix(M);
        const I = CssTransformCalculator.identityMatrix();

        // Perform elementary row operations
        for (let i = 0; i < 3; i++) {
            // get the element e on the diagonal
            let ii;
            let j;
            let e = C[i][i];

            // if we have a 0 on the diagonal (we'll need to swap with a lower
            // row)
            if (e === 0) {
                // look through every row below the i'th row
                let asc;
                let start;
                for (start = i + 1, ii = start, asc = start <= 3;
                    asc ? ii < 3 : ii > 3;
                    asc ? ii++ : ii--) {
                    // if the ii'th row has a non-0 in the i'th col
                    if (C[ii][i] !== 0) {
                        // it would make the diagonal have a non-0 so swap it
                        for (j = 0; j < 3; j++) {
                            e = C[i][j];        // temp store i'th row
                            C[i][j] = C[ii][j]; // replace i'th row by ii'th
                            C[ii][j] = e;       // repace ii'th by temp
                            e = I[i][j];        // temp store i'th row
                            I[i][j] = I[ii][j]; // replace i'th row by ii'th
                            I[ii][j] = e;
                        } // repace ii'th by temp
                        // don't bother checking other rows since we've swapped
                        break;
                    }
                }
                // get the new diagonal
                e = C[i][i];
                // if it's still 0, not invertable (error). I think all 2D
                // transforms are invertible?
                if (e === 0) { throw new Error('matrix not invertible'); }
            }

            // Scale this row down by e (so we have a 1 on the diagonal)
            for (j = 0; j < 3; j++) {
                C[i][j] = C[i][j] / e; // apply to original matrix
                I[i][j] = I[i][j] / e;
            } // apply to identity

            // Subtract this row (scaled appropriately for each row) from ALL of
            // the other rows so that there will be 0's in this column in the
            // rows above and below this one
            for (ii = 0; ii < 3; ii++) {
                // Only apply to other rows (we want a 1 on the diagonal)
                if (ii === i) { continue; }

                // We want to change this element to 0
                e = C[ii][i];

                // Subtract (the row above(or below) scaled by e) from (the
                // current row) but start at the i'th column and assume all the
                // stuff left of diagonal is 0
                for (j = 0; j < 3; j++) {
                    C[ii][j] -= e * C[i][j]; // apply to original matrix
                    I[ii][j] -= e * I[i][j];
                }
            }
        } // apply to identity

        // we've done all operations, C should be the identity
        // matrix I should be the inverse
        return I;
    }


    /**
     * Return a 3x3 matrix representation from the standard 6-number CSS-style
     * notation, [a, b, c, d, e, f[.
     * Translating from CSS form matrix(a, b, c, d, e, f),
     * [
     *   [a, c, e]
     *   [b, d, f]
     *   [0, 0, 1]
     * ]
     *
     * @static
     * @param {*} a
     * @param {*} b
     * @param {*} c
     * @param {*} d
     * @param {*} e
     * @param {*} f
     * @returns {Array}
     * @memberof CssTransformCalculator
     */
    static matrixify(a, b, c, d, e, f) { // eslint-disable-line max-params
        return [
            [a, c, e],
            [b, d, f],
            [0, 0, 1],
        ];
    }

    /**
     * Given a 3x3 transform matrix, return a 6-element array corresponding
     * to the CSS matrix notation.
     * @param {Array} M
     * @return {Array}
     */
    static vectorify(M) {
        return [
            M[0][0],
            M[1][0],
            M[0][1],
            M[1][1],
            M[0][2],
            M[1][2],
        ];
    }

    /**
     * Finds a decomposition of the transform matrix M into some set of
     * simple transform matrixes for translate, scale, rotate, skewX, and
     * skewY. These may or may not be the same as the original values,
     * but should work okay for translation and scaling, which is mostly what
     * we're using.
     *
     * If `M` is the identity transform, the return is an empty array.
     *
     * Math h/t:
     * http://frederic-wang.fr/decomposition-of-2d-transform-matrices.html
     *
     * @param {Array} M - 3x3 transformation matrix
     * @return {Array} of objects like {type: {String}, matrix: {Array}}
     */
    static decompose(M) {
        if (CssTransformCalculator.isIdentity(M)) { return []; }
        const [a, b, c, d, e, f] = CssTransformCalculator.vectorify(M);

        // determinant of the upper-left-hand 2x2 matrix contained in M
        const det = (a * d) - (b * c);

        const translation = {
            type: 'translate',
            matrix: CssTransformCalculator.translateMatrix(e, f),
        };

        // we want to choose the decomposition that doesn't return a skew
        // transform, since this is more likely to match the original input
        // (like, who uses skew anyway?)
        let decomp;
        function clean(decomp) {
            return decomp.filter(obj => obj.matrix != null);
        }
        function hasSkew(decomp) {
            return decomp.reduce(reducer, false);
            function reducer(skew, obj) {
                return skew || (obj.type === 'skewY') || (obj.type === 'skewX');
            }
        }
        const qr = clean(
            CssTransformCalculator.qrDecomposition(a, b, c, d, det));
        if (hasSkew(qr)) {
            const lu = clean(
                CssTransformCalculator.luDecomposition(a, b, c, d, det));
            if (hasSkew(lu)) {
                if (lu.length < qr.length) {
                    decomp = lu;
                } else {
                    decomp = qr;
                }
            } else {
                decomp = lu;
            }
        } else {
            decomp = qr;
        }

        if (translation.matrix != null) {
            decomp.unshift(translation);
        }
        return decomp;
    }

    static luDecomposition(a, b, c, d, det) {
        if (a !== 0) {
            return [
                {
                    type: 'skewY',
                    matrix: CssTransformCalculator.skewYMatrix(
                        Math.atan(b / a)),
                },
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(a, det / a),
                },
                {
                    type: 'skewX',
                    matrix: CssTransformCalculator.skewXMatrix(
                        Math.atan(c / a)),
                },
            ];
        } else if (b !== 0) {
            return [
                {
                    type: 'rotate',
                    matrix: CssTransformCalculator.rotateMatrix(Math.PI / 2),
                },
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(b, det / b),
                },
                {
                    type: 'skewX',
                    matrix: CssTransformCalculator.skewXMatrix(
                        Math.atan(d / b)),
                },
            ];
        } else { // a = b = 0
            return [
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(c, d),
                },
                {
                    type: 'skewX',
                    matrix: CssTransformCalculator.skewXMatrix(Math.PI / 4),
                },
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(0, 1),
                },
            ];
        }
    }

    static qrDecomposition(a, b, c, d, det) {
        let rotate;
        if ((a !== 0) && (b !== 0)) {
            const r = Math.sqrt((a * a) + (b * b));
            rotate = b > 0 ? Math.acos(a / r) : -1 * Math.acos(a / r);
            return [
                {
                    type: 'rotate',
                    matrix: CssTransformCalculator.rotateMatrix(rotate),
                },
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(r, det / r),
                },
                {
                    type: 'skewX',
                    matrix: CssTransformCalculator.skewXMatrix(
                        Math.atan(((a * c) + (b * d)) / (r * r))),
                },
            ];
        } else if ((c !== 0) || (d !== 0)) {
            const s = Math.sqrt((c * c) + (d * d));
            rotate = d > 0 ? Math.acos(-c / s) : -1 * Math.acos(c / s);
            return [
                {
                    type: 'rotate',
                    matrix: CssTransformCalculator.rotateMatrix(
                        (Math.PI / 2) - rotate),
                },
                {
                    type: 'scale',
                    matrix: CssTransformCalculator.scaleMatrix(det / s, s),
                },
                {
                    type: 'skewY',
                    matrix: CssTransformCalculator.skewYMatrix(
                        Math.atan(((a * c) + (b * d)) / (s * s))),
                },
            ];
        } else { // a = b = c = d = 0
            return [{
                type: 'scale',
                matrix: CssTransformCalculator.scaleMatrix(0, 0),
            },
            ];
        }
    }

    /**
     * @param {Number} tx - x coord translation
     * @param {Number} ty - y coord translation
     * @return {Array} 3x3 matrix
     */
    static translateMatrix(tx, ty) {
        if ((tx === 0) && (ty === 0)) { return null; }
        return CssTransformCalculator.matrixify(1, 0, 0, 1, tx, ty);
    }

    /**
     * @param {Number} sx - x scale
     * @param {Number} sy - y scale
     * @return {Array} 3x3 matrix
     */
    static scaleMatrix(sx, sy) {
        if ((sx === 1) && (sy === 1)) { return null; }
        return CssTransformCalculator.matrixify(sx, 0, 0, sy, 0, 0);
    }

    /**
     * @param {Number} theta - rotation angle (radians)
     * @return {Array} 3x3 matrix
     */
    static rotateMatrix(theta) {
        if (theta === 0) { return null; }
        return CssTransformCalculator.matrixify(
            Math.cos(theta),
            Math.sin(theta),
            Math.sin(-1 * theta),
            Math.cos(theta),
            0,
            0
        );
    }

    /**
     * @param {Number} theta - rotation angle (radians)
     * @return {Array} 3x3 matrix
     */
    static skewXMatrix(theta) {
        if (theta === 0) { return null; }
        return CssTransformCalculator.matrixify(1, 0, Math.tan(theta), 1, 0, 0);
    }

    /**
     * @param {Number} theta - rotation angle (radians)
     * @return {Array} 3x3 matrix
     */
    static skewYMatrix(theta) {
        if (theta === 0) { return null; }
        return CssTransformCalculator.matrixify(1, Math.tan(theta), 0, 1, 0, 0);
    }
}

module.exports = CssTransformCalculator;
export default CssTransformCalculator;
