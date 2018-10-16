import {
    _parseFunctions,
    _parseArgs,
    _matrix,
    _translate,
    _scale,
    _rotate,
    _skew,
    default as parseCss,
} from './parseCss';

describe('parseCss', () => {
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
                'foo(3deg)',
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
                {
                    string: 'matrix(1, 2, 3, 4, 5, 6)',
                    vector: [1, 2, 3, 4, 5, 6],
                },
                {
                    string: 'matrix(-1, +2, 3.1, 0.4, .5, 6)',
                    vector: [-1, 2, 3.1, 0.4, .5, 6],
                },
            ], _matrix, 'composite');
        });
    });

    describe('_translate', () => {
        it('Should not return a matrix for malformed input', () => {
            undefinedAll([
                'translate()',
                'translateX()',
                'translateY()',
                'translate(foo)',
                'translateX(foo)',
                'translateY(foo)',
                'translate(1px, 3deg)',
                'translateX(3px, 4px)',
                'translateY(3px, 4px)',
                'translate(2)',
                'translateX(2)',
                'translateY(2)',
            ], _translate);
        });

        it('Should return the correct matrix for valid translate input', () => {
            matrixMatchAll([
                {
                    string: 'translateX(10px)',
                    vector: [1, 0, 0, 1, 10, 0],
                },
                {
                    string: 'translateY(-1.234px)',
                    vector: [1, 0, 0, 1, 0, -1.234],
                },
                {
                    string: 'translate(-3px, +5px)',
                    vector: [1, 0, 0, 1, -3, 5],
                },
                {
                    string: 'translate(-3px)',
                    vector: [1, 0, 0, 1, -3, 0],
                },
            ], _translate, 'translate');
        });
    });

    describe('_scale', () => {
        it('Should not return a matrix for malformed input', () => {
            undefinedAll([
                'scale()',
                'scaleX()',
                'scaleY()',
                'scale(foo)',
                'scaleX(foo)',
                'scaleY(foo)',
                'scale(1px, 3deg)',
                'scaleX(3px, 4px)',
                'scaleY(3px, 4px)',
                'scale(2deg)',
                'scaleX(2px)',
                'scaleY(2em)',
            ], _scale);
        });

        it('Should return the correct matrix for valid scale input', () => {
            matrixMatchAll([
                {
                    string: 'scaleX(10)',
                    vector: [10, 0, 0, 1, 0, 0],
                },
                {
                    string: 'scaleY(-1.234)',
                    vector: [1, 0, 0, -1.234, 0, 0],
                },
                {
                    string: 'scale(-3, +5)',
                    vector: [-3, 0, 0, 5, 0, 0],
                },
                {
                    string: 'scale(-3)',
                    vector: [-3, 0, 0, -3, 0, 0],
                },
            ], _scale, 'scale');
        });
    });

    describe('_rotate', () => {
        it('Should not return a matrix for malformed input', () => {
            undefinedAll([
                'rotate()',
                'rotate(foo)',
                'rotate(1px)',
                'rotate(2)',
                'rotate(2deg, 3deg)',
            ], _rotate);
        });

        it('Should return the correct matrix for valid rotate input', () => {
            matrixMatchAll([
                {
                    string: 'rotate(-3rad)',
                    vector: vect(-3),
                },
                {
                    string: 'rotate(0.5rad)',
                    vector: vect(0.5),
                },
            ], _rotate, 'rotate');
        });

        function vect(theta) {
            return [
                Math.cos(theta),
                Math.sin(theta),
                -1 * Math.sin(theta),
                Math.cos(theta),
                0,
                0,
            ];
        }
    });

    describe('_skew', () => {
        it('Should not return a matrix for malformed input', () => {
            undefinedAll([
                'skew()',
                'skewX()',
                'skewY()',
                'skew(foo)',
                'skewX(foo)',
                'skewY(foo)',
                'skew(1px, 3deg)',
                'skewX(3deg, 4deg)',
                'skewY(3deg, 4deg)',
                'skew(2ox)',
                'skewX(2px)',
                'skewY(2em)',
            ], _skew);
        });

        it('Should return the correct matrix for valid skew input', () => {
            matrixMatchAll([
                {
                    string: 'skewX(1rad)',
                    vector: [1, 0, tan(1), 1, 0, 0],
                },
                {
                    string: 'skew(-3rad)',
                    vector: [1, 0, tan(-3), 1, 0, 0],
                },
            ], _skew, 'skewX');
            matrixMatchAll([
                {
                    string: 'skewY(-1.234rad)',
                    vector: [1, tan(-1.234), 0, 1, 0, 0],
                },
            ], _skew, 'skewY');
            matrixMatchAll([
                {
                    string: 'skew(-3rad, +5rad)',
                    vector: [1, tan(5), tan(-3), 1, 0, 0],
                },
            ], _skew, 'skew');
        });

        function tan(x) {
            return Math.tan(x);
        }
    });

    describe('parseCss', () => {
        it('Should return the correct single matrixes', () => {
            const tests = [
                {
                    string: 'matrix(1, 2, 3, 4, 5, 6)',
                    type: 'composite',
                    vector: [1, 2, 3, 4, 5, 6],
                },
                {
                    string: 'translate(3px)',
                    type: 'translate',
                    vector: [1, 0, 0, 1, 3, 0],
                },
            ];
            tests.forEach(test => {
                const Ms = parseCss(test.string, false);
                expect(Ms.length).toBe(1);
                expect(Ms[0].type).toBe(test.type);
                expect(Ms[0].cssVector).toEqual(test.vector);
            });
        });

        it('Should return a series of matrixes in the correct order', () => {
            const tests = [
                {
                    string: 'translate(3px) scale(2)',
                    results: [
                        {
                            type: 'translate',
                            vector: [1, 0, 0, 1, 3, 0],
                        },
                        {
                            type: 'scale',
                            vector: [2, 0, 0, 2, 0, 0],
                        },
                    ],
                },
                {
                    string: 'scale(2) translate(3px)',
                    results: [
                        {
                            type: 'scale',
                            vector: [2, 0, 0, 2, 0, 0],
                        },
                        {
                            type: 'translate',
                            vector: [1, 0, 0, 1, 3, 0],
                        },
                    ],
                },
                {
                    string: 'scale(2) translate(3px) rotate(1rad)',
                    results: [
                        {
                            type: 'scale',
                            vector: [2, 0, 0, 2, 0, 0],
                        },
                        {
                            type: 'translate',
                            vector: [1, 0, 0, 1, 3, 0],
                        },
                        {
                            type: 'rotate',
                            vector: [Math.cos(1), Math.sin(1), -1 * Math.sin(1), Math.cos(1), 0, 0],
                        },
                    ],
                },
            ];
            tests.forEach(test => {
                const Ms = parseCss(test.string, false);
                expect(Ms.length).toBe(test.results.length);
                test.results.forEach((result, idx) => {
                    expect(Ms[idx].type).toBe(result.type);
                    expect(Ms[idx].cssVector).toEqual(result.vector);
                });
            });
        });

        it('Should throw an error when a function is not recognized or has malformed arguments', () => {
            const bads = [
                'foo(123)',
                'rotate(3px)',
                'rotate(3)',
                'rotate(4deg, 5deg)',
                'skew(2deg) foo(3)',
                'skew(2deg) translate(3px, 4em)',
                'skew(2deg) translate(3px, 4px)scale(3)',
            ];
            throwAll(bads, parseCss, [false]);
        });

        it('Should throw an error in safe mode when a 3D function is used', () => {
            const bads = [
                'translate3d(1px, 2px, 3px)',
                'translateZ(1px)',
                'perspective(1px)',
                'rotate3d(1deg, 2deg, 3deg)',
                'rotateX(4deg)',
                'rotateY(4deg)',
                'rotateZ(4deg)',
                'scaleZ(4)',
                'scale3d(4, 1, 3)',
                'skew(2deg) matrix3d(1, 2, 3, 4, 5, 6)',
            ];
            throwAll(bads, parseCss, [true]);
        });

        it('Should not throw an error in default mode when 3D function is used', () => {
            const tests = [
                {
                    string: 'translate(3px) perspective(3px) scale(2)',
                    results: [
                        {
                            type: 'translate',
                            vector: [1, 0, 0, 1, 3, 0],
                        },
                        {
                            type: 'scale',
                            vector: [2, 0, 0, 2, 0, 0],
                        },
                    ],
                },
            ];
            tests.forEach(test => {
                const Ms = parseCss(test.string, false);
                expect(Ms.length).toBe(test.results.length);
                test.results.forEach((result, idx) => {
                    expect(Ms[idx].type).toBe(result.type);
                    expect(Ms[idx].cssVector).toEqual(result.vector);
                });
            });
        });

        xit('Should throw an error when a function has malformed arguments', () => {

        });
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

function matrixMatchAll(testCases, func, type) {
    for (const testCase of testCases) {
        const M = func(testCase.string);
        expect(M.type).toBe(type);
        expect(M.cssVector).toEqual(testCase.vector);
    }
}
