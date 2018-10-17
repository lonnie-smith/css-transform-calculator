import '@babel/polyfill';
import TransformMatrix from './TransformMatrix/TransformMatrix';

/**
 * A CssTransformCalculator calculates the matrixes it needs to effeciently find
 * transformed coordinates as soon as it is created. If some elements in the
 * DOM are transformed dynamically after this element is created, it will
 * give incorrect results, so it's best to instatiate a CssTransformCalculator
 * right before you intend to use it.
 * @class CssTransformCalculator
 */
class CssTransformCalculator {
    /**
     * Create a new CssTransformCalculator instance. The calculator will inspect
     * the DOM structure, taking into account the CSS transforms applied to
     * the target element `el` and all of its ancestors up to
     * `options.baseAncestor` (inclusive).
     *
     * @static
     * @memberof CssTransformCalculator
     * @param {HTMLElement} el - target element
     * @param {Object} options
     * @param {HTMLElement} [options.baseAncestor] - CssTransformCalculator,
     *  by default, will take into account all transforms between `el` and,
     *  traversing up the DOM tree, `baseAncestor`, including transforms on both
     *  `el` and `baseAncestor`. If not provided, calculator will include all
     *  ancestors all the way up to the root of the DOM tree.
     * @param {boolean} [options.safe3D] - The calculator will return incorrect
     *  results if 3D transforms are in use on any element in the path
     *  between `options.baseAncestor` and `el`. By default, a warning will be
     *  emitted on the console when 3D transforms are detected. If you set the
     *  `safe3D` option to `true`, an error will be thrown instead.
     * @param {boolean} [options.safeScale] - The CSS transform calculator
     *  cannot always return accurate results for the `scalePoint()` or
     *  `unscalePoint()` methods on an element when the `scale()` transform
     *  has been applied at the same time as the rotate(), skewX(), or skewY()
     *  transform on an element in the path between `options.baseAncestor` and
     *  `el`. By default, the calculator emits a console warning when the
     *  of `scalePoint()` or `unscalePoint()` may be inaccurate. If you set the
     *  `safeScale` option to `true`, an error will be thrown instead.
     * @param {boolean} [options.includeHostFrames] - Useful when the parent
     *  document of `el` is hosted inside an iframe. When this option is `true`,
     *  the calculator will attempt to include transforms applied to the hosting
     *  iframe and any of its ancestors up to the specified `baseAncestor`. If
     *  `baseAncestor` is not provided, the calculator will traverse the DOM
     *  tree all the way up to the topmost reachable `<body>` element.
     * @param {boolean} [options.ignoreShadowDom] - By default, the calculator
     *  will attempt to account for how `el` may have been distributed into a
     *  Shadow DOM tree, i.e., take into account the structure of the flattened
     *  document tree _as rendered_, as opposed to how the DOM is actually
     *  structured. If you specifically want to ignore when `el` or its
     *  ancestors are distruted into any shadow DOM trees, set this option to
     *  `true`.
     * @returns {CssTransformCalculator}
     */
    static fromElement(el, options) {
        const calc = new CssTransformCalculator();
        calc._options = Object.assign({}, options, {
            fromElement: true,
            fromTransform: false,
        });
        calc._el = el;
        calc._scaleWarning = false;
        return calc;
    }

    /**
     * Create a new CssTransformCalculator instance. The instance will perform
     * calculators based on the provided `transformFunc`, a String representing
     * a valid CSS 2D transform; see see
     * (syntax)[https://developer.mozilla.org/en-US/docs/Web/CSS/transform].
     *
     * Example: "rotate(30deg) scale(1.25) translateX(100px)"
     *
     * Note: the provided transformation function must specify lengths in px
     * units.
     *
     * @static
     * @param {String} transformFunc - a String representing a valid CSS 2D
     * transform;
     * @param {Object} options
     * @param {boolean} [options.safe3D] - The calculator will return incorrect
     *  results if 3D transforms are in use on any element in the path
     *  between `options.baseAncestor` and `el`. By default, a warning will be
     *  emitted on the console when 3D transforms are detected. If you set the
     *  `safe3D` option to `true`, an error will be thrown instead.
     * @param {boolean} [options.safeScale] - The CSS transform calculator
     *  cannot always return accurate results for the `scalePoint()` or
     *  `unscalePoint()` methods on an element when the `scale()` transform
     *  has been applied at the same time as the rotate(), skewX(), or skewY()
     *  transform on an element in the path between `options.baseAncestor` and
     *  `el`. By default, the calculator emits a console warning when the
     *  of `scalePoint()` or `unscalePoint()` may be inaccurate. If you set the
     *  `safeScale` option to `true`, an error will be thrown instead.
     * @returns {CssTransformCalculator}
     * @memberof CssTransformCalculator
     */
    static fromTransform(transformFunc, options) {
        const calc = new CssTransformCalculator();
        calc._options = Object.assign({}, options, {
            fromElement: false,
            fromTransform: true,
        });
        calc._transformFunc = transformFunc;
        calc._scaleWarning = false;
        return calc;
    }

