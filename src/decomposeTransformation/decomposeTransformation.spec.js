import TransformMatrix from '../TransformMatrix/TransformMatrix';
import decompose from './decomposeTransformation';

describe('decomposeTransformation', () => {
    const I = TransformMatrix.identity();
    const scale = TransformMatrix.fromScale(6, 8);
    const translate = TransformMatrix.fromTranslation(-13, -17);
    const skewX = TransformMatrix.fromSkewX(13);
    const skewY = TransformMatrix.fromSkewY(17);
    const rotate = TransformMatrix.fromRotate(23);

    it('Should decompose the identiy matrix into an empty array', () => {
        expect(decompose(I)).toEqual([]);
    });

    it('Should decompose a scale transform as a single matrix', () => {
        const decomp = decompose(scale);
        expect(decomp.length).toBe(1);
        expect(decomp[0].cssVector).toEqual(scale.cssVector);
        expect(decomp[0].type).toBe('scale');
    });

    it('Should decompose a translation as a single matrix', () => {
        const decomp = decompose(translate);
        expect(decomp.length).toBe(1);
        expect(decomp[0].cssVector).toEqual(translate.cssVector);
        expect(decomp[0].type).toBe('translate');
    });

    it('Should decompose a skewX transform as a single matrix', () => {
        const decomp = decompose(skewX);
        expect(decomp.length).toBe(1);
        expect(decomp[0].cssVector).toEqual(skewX.cssVector);
        expect(decomp[0].type).toBe('skewX');
    });

    it('Should decompose a skewY transform as a single matrix', () => {
        const decomp = decompose(skewY);
        expect(decomp.length).toBe(1);
        expect(decomp[0].cssVector).toEqual(skewY.cssVector);
        expect(decomp[0].type).toBe('skewY');
    });

    it('Should decompose a rotate transform as a single matrix', () => {
        const decomp = decompose(rotate);
        expect(decomp.length).toBe(1);
        expect(decomp[0].cssVector).toEqual(rotate.cssVector);
        expect(decomp[0].type).toBe('rotate');
    });

    it('Should preserve scale and translate factors when rotations/skews are not present', () => {
        // scale(0.33, 0.77) translate(3px, 7px) scale(5, 3) translate(6px, -10px) scale(0.5, 0.25)
        const M = new TransformMatrix(0.825, 0, 0, 0.5775, 10.89, -17.71);
        const decomp = decompose(M);

        // expected decomp: translate(10.89px, -17.71px) scale(0.825, 0.5775)
        const expectedTxlate = TransformMatrix.fromTranslation(10.89, -17.71);
        const expectedScale = TransformMatrix.fromScale(0.825, 0.5775);
        expect(decomp.length).toBe(2);
        expect(decomp[0].type).toBe('translate');
        expect(decomp[0].cssVector).toEqual(expectedTxlate.cssVector);
        expect(decomp[1].type).toBe('scale');
        expect(decomp[1].cssVector).toEqual(expectedScale.cssVector);
    });

    it('Should preserve original transform types when any simple transform is combined with a translation', () => {
        // scale(1.2) translate(5px, 8px)
        // NOTE: css creates a different transform if if you reverse translate
        // and scale functions!
        const M = new TransformMatrix(1.2, 0, 0, 1.2, 6, 9.6);

        // expected decomp:  translate(6px, 9.6px) scale(1.2)
        const expected = [
            TransformMatrix.fromTranslation(6, 9.6),
            TransformMatrix.fromScale(1.2, 1.2),
        ];
        const decomp = decompose(M);
        expect(decomp.length).toBe(2);
        decomp.forEach((D, idx) => {
            approx(D.cssVector, expected[idx].cssVector);
        });

        // rotate(13deg) translate(5px, 8px)
        const M2 = new TransformMatrix(
            0.97437, 0.224951, -0.224951, 0.97437, 3.07224, 8.91972);

        // expected decomp: translate(3.07224px, 8.91972px) rotate(13deg)
        const expected2 = [
            TransformMatrix.fromTranslation(3.07224, 8.91972),
            TransformMatrix.fromRotate(0.226893),
        ];
        const decomp2 = decompose(M2);
        expect(decomp2.length).toBe(2);
        decomp2.forEach((D, idx) => {
            approx(D.cssVector, expected2[idx].cssVector);
        });
    });

    it('Should minimize skew factors for complex transforms', () => {
        // rotate(13deg) scale(1.5) translate(10px, 10px)
        const M1 = new TransformMatrix(
            1.46156, 0.337427, -0.337427, 1.46156, 11.2413, 17.9898);

        // expected decomp: translate(11.2413px, 17.9898px)
        //   rotate(13deg) scale(1.5)
        const expected1 = [
            TransformMatrix.fromTranslation(11.2413, 17.9898),
            TransformMatrix.fromRotate(0.226893),
            TransformMatrix.fromScale(1.5, 1.5),
        ];
        const decomp1 = decompose(M1);
        expect(decomp1.length).toBe(3);
        decomp1.forEach((D, idx) => {
            approx(D.cssVector, expected1[idx].cssVector);
        });

        // rotate(13deg) scale(1.5, 2) translate(10px, 10px)
        const M2 = new TransformMatrix(
            1.46156, 0.337427, -0.449902, 1.94874, 10.1165, 22.8617);

        // expected decomp; these are very close to original factors,
        // but not exactly.
        //    translate(10.1165px, 22.8617px)
        //    rotate(12.999973447826562deg)
        //    scale(1.5000048713017566,1.9999998493008138)
        //    skewX(-0.00003247096256368571deg)
        const expected2 = [
            TransformMatrix.fromTranslation(10.1165, 22.8617),
            TransformMatrix.fromRotate(0.22689233933584995739),
            TransformMatrix.fromScale(1.5000048713017566, 1.9999998493008138),
            TransformMatrix.fromSkewX(-5.667252080267287344e-7),
        ];
        const decomp2 = decompose(M2);
        expect(decomp2.length).toBe(4);
        decomp2.forEach((D, idx) => {
            approx(D.cssVector, expected2[idx].cssVector);
        });
    });
});


function approx(a, b) {
    expect(round(a)).toEqual(round(b));

    function round(x) {
        return x.map(el => Math.round(el * 100000));
    }
}
