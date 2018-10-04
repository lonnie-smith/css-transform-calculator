import TransformMatrix from './TransformMatrix';

/**
 * Finds a decomposition of the transform matrix `matrix` into some set of
 * simple transform matrixes for translate, scale, rotate, skewX, and
 * skewY. These may or may not be the same as the original values,
 * but should work okay for translation and scaling, which is mostly what
 * we're using.
 *
 * If `matrix` is the identity transform, the return is an empty array.
 *
 * Math thanks to:
 * http://frederic-wang.fr/decomposition-of-2d-transform-matrices.html
 *
 * @param {TransformMatrix} matrix
 * @return {Array<TransformMatrix>}
 */
export default function decomposeTransformation(matrix) {
    if (matrix.isIdentity()) { return []; }
    if (matrix.type !== 'composite') {
        return [matrix.clone()];
    }
    const [a, b, c, d, e, f] = matrix.cssVector;

    // An affine transformation is the combination of a linear transformation
    // plus a translation. We start by pulling the translation element out,
    // since it is easy to separate.
    const translation = TransformMatrix.fromTranslation(e, f);

    // If the transform contains a translation, we look at the remaining linear
    // transformation to see if it is composite and requires further
    // decomposition.
    if (e !== 0 && f !== 0) {
        const linearTxfrm = new TransformMatrix(a, b, c, d, 0, 0);
        if (linearTxfrm.type !== 'composite') {
            return [translation, linearTxfrm];
        }
    }

    // Decompose the 2D linear transformation into a series of simple
    // transformations. We try two different methods of decomposition, neither
    // one of which is guaranteed to return the original transforms. In order
    // to choose which decomposition is best, we choose the one with the
    // skewX/skewY values closest to zero, based on the rationale that skew
    // isn't often used and so decompositions which rely less on skews will
    // likely better approximate the original inputs.

    // First, find the determinant of the 2D linear transform (i.e., the
    // upper-left-hand 2x2  matrix [[a, c], [b, d]])
    const det = (a * d) - (b * c);

    // Now, decompose the 2D linear transformation into a series of simple
    // transformations. We try two different methods of decomposition, neither
    // one of which is guaranteed to return the original transforms.
    const qr = _qrDecomposition(a, b, c, d, det);
    const lu = _luDecomposition(a, b, c, d, det);

    // In order to choose which decomposition is best, we choose the one with
    // the skewX/skewY values closest to zero. Skew isn't often used, often used
    // and so decompositions which rely less on skews will likely better
    // approximate the original inputs. (In practice, one or the other of
    // the decomp methods will come up with skew factors which are close to
    // zero, which still provides a decent approximation of the original scale
    // or rotate factors used in input.)
    const qrSkew = skewSize(qr);
    const luSkew = skewSize(lu);
    const decomp = (qrSkew < luSkew) ? qr : lu;
    decomp.unshift(translation);

    // Remove any identity transforms & return the decomposition
    return decomp.filter(m => !(m.isIdentity()));

    function skewSize(matrixes) {
        return matrixes.reduce(reducer, 0);
        function reducer(size, m) {
            if (m.type === 'skewX') {
                return size + Math.abs(m.values[2]);
            } else if (m.type === 'skewY') {
                return size + Math.abs(m.values[1]);
            }
            return size;
        }
    }
}

/**
 * Peform LU Decomposition
 *
 * @param {Number} a
 * @param {Number} b
 * @param {Number} c
 * @param {Number} d
 * @param {Number} det
 * @returns {Array<TransformMatrix>}
 */
function _luDecomposition(a, b, c, d, det) {
    if (a !== 0) {
        return [
            TransformMatrix.fromSkewY(Math.atan(b / a)),
            TransformMatrix.fromScale(a, det / a),
            TransformMatrix.fromSkewX(Math.atan(c / a)),
        ];
    } else if (b !== 0) {
        return [
            TransformMatrix.fromRotate(Math.PI / 2),
            TransformMatrix.fromScale(b, det / b),
            TransformMatrix.fromSkewX(Math.atan(d / b)),
        ];
    } else { // a = b = 0
        return [
            TransformMatrix.fromScale(c, d),
            TransformMatrix.fromSkewX(Math.PI / 4),
            TransformMatrix.fromScale(0, 1),
        ];
    }
}

/**
 * Perform QR Decomposition.
 *
 * @param {Number} a
 * @param {Number} b
 * @param {Number} c
 * @param {Number} d
 * @param {Number} det
 * @returns {Array<TransformMatrix>}
 */
function _qrDecomposition(a, b, c, d, det) {
    if ((a !== 0) && (b !== 0)) {
        const r = Math.sqrt((a * a) + (b * b));
        const rotate = b > 0 ? Math.acos(a / r) : -1 * Math.acos(a / r);
        return [
            TransformMatrix.fromRotate(rotate),
            TransformMatrix.fromScale(r, det / r),
            TransformMatrix.fromSkewX(Math.atan(((a * c) + (b * d)) / (r * r))),
        ];
    } else if ((c !== 0) || (d !== 0)) {
        const s = Math.sqrt((c * c) + (d * d));
        const rotate = d > 0 ? Math.acos(-c / s) : -1 * Math.acos(c / s);
        return [
            TransformMatrix.fromRotate((Math.PI / 2) - rotate),
            TransformMatrix.fromScale(det / s, s),
            TransformMatrix.fromSkewY(Math.atan(((a * c) + (b * d)) / (s * s))),
        ];
    } else { // a = b = c = d = 0
        return [
            TransformMatrix.identity(),
        ];
    }
}
