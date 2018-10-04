import 'babel-polyfill';
import TransformMatrix from './TransformMatrix';

/**
 * Frequently, we need to obtain coordinates of a point relative to an
 * element which has had 2D transforms applied to it. This is a nontrivial
 * process due to the fact that `window.getComputedStyle` returns the
 * matrix() function rather than the individual translate(), scale(),
 * rotate() and skew() tranformation functions, and because multiple
 * transformations may be applied to various ancestors of a given element.
 *
 * This utility class implements the math necessary to obtain the matrix
 * transforms of a given element, invert those transformations, and, if
 * multiple different 2D transformations have been applied, decompose those
 * transformations so you can apply (or invert) just some of them.
 *
 * A CssTransformCalculator calculates the matrixes it needs to effeciently find
 * transformed coordinates as soon as it is created. If some elements in the
 * DOM are transformed dynamically after this element is created, it will
 * give incorrect results, so it's best to instatiate a CssTransformCalculator
 * right before you intend to use it.
 * @class CssTransformCalculator
 */
class CssTransformCalculator {
    /**
     * Create a new CssTransformCalculator instance. It will only pay attention
     * to transforms in the elements in the path between `baseAncestor`
     * and `el`. If `baseAncestor` is undefined, pay attention to all
     * ancestors of `el` up to the `<body>` element.
     * @param {HTMLElement} el - target element
     * @param {Object} options
     * @param {HTMLElement} [options.baseAncestor] - CssTransformCalculator,
     *  by default, will take into account all transforms between `el` and,
     *  traversing up the DOM tree, `baseAncestor`, including transforms on both
     *  `el` and `baseAncestor`. If not provided, calculator will include all
     *  ancestors all the way up to the root of the DOM tree.
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
     */
    constructor(el, options) {
        this._options = options;
        this._el = el;

        // If rotate(), skewX(), skewY(), or matrix() functions are used in
        // certain ways, it can cause some scale calculations to be inaccurate.
        // We use this flag to issue a warning when this condition exists.
        this._scaleWarning = false;
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
    getUntransformedBoundingClientRect() {
        const rect = this._el.getBoundingClientRect();
        const txfrm = this._compositeInverse;
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
      * Traverses the DOM up from `el` to `baseAncestor` (including both `el`
      * and `baseAncestor`) and creates an array of TransformMatrixes
      * currently applied to all elements in the path. If any "composite"
      * transforms are applied to an element in the path (i.e., a CSS transform
      * property has been applied that consists of multiple transform functions,
      * e.g. "transform: scale(2) rotate(45deg);" or a matrix() function that
      * cannot be interpreted as a simple transformation), these composite
      * transformations will be decomposed.
      * @readonly
      * @memberof CssTransformCalculator
      * @type {Array<TransformMatrix>}
      */
    get _transforms() {
        if (this.__transforms) { return this.__transforms; }
        this._scaleWarning = false;
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
            const matrix = TransformMatrix.fromElement(el);
            if (matrix.type === 'composite') {
                if (matrix.isSkewedOrRotated) {
                    this._scaleWarning = true;
                }
                const decomp = matrix.decompose();
                matrixes.push(...decomp);
            } else {
                matrixes.push(matrix);
            }

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
            console.warn('It may not be possible to correctly calculate the scale of this element without taking into account other CSS transforms that have been applied.');
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
        if (this.__compositeInverseScale) { return this.this.__compositeInverseScale; }
        this.__compositeInverseScale = this._compositeScale.inverse;
        return this.__compositeInverseScale;
    }
}

module.exports = CssTransformCalculator;
export default CssTransformCalculator;
