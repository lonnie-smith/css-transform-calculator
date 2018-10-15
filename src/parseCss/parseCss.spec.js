import TransformMatrix from '../TransformMatrix/TransformMatrix';

import {
    _parseFunctions,
    _parseArgs,
    _matrix,
} from './parseCss';

describe('_parseFunctions', () => {
    it('Should throw an error when an unparseable string is provided', () => {
        throwAll ([
            'scale(1.5',
            'scale(1.5) translate',
            'scale(1.5)translate(3px, 3px)',
        ], _parseFunctions);
    });

    it('Should parse out each function', () => {
        checkAll([
            ['scale(1.5)', ['scale(1.5)']],
            ['scale(1.5) translate(3px)', ['scale(1.5)', 'translate(3px)']],
            ['scale(1.5, 2) translate(3px, 10px)', ['scale(1.5, 2)', 'translate(3px, 10px)']],
        ], _parseFunctions);
    });
});

describe('_parseArgs', () => {
    it('Should throw an error if arguments aren’t correctly delimited', () => {
        throwAll([
            'foo(3,)',
            'foo(3,4,)',
        ], _parseArgs);
    });

    it('Should throw an error if arguments aren’t valid numbers', () => {
        throwAll([
            'foo(+-3)',
            'foo(3, -+4)',
            'foo(3, 4.5.6, 7)',
            'foo(3, 4abc5, 7)',
        ], _parseArgs);
    });

    it('Should throw an error if unitless arguments have units', () => {
        throwAll([
            'foo(3px)',
            'foo( 3 px )',
            'foo(3em, 5rem)',
            'foo(3px, bar)',
        ], _parseArgs);
    });

    it('Should correctly parse unitless arguments', () => {
        checkAll([
            ['foo(1)', [1]],
            ['foo(1, 2,3)', [1, 2, 3]],
            ['foo(+1, -2,3)', [1, -2, 3]],
            ['foo(1.23, 4.56)', [1.23, 4.56]],
        ], _parseArgs);
    });

    it('Should throw an error if lengths aren’t specified in px', () => {
        throwAll([
            'foo(3)',
            'foo(NaN)',
            'foo(3em)',
            'foo(5%, 3px)',
            'foo(3em, 5rem)',
        ], _parseArgs, ['length']);
    });

    it('Should correctly parse length arguments', () => {
        checkAll([
            ['foo(1px)', [1]],
            ['foo(1px, 2px,3px)', [1, 2, 3]],
            ['foo(+1px, -2px,3px)', [1, -2, 3]],
            ['foo(1.23px, 4.56px)', [1.23, 4.56]],
        ], _parseArgs, ['length']);
    });

    it('Should throw an error if angles don’t have valid units', () => {
        throwAll([
            'foo(3)',
            'foo(NaN)',
            'foo(3em)',
            'foo(5deg, 3%)',
        ], _parseArgs, ['angle']);
    });

    it('Should correctly parse angle arguments', () => {
        checkAll([
            ['foo(180deg)', [Math.PI]],
            ['foo(15rad)', [15]],
            ['foo(2turn)', [4 * Math.PI]],
            ['foo(1rad, 2rad, 90deg)', [1, 2, 0.5 * Math.PI]],
        ], _parseArgs, ['angle']);

        // got to adjust for floating point errors
        const actual = Math.round(_parseArgs('foo(200grad)', 'angle')[0] * 10000);
        const expected = Math.round(Math.PI * 10000);
        expect(actual).toBe(expected);
    });
});

describe('_matrix', () => {
    it('Should not return a matrix for malformed input', () => {
        undefinedAll([
            'matrix()',
            'matrix( )',
            'matrix(1, 2, 3, 4, 5)',
            'matrix(1, 2, 3, 4, 5, 6abc)',
            'matrix(1, 2, 3, 4.5.6, 5, 6)',
            'matrix(1, 2, 3, +-4, 5, 6)',
            'matrix(1, 2, 3, +-4, 5, 6, 7)',
        ], _matrix);
    });

    it('Should return the correct matrix for valid matrix input', () => {
        matrixMatchAll([
            ['matrix(1, 2, 3, 4, 5, 6)', [1, 2, 3, 4, 5, 6]],
            ['matrix(-1, +2, 3.1, 0.4, .5, 6)', [-1, 2, 3.1, 0.4, .5, 6]],
        ], _matrix);
    });
});

function checkAll(testCases, func, rest = []) {
    for (const testCase of testCases) {
        const input = testCase[0];
        const expected = testCase[1];
        expect(func(input, ...rest)).toEqual(expected);
    }
}

function throwAll(badInputs, func, rest = []) {
    for (const bad of badInputs) {
        expect(() => func(bad, ...rest)).toThrow();
    }
}

function undefinedAll(badInputs, func, rest = []) {
    for (const bad of badInputs) {
        expect(func(bad, ...rest)).toBeUndefined();
    }
}

function matrixMatchAll(testCases, func, rest = []) {
    for (const testCase of testCases) {
        const input = testCase[0];
        const [a, b, c, d, e, f] = testCase[1];
        const expected = new TransformMatrix(a, b, c, d, e, f);
        expect(func(input, ...rest).cssVector).toEqual(expected.cssVector);
    }
}
