import { matrixVectorProduct, dotProduct, invert } from './matrixOperations';
import TransformMatrix from '../TransformMatrix/TransformMatrix';

describe('matrixVectorProduct', () => {
    const I = TransformMatrix.identity();
    const M1 = new TransformMatrix(1, 2, 3, 4, 5, 6);
    const M2 = new TransformMatrix(0, 0, 0, 0, 0, 0);
    const M3 = new TransformMatrix(3, 5, 7, 11, 13, 17);

    const v1 = [11, 13, 17];
    const v2 = [-1, -2, -3];

    it('Should calculate the matrix vector product for the identity matrix', () => {
        expect(matrixVectorProduct(I, v1)).toEqual(v1);
        expect(matrixVectorProduct(I, v2)).toEqual(v2);
    });

    it('Should calculate the matrix vector product for the other matrixes', () => {
        expect(matrixVectorProduct(M1, v1)).toEqual([135, 176, 17]);
        expect(matrixVectorProduct(M1, v2)).toEqual([-22, -28, -3]);

        expect(matrixVectorProduct(M2, v1)).toEqual([0, 0, 17]);
        expect(matrixVectorProduct(M2, v2)).toEqual([0, 0, -3]);

        expect(matrixVectorProduct(M3, v1)).toEqual([345, 487, 17]);
        expect(matrixVectorProduct(M3, v2)).toEqual([-56, -78, -3]);
    });
});

describe('dotProduct', () => {
    const I = TransformMatrix.identity();
    const M1 = new TransformMatrix(1, 2, 3, 4, 5, 6);
    const M2 = new TransformMatrix(0, 0, 0, 0, 0, 0);
    const M3 = new TransformMatrix(3, 5, 7, 11, 13, 17);

    it('Should calculate the dot product for the identity matrix', () => {
        expect(dotProduct(I, I).cssVector).toEqual([1, 0, 0, 1, 0, 0]);
        expect(dotProduct(I, M1).cssVector).toEqual(M1.cssVector);
        expect(dotProduct(I, M2).cssVector).toEqual(M2.cssVector);
        expect(dotProduct(I, M3).cssVector).toEqual(M3.cssVector);
        expect(dotProduct(M3, I).cssVector).toEqual(M3.cssVector);
    });

    it('Should calculate the dot product for other matrixes', () => {
        expect(dotProduct(M1, M1).cssVector).toEqual([7, 10, 15, 22, 28, 40]);
        expect(dotProduct(M1, M2).cssVector).toEqual([0, 0, 0, 0, 5, 6]);
        expect(dotProduct(M1, M3).cssVector).toEqual([18, 26, 40, 58, 69, 100]);
        expect(dotProduct(M3, M1).cssVector).toEqual([17, 27, 37, 59, 70, 108]);
    });
});

describe('invert', () => {
    const I = TransformMatrix.identity();
    const M1 = new TransformMatrix(1, 2, 3, 4, 5, 6);
    const M2 = new TransformMatrix(0, 0, 0, 0, 0, 0);
    const M3 = new TransformMatrix(3, 5, 7, 11, 13, 17);

    it('Should calculate the inverse of the identity matrix', () => {
        expect(invert(I).cssVector).toEqual(I.cssVector);
    });

    it('Should calculate the inverse of an invertible matrix', () => {
        expect(invert(M1).cssVector).toEqual([-2, 1, 1.5, -0.5, 1, -2]);
        const r = invert(M3).cssVector;
        const e = [-5.4999, 2.4999, 3.4999, -1.4999, 11.9999, -6.9999];
        for (let i = 0; i < 5; i++) {
            const rslt = r[i];
            const expected = e[i];
            expect(rslt).toBeCloseTo(expected, 3);
        }
    });

    it('Should throw an error when the matrix is not invertible', () => {
        expect(() => invert(M2)).toThrowError();
    });
});