    get _options() {
        return this.__options;
    }

    set _options(options) {
        this.__options = options;
    }

    get _el() {
        return this.__el;
    }

    set _el(el) {
        this.__el = el;
    }

    /*
    * If rotate(), skewX(), skewY(), or matrix() functions are used in
    * certain ways, it can cause some scale calculations to be inaccurate.
    * We use this flag to issue a warning when this condition exists.
    */
    get _scaleWarning() {
        return this.__scaleWarning;
    }

    set _scaleWarning(bool) {
        this.__scaleWarning = bool;
    }

    get _transformFunc() {
        return this.__transformFunc;
    }

    set _transformFunc(func) {
        this.__transformFunc = func;
    }

    /**
     * From a point `x`, `y` relative to an untransformed coordinate
     * space, find the equivalent coordinates relative to the transformed
     * element.
     * @param {Number} x
     * @param {Number} y
     * @return {{x: Number, y: Number}}
     */
    transformPoint(x, y) {
        return this.__compositeTransform.transformPoint(x, y);
    }

    /**
     * From a point `x`, `y` relative to this transformed element, find the
     * equivalent point relative to the untransformed space.
     * @param {Number} x
     * @param {Number} y
     * @return {{x: Number, y: Number}}
     */
    untransformPoint(x, y) {
        return this._compositeInverse.transformPoint(x, y);
    }

    /* eslint-disable max-len */
    /**
     * `Element.getBoundingClientRect()` will provide the size and position of
     * an element relative to the viewport ... after it has been rendered with
     * CSS transforms applied. If you'd like to know what the boundingClientRect
     * would have been `before` this element (and any of its ancestors) were
     * transformed, this method will tell you.
     *
     * @returns {{width: Number, height: Number, top: Number, right: Number, bottom: Number, left: Number}}
     * @memberof CssTransformCalculator
     */
    /* eslint-enable max-len */
    getTransformedBoundingClientRect(el) {
        // TODO: this won't actually work, since _compositeTransform is an
        // instance property calculated from already-applied transforms.
        throw new Error('not implemented');
        // const rect = this._el.getBoundingClientRect();
        // const txfrm = this._compositeTransform;
        // return CssTransformCalculator._transformRect(rect, txfrm);
    }

    /* eslint-disable max-len */
    /**
     * `Element.getBoundingClientRect()` will provide the size and position of
     * an element relative to the viewport ... after it has been rendered with
     * CSS transforms applied. If you'd like to know what the boundingClientRect
     * would have been `before` this element (and any of its ancestors) were
     * transformed, this method will tell you.
     *
     * @param {HTMLElement} [element]
     * @returns {{width: Number|null, height: Number|null, top: Number|null, right: Number|null, bottom: Number|null, left: Number|null}}
     * @memberof CssTransformCalculator
     */
    /* eslint-enable max-len */
    getUntransformedBoundingClientRect(element) {
        let rect;
        if (element) {
            rect = element.getBoundingClientRect &&
                element.getBoundingClientRect();
        } else if (this._el) {
            rect = this._el.getBoundingClientRect();
        }
        const txfrm = this._compositeInverse;
        return CssTransformCalculator._transformRect(rect, txfrm);
    }

