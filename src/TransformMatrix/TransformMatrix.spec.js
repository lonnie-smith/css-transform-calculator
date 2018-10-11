import TransformMatrix from './TransformMatrix';

describe('TransformMatrix', () => {
    it('Should correctly translate CSS vectors into 3x3 Arrays', () => {
        const M = new TransformMatrix(1, 2, 3, 4, 5, 6);
        expect(M.cssVector).toEqual([1, 2, 3, 4, 5, 6]);
    });
});
