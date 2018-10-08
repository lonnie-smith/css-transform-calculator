import TransformMatrix from '../TransformMatrix';

/**
 * Find the matrix vector product of TransformMatrix `matrix` and a 3-element
 * Array `vector`.
 *
 * @export
 * @param {TransformMatrix} matrix1
 * @param {Array<Number, Number, Number>} vector
 * @returns {Array<Number, Number, Number>}
 */
export function matrixVectorProduct(matrix1, vector) {
    const M = matrix1.matrix;
    return M.map(row => {
        return vector.reduce(((sum, a, i) => sum + (a * row[i])), 0);
    });
}

/**
 * Find the dot product of two TransformMatrixes
 * @export
 * @param {TransformMatrix} matrix1
 * @param {TransformMatrix} matrix2
 * @returns {TransformMatrix}
 */
export function dotProduct(matrix1, matrix2) {
    const M1 = matrix1.matrix;
    const M2 = matrix2.matrix;
    const type = matrix1.type === matrix2.type ? matrix1.type : 'composite';

    // column vectors of M2
    const M2t = [
        [M2[0][0], M2[1][0], M2[2][0]],
        [M2[0][1], M2[1][1], M2[2][1]],
        [M2[0][2], M2[1][2], M2[2][2]],
    ];

    const rslt = M1.map(row =>
        M2t.map(col => product(row, col))
    );

    return TransformMatrix.fromArray(rslt, type);

    function product(v1, v2) {
        return v1.reduce(((sum, a, i) => sum + (a * v2[i])), 0);
    }
}

/**
 * Given a 3x3 TransformMatrix `matrix1` representing a transform from an
 * original space into a tranformed space, find the inverse of the matrix
 * so that we can take coordinates in the transformed space and
 * find their original values.
 *
 * Uses Gauss-Jordan elimination; algorithm thanks to
 * http://blog.acipo.com/matrix-inversion-in-javascript/
 * @param {TransformMatrix} matrix1
 * @return {TransformMatrix}
 */
export function invert(matrix1) {
    const C = matrix1.matrix;
    const I = TransformMatrix.identity().matrix;

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
    return TransformMatrix.fromArray(I, matrix1.type);
}