    static _transformRect(rect, txfrm) {
        if (rect == null) {
            return {
                width: null,
                height: null,
                top: null,
                right: null,
                bottom: null,
                left: null,
            };
        }
        const origin = txfrm.transformPoint(rect.left, rect.top);
        const edge = txfrm.transformPoint(rect.right, rect.bottom);
        return {
            width: edge.x - origin.x,
            height: edge.y - origin.y,
            top: origin.y,
            right: edge.x,
            bottom: edge.y,
            left: origin.x,
        };
    }

    /**
     * From a point `x`, `y` relative to an untransformed coordinate
     * space, find the equivalent point scaled up to match the
     * element. This will ignore any transformations other than scaling.
     * @param {Number} x
     * @param {Number} y
     * @return {{x: Number, y: Number}}
     */
    scalePoint(x, y) {
        return this._compositeScale.transformPoint(x, y);
    }

    /**
     * From a point `x`, `y` relative to this transformed element, find the
     * equivalent point scaled down to match the original unscaled space. This
     * will ignore any transformations other than scaling.
     * @param {Number} x
     * @param {Number} y
     * @return {{x: Number, y: Number}}
     */
    unscalePoint(x, y) {
        return this._compositeInverseScale.transformPoint(x, y);
    }

    /**
      * Returns an array of TransformMatrixes that will be used to perform
      * calculations.
      *
      * If this calculator has been created based on an element, traverses the
      * DOM up from `el` to `baseAncestor` (including both `el`
      * and `baseAncestor`) and creates an array of TransformMatrixes
      * currently applied to all elements in the path. If any "composite"
      * transforms are applied to an element in the path (i.e., a CSS transform
      * property has been applied that consists of multiple transform functions,
      * e.g. "transform: scale(2) rotate(45deg);" or a matrix() function that
      * cannot be interpreted as a simple transformation), these composite
      * transformations will be decomposed.
      *
      * If this calculator has been created based on a CSS transform function,
      * uses the DOM to convert the input function to a matrix() transform,
      * then decomposes the transform if necessary.
      *
      * @readonly
      * @memberof CssTransformCalculator
      * @type {Array<TransformMatrix>}
      */
    get _transforms() {
        if (this.__transforms) { return this.__transforms; }
        if (this._options.fromTransform) {
            this.__transforms = TransformMatrix.fromCss(this._transformFunc);
        } else if (this._options.fromElement) {
            this.__transforms = this._traverseDom();
        } else {
            throw new Error('Cannot perform calculations using this CssTransformCalculator; please instantiate via CssTransformCalculator.fromElement or CssTransformCalculator.fromTransform');
        }
        return this.__transforms;
    }

    /**
     * Helper method for this._transforms. Traverses the DOM, finds all CSS
     * transforms, and converts them into an array of TransformMatrixes.
     *
     * @returns {Array<TransformMatrix>}
     * @memberof CssTransformCalculator
     */
    _traverseDom() {
        let base;
        if (this._options.baseAncestor == null) {
            base = this._options.includeHostFrames ? null : document.body;
        } else {
            base = this._options.baseAncestor;
        }
        this.__transforms = recurse(this._el, null, []);
        return this.__transforms;

        function recurse(el, distributedParent, matrixes) {
            if (el == null) { return matrixes; }

            // traverse into host document if `element` is root of a document
            // hosted in an iFrame
            if (this._options.includeHostFrames) {
                if (el.nodeType === el.DOCUMENT_NODE) {
                    if (el.defaultView && el.defaultView.frameElement) {
                        return recurse(el.defaultView.frameElement, null, matrixes);
                    } else {
                        return matrixes;
                    }
                }
            }

            // traverse into host element if `element` is the root of a shadow
            // DOM tree.
            if (el.nodeType === el.DOCUMENT_FRAGMENT_NODE) {
                return recurse(el.host, null, matrixes);
            }

            // fetch matrix for this element & decompose if necessary
            const matrix = TransformMatrix.fromElement(el, this._options.safe3D);
            matrixes.push(...this._decomposeMatrix(matrix));

            // stop recursing if we've reached the specified `baseAncestor`
            if (el === base) { return matrixes; }

            // find the correct parent node, allowing for the fact that this
            // `element` may be distributed nodes into the shadow DOM
            // via a `<content>` or `<slot>` element
            let parent;
            if (distributedParent != null) {
                parent = distributedParent.parentNode;
            } else {
                parent = el.parentNode;
            }

            // if `element` is distributed into a shadow tree, we want to
            // traverse the flattened tree (following how the DOM is rendered)
            // rather than the normal DOM structure
            if (parent && !this._options.ignoreShadowDom) {
                const root = parent.root || parent.shadowRoot;
                if (root != null) {
                    const contentEls = root.querySelectorAll(
                        'content, slot');
                    if ((contentEls == null) || (contentEls.length === 0)) {
                        return recurse(parent, null, matrixes);
                    }
                    for (const cEl of contentEls) {
                        let distributed;
                        if (cEl.getDistributedNodes) {
                            distributed = cEl.getDistributedNodes();
                        } else if (cEl.assignedNodes) {
                            distributed = cEl.assignedNodes();
                        } else {
                            distributed = [];
                        }
                        for (const n of distributed) {
                            if (n === el) {
                                return recurse(el, cEl, matrixes);
                            }
                        }
                    }
                }
            }

            // otherwise, we'll just traverse up the normal DOM tree.
            return recurse(parent, null, matrixes);
        }
    }

