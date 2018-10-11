import decomposeTransformation from './decomposeTransformation/decomposeTransformation';
import { invert, matrixVectorProduct, dotProduct } from './matrixOperations/matrixOperations';

/**
 * Represents a 2D affine transformation of one of the varieties supported by
 * CSS transforms.
 *
 * TransformMatrixes are meant to be immutable; performing operations using
 * one of the TransformMatrix methods generally returns a new TransformMatrix.
 *
 * Transformations are represented internally using one of the
 * following formats:
 *
 *  1. An array of 6 numbers as used in the CSS matrix syntax, e.g.,
 *     "matrix(a, b, c, d, e, f)". This can be retrieved from the `cssVector`
 *     property.
 *
 *  2. An 3x3 array representing an augmented 3x3 matrix. The matrix consists of
 *     a linear transformation plus a translation vector, e.g.,
 *     [
 *      [a, c, e]
 *      [b, d, f]
 *      [0, 0, 1]
 *    ]
 *    This can be retrieved from the `matrix` property, and is useful for
 *    performing calculations. (see, e.g.,
 *    https://en.wikipedia.org/wiki/Affine_transformation#Augmented_matrix)
 *
 *
 * @class TransformMatrix
 */
class TransformMatrix {
    /**
     * Create a TransformMatrix from the standard 6-number CSS-style
     * notation, matrix(a, b, c, d, e, f), which translates to:
     * [
     *   [a, c, e]
     *   [b, d, f]
     *   [0, 0, 1]
     * ]
     *
     * @param {Number} a
     * @param {Number} b
     * @param {Number} c
     * @param {Number} d
     * @param {Number} e
     * @param {Number} f
     */
    constructor(a, b, c, d, e, f) { // eslint-disable-line max-params
        this._values = [a, b, c, d, e, f];
    }

    /**
     * Determines the type of this transformation; one of 'composite',
     * 'translate', 'rotate', 'scale', 'skewX', 'skewY', or 'identity'
     * @readonly
     * @memberof TransformMatrix
     * @returns {'composite'|'translate'|'rotate'|'scale'|'skewX'|'skewY'|'identity'}
     */
    get type() {
        if (this._type == null) {
            this._type = this._getType();
        }
        return this._type;
    }

    /**
     * Set the type of this transformation based on its matrix values.
     * @returns {'composite'|'translate'|'rotate'|'scale'|'skewX'|'skewY'|'identity'}
     * @memberof TransformMatrix
     */
    _getType() {
        const [a, b, c, d, e, f] = this._values;
        if (areOne([a, d]) && areZero([b, c, e, f])) {
            return 'identity';
        } else if (areNotZero([e, f]) && areOne([a, b]) && areZero([c, d])) {
            return 'translate';
        } else if (areZero([b, c, e, f])) {
            return 'scale';
        } else if (areOne([a, d]) && areNotZero([c]) && areZero([b, e, f])) {
            return 'skewX';
        } else if (areOne([a, d]) && areNotZero([b]) && areZero([c, e, f])) {
            return 'skewY';
        } else if (areSinCos([a, b, c, d]) && areZero([e, f]) && a === d && (b === c * -1)) {
            return 'rotate';
        } else {
            return 'composite';
        }

        function areZero(arr) {
            return arr.reduce(((rslt, item) => rslt && item === 0), true);
        }

        function areOne(arr) {
            return arr.reduce(((rslt, item) => rslt && item === 1), true);
        }

        function areNotZero(arr) {
            return arr.reduce(((rslt, item) => rslt && item !== 0), true);
        }

        function areSinCos(arr) {
            return arr.reduce(((rslt, item) => rslt && item >= -1 && item <= 1), true);
        }
    }

    /**
     * Returns a copy of the original CSS vector used to create the matrix.
     * @readonly
     * @memberof TransformMatrix
     * @return {Array}
     */
    get cssVector() {
        return [].concat(this._values);
    }

    /**
     * Returns a new array containing the matrix as a 3x3 array
     * @readonly
     * @memberof TransformMatrix
     * @return {Array}
     */
    get matrix() {
        const [a, b, c, d, e, f] = this._values;
        return [
            [a, c, e],
            [b, d, f],
            [0, 0, 1],
        ];
    }

    /**
     * Returns an array of TransformationMatrixes representing a decomposition
     * of this matrix into a series of simple transformations.
     *
     * @returns {Array<TransformMatrix>}
     * @memberof TransformMatrix
     */
    decompose() {
        if (this.type === 'composite') {
            return decomposeTransformation(this);
        } else {
            return [this.clone()];
        }
    }

    /**
     * Provided an array of TransformationMatrixes, multiply them to find a
     * single composite transform that can be used to perform transformation
     * operations.
     *
     * @static
     * @param {Array<TransformMatrix>} transforms
     * @returns {TransformMatrix}
     * @memberof TransformMatrix
     */
    static compose(transforms) {
        return transforms.reduce((product, M) => {
            if (product == null) { return M; }
            return dotProduct(product, M);
        });
    }

