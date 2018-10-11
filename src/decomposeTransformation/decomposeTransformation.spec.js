import TransformMatrix from '../TransformMatrix/TransformMatrix';
import decompose from './decomposeTransformation';

describe('decomposeTransformation', () => {
    const I = TransformMatrix.identity();
    // const scaleMatrix = TransformMatrix.fromScale(2, 127);

    it('Should decompose the identiy matrix into an empty array', () => {
        expect(decompose(I)).toEqual([]);
    });

    // it('Should decompose a scale transform as a single transform', () => {
    //     const decomp = decompose(scaleMatrix);
    //     console.log(scaleMatrix.cssVector, scaleMatrix.type);
    //     expect(decomp.length).toBe(1);
    //     expect(decomp[1].cssVector).toEqual(scaleMatrix.cssVector);
    // });
});