    /**
     * Helper method for this._transforms. If the provided matrix `M` is
     * composite, decompose it. Otherwise, just return the Array [M].
     *
     * @param {TransformMatrix} M
     * @returns {Array<TransformMatrix>}
     * @memberof CssTransformCalculator
     */
    _decomposeMatrix(M) {
        const matrixes = [];
        if (M.type === 'composite') {
            if (M.isSkewedOrRotated) {
                this._scaleWarning = true;
            }
            const decomp = M.decompose();
            matrixes.push(...decomp);
        } else {
            matrixes.push(M);
        }
        return matrixes;
    }

    /**
     * Inverse of this._transforms
     *
     * @readonly
     * @memberof CssTransformCalculator
     * @type {Array<TransformMatrix>}
     */
    get _inverseTransforms() {
        if (this.__inverseTransforms) { return this.__inverseTransforms; }
        this.__inverseTransforms = this._transforms.map(txfrm => txfrm.inverse);
    }

    /**
     * Calculate the composite TransformMatrix representing all the transforms
     * applied to this element and its ancestors.
     *
     * @readonly
     * @memberof CssTransformCalculator
     * @type {TransformMatrix}
     */
    get _compositeTransform() {
        if (this.__compositeTransform) { return this.__compositeTransform; }
        this.__compositeTransform = TransformMatrix.compose(this._transforms);
    }

    /**
     * Inverse of this.compositeTransform
     *
     * @readonly
     * @memberof CssTransformCalculator
     * @type {TransformMatrix}
     */
    get _compositeInverse() {
        if (this.__compositeInverse) { return this.__compositeInverse; }
        this.__compositeInverse = this._compositeTransform.inverse;
    }

    /**
     * Calculate the scale transforms that have been applied to this element
     * and its ancestors, ignoring all other transformations.
     *
     * @readonly
     * @memberof CssTransformCalculator
     * @type {TransformMatrix}
     */
    get _compositeScale() {
        if (this.__compositeScale) { return this.__compositeScale; }
        const scales = this._transforms.filter(txfrm => txfrm.type === 'scale');
        if (scales.length > 0) {
            this.__compositeScale = TransformMatrix.compose(scales);
        } else {
            this.__compositeScale = TransformMatrix.identity;
        }
        if (this._scaleWarning) {
            const msg = 'It may not be possible to correctly calculate the scale of this element.';
            if (this._options.safeScale) {
                throw new Error(msg);
            } else {
                console.warn(msg);
            }
        }
        return this.__compositeScale;
    }

    /**
     * The inverse of the composite scale transform
     *
     * @readonly
     * @memberof CssTransformCalculator
     * @type {TransformMatrix}
     */
    get _compositeInverseScale() {
        if (this.__compositeInverseScale) {
            return this.__compositeInverseScale;
        }
        this.__compositeInverseScale = this._compositeScale.inverse;
        return this.__compositeInverseScale;
    }
}

module.exports = CssTransformCalculator;
export default CssTransformCalculator;