    /**
     * Transform the x, y coordinates into the new space represented by this
     * TransformationMatrix
     *
     * @param {Number} x
     * @param {Number} y
     * @returns {{x: Number, y: Number}}
     * @memberof TransformMatrix
     */
    transformPoint(x, y) {
        if (this.isIdentity()) { return { x, y }; }
        // 2D transforms use a vector of length 3; the last element is
        // always 1.
        const v = [x, y, 1];
        const product = matrixVectorProduct(this, v);

        return { x: product[0], y: product[1] };
    }

    /**
     * Return a clone of this TransformMatrix.
     * @returns {TransformMatrix}
     */
    clone() {
        const v = this._values;
        return new TransformMatrix(v[0], v[1], v[2], v[3], v[4], v[5]);
    }

    /**
     * Return a new identiy TransformMatrix
     * @return {TransformMatrix}
     */
    static identity() {
        return new TransformMatrix(1, 0, 0, 1, 0, 0);
    }

    /**
     * Returns `true` when this is an identity matrix.
     * @return {Boolean}
     */
    isIdentity() {
        return this.type === 'identity';
    }

    /**
     * Returns a new Transform matrix from the provided 3x3 array.
     * @param {Array} M
     * @returns {TransformMatrix}
     */
    static fromArray(M) {
        return new TransformMatrix(
            M[0][0],
            M[1][0],
            M[0][1],
            M[1][1],
            M[0][2],
            M[1][2]
        );
    }

    /**
     * Create a new TransformMatrix from a pair of translation coordinates
     * @param {Number} tx - x coord translation
     * @param {Number} ty - y coord translation
     * @return {TransformMatrix|null}
     */
    static fromTranslation(tx, ty) {
        return new TransformMatrix(1, 0, 0, 1, tx, ty);
    }

    /**
     * Create a new TransformMatrix from a pair of scale coordinates
     * @param {Number} sx - x scale
     * @param {Number} sy - y scale
     * @return {TransformMatrix}
     */
    static fromScale(sx, sy) {
        return new TransformMatrix(sx, 0, 0, sy, 0, 0);
    }

    /**
     * Create a new TransformMatrix from a rotation angle
     * @param {Number} theta - rotation angle (radians)
     * @return {TransformMatrix}
     */
    static fromRotate(theta) {
        return new TransformMatrix(
            Math.cos(theta),
            Math.sin(theta),
            Math.sin(-1 * theta),
            Math.cos(theta),
            0,
            0
        );
    }

    /**
     * Create a new TransformMatrix from a Skew X angle
     * @param {Number} theta - rotation angle (radians)
     * @return {TransformMatrix}
     */
    static fromSkewX(theta) {
        return new TransformMatrix(1, 0, Math.tan(theta), 1, 0, 0);
    }

    /**
     * Create a new TransformMatrix from a Skew Y angle
     * @param {Number} theta - rotation angle (radians)
     * @return {TransformMatrix}
     */
    static fromSkewY(theta) {
        return new TransformMatrix(1, Math.tan(theta), 0, 1, 0, 0);
    }

    /**
     * Returns `true` if transformation appears to include a rotation or skew.
     * @readonly
     * @memberof TransformationMatrix
     * @type {Boolean}
     */
    get isSkewedOrRotated() {
        return (this._values[1] !== 0 || this._values[2] !== 0);
    }

    /**
     * The inverse of this transform matrix.
     * @readonly
     * @memberof TransformMatrix
     * @type {TransformMatrix} new matrix
     */
    get inverse() {
        return invert(this);
    }

    /**
     * Given the element `el`, see if it has a 2D transform applied to it.
     * If it does, return the 3x3 matrix (Array) that represents the
     * transform. Otherwise, return null.
     * @param {HTMLElement} el
     * @return {TransformMatrix|null}
     */
    static fromElement(el) {
        // we may be working on an element that belongs to a different window.
        // be sure to use the right window to calculate the style.
        const { getComputedStyle } = el.ownerDocument.defaultView;
        const str = getComputedStyle(el).transform.trim().toLowerCase();

        if (str === 'none') { return null; }

        // browsers will represent transforms as a composite matrix like this:
        // "matrix(a, b, c, d, e, f)"
        if (str.indexOf('matrix3d') > -1) {
            throw new Error(
                'TransformMatrix cannot be created from an element with 3D transforms.');
        }
        if (str.indexOf('matrix(') !== 0) { return null; }
        const css = str.split(/[^.0-9]+/).slice(1, 7)
            .map(parseFloat);
        if (css == null) { return null; }

        return new TransformMatrix(
            css[0], css[1], css[2], css[3], css[4], css[5]);
    }
}

export default TransformMatrix;
