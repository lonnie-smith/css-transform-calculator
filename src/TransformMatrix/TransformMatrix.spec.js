import TransformMatrix from './TransformMatrix';

describe('TransformMatrix', () => {
    const M = new TransformMatrix(1, 2, 3, 4, 5, 6);
    const I = TransformMatrix.identity();
    const scale = TransformMatrix.fromScale(6, 8);
    const skewX = TransformMatrix.fromSkewX(13);
    const skewY = TransformMatrix.fromSkewY(17);
    const skew = TransformMatrix.fromSkewBoth(1, 2);
    const rotate = TransformMatrix.fromRotate(23);
    const translate = TransformMatrix.fromTranslation(-13, -17);
    const translateX = TransformMatrix.fromTranslation(9, 0);
    const translateY = TransformMatrix.fromTranslation(0, 9);

    it('Should correctly translate CSS vectors into 3x3 Arrays', () => {
        expect(M.cssVector).toEqual([1, 2, 3, 4, 5, 6]);
        expect(M.matrix).toEqual([
            [1, 3, 5],
            [2, 4, 6],
            [0, 0, 1],
        ]);
    });

    it('Should correctly generate a matrix from a 3x3 array', () => {
        const M1 = TransformMatrix.fromArray([
            [1, 3, 5],
            [2, 4, 6],
            [0, 0, 1],
        ]);
        expect(M1.cssVector).toEqual(M.cssVector);
    });

    it('Should clone a matrix', () => {
        const M1 = M.clone();
        expect(M1.cssVector).toEqual(M.cssVector);
        expect(M1.matrix).toEqual(M.matrix);
    });

    it('Should generate identity matrixes', () => {
        expect(I.cssVector).toEqual([1, 0, 0, 1, 0, 0]);
        expect(I.matrix).toEqual([
            [1, 0, 0],
            [0, 1, 0],
            [0, 0, 1],
        ]);
        expect(I.type).toBe('identity');
    });

    it('Should generate scale matrixes', () => {
        expect(scale.type).toBe('scale');
        expect(scale.matrix).toEqual([
            [6, 0, 0],
            [0, 8, 0],
            [0, 0, 1],
        ]);
    });

    it('Should correctly identify identity matrixes', () => {
        const I1 = new TransformMatrix(1, 0, 0, 1, 0, 0);
        const M1 = new TransformMatrix(2, 0, 0, 1, 0, 0);
        expect(I1.isIdentity()).toBe(true);
        expect(M1.isIdentity()).toBe(false);
    });

    it('Should treat a scale(1, 1) matrix as an identity matrix', () => {
        const M1 = TransformMatrix.fromScale(1, 1);
        expect(M1.type).toBe('identity');
        expect(M1.matrix).toEqual(I.matrix);
    });

    it('Should generate skewX matrixes', () => {
        expect(skewX.type).toBe('skewX');
        expect(skewX.matrix).toEqual([
            [1, Math.tan(13), 0],
            [0, 1, 0],
            [0, 0, 1],
        ]);
    });

    it('Should generate skewY matrixes', () => {
        expect(skewY.type).toBe('skewY');
        expect(skewY.matrix).toEqual([
            [1, 0, 0],
            [Math.tan(17), 1, 0],
            [0, 0, 1],
        ]);
    });

    it('Should generate matrixes which skew on both dimensions', () => {
        expect(skew.type).toBe('skew');
    });

    it('Should generate rotation matrixes', () => {
        expect(rotate.type).toBe('rotate');
        expect(rotate.matrix).toEqual([
            [Math.cos(23), -1 * Math.sin(23), 0],
            [Math.sin(23), Math.cos(23), 0],
            [0, 0, 1],
        ]);
    });

    it('Should correctly classify a handmade rotation matrix', () => {
        const theta = 33;
        const sin = Math.sin(theta);
        const cos = Math.cos(theta);
        const M1 = new TransformMatrix(
            cos,
            sin,
            -1 * sin,
            cos,
            0,
            0
        );
        expect(M1.type).toBe('rotate');
    });

    it('Should generate translate matrixes', () => {
        expect(translate.type).toBe('translate');
        expect(translate.matrix).toEqual([
            [1, 0, -13],
            [0, 1, -17],
            [0, 0, 1],
        ]);
        expect(translateX.type).toBe('translate');
        expect(translateX.matrix).toEqual([
            [1, 0, 9],
            [0, 1, 0],
            [0, 0, 1],
        ]);
        expect(translateY.type).toBe('translate');
        expect(translateY.matrix).toEqual([
            [1, 0, 0],
            [0, 1, 9],
            [0, 0, 1],
        ]);
    });

    it('Should classify a handmade composite matix', () => {
        expect(M.type).toBe('composite');
    });

    it('Should correctly transform an arbitrary point', () => {
        expect(true).toBe(false);
        pending();
        // TODO: test transform
    });

    it('Should correctly apply the scale from an arbitrary transform', () => {
        pending();
        // TODO
    });

    it('Should correctly apply the translation from an arbitrary transform', () => {
        pending();
        // TODO
    });
});
