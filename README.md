# CSS Transform Calculator

If you're using CSS transforms in your project, you often run into situations
where you need to map coordinates from a "base" coordinate space (e.g., pixel
offsets relative to the viewport) to a transfomed coordinate space (e.g., pixel
offsets relative to some DOM element that has been moved around using CSS
transforms), or vice versa.

For example:

- You are tracking the position of the pointer using mouse/touch/pointer events,
  but you need to know where the cursor is relative to a transformed element.
- You have the position of an element within the viewport using
  `element.getBoundingClientRect()`, but you need to know where the element
  was before transformations were applied.
- You want to know where an element (or a point within the element) will be
  after a series of transformations are applied or after they are removed. This
  could be handy, for example, if you’re optimizing transition animations using
  the [FLIP technique](https://css-tricks.com/animating-layouts-with-the-flip-technique/)

Calculating the coordinates you need is usually pretty simple, but it can
quickly get out of hand when:

- Transforms have been applied to ancestors of the element you care about, or,
  worse, transforms have been applied to _multiple_ ancestors of that element.
- Transforms are applied dynamically, and you don't have a convenient way to
  know what they are.
- You're writing a reusable component and you don't know ahead of time what
  transforms may be applied when it is used in somebody else's project.
- A complex transformation has been been applied to an element—e.g.
  `transform: rotate(20deg) scale(1.2) translate(20px, 50px)`
- You’re not sure what to do with the matrix notation that’s returned from
  `window.getComputedStyle(element).transform` (for the transform above, you’d
  get `"matrix(1.12763, 0.410424, -0.410424, 1.12763, 2.03141, 64.59)"`)

The CSS Transform Calculator makes it easier to deal with this kind of situation
by analyzing the DOM structure and handling the math involved in applying
multiple 2D transforms.

## Important limitations

1. Currently, the CSS transform calculator only handles 2D transforms.
2. I’ve found it particularly useful to be able to treat scale transforms independently of other transformation functions. So the calculator includes methods to scale and unscale points. However, these methods may return inaccurate results when the element or any one of its ancestors has a `scale()` transform applied at the same time as a `rotate()`, `skewX()`, or `skewY()` transform.
3. If something in the DOM is transformed using a non-invertable transform, you'll get an error. In practice, this is probably not much of a limitation, as it (a) requires the seldom-used matrix() transform function, and (b) per the [spec](https://www.w3.org/TR/css-transforms-1/#transform-function-lists), the element won’t be displayed anyway.

## Installing

## API

### Static methods

#### CSSTransformCalculator.fromElement(myElement, options)

Create a CSSTransformCalculator instance from an HTMLElement attached to the DOM.

- **myElement** {HTMLElement}
- **options** {Object} with any of the following properties:
    - **baseAncestor** - CssTransformCalculator, by default, will take into account all transforms between `myElement` and, traversing up the DOM tree, `baseAncestor`, including transforms on both `myElement` and `baseAncestor`. If `baseAncestor` is not provided, calculator will include all ancestors all the way up to the root of the DOM tree.
    - **safe3D** {Boolean} - The calculator will return incorrect results if 3D transforms are in use on any element in the path between `options.baseAncestor` and `myElement`. By default, a warning will be emitted on the console when 3D transforms are detected. If you set the `safe3D` option to `true`, an error will be thrown instead.
    - **safeScale** {Boolean} - The CSS transform calculator cannot always return accurate results for the `scalePoint()` or `unscalePoint()` methods on an element when the `scale()` transform has been applied at the same time as the rotate(), skewX(), or skewY() transform on an element in the path between `options.baseAncestor` and `myElement`. By default, the calculator emits a console warning when the results of `scalePoint()` or `unscalePoint()` may be inaccurate. If you set the `safeScale` option to `true`, an error will be thrown instead.
    - **includeHostFrames** {Boolean} - Useful when the parent document of `myElement` is hosted inside an iframe. When this option is `true`, the calculator will attempt to include transforms applied to the hosting iframe and any of its ancestors up to the specified `baseAncestor`. If `baseAncestor` is not provided, the calculator will traverse the DOM tree all the way up to the topmost reachable `<body>` element.
    - **ignoreShadowDom** {Boolean} - By default, the calculator will attempt to account for how `myElement` may have been distributed into a Shadow DOM tree, i.e., take into account the structure of the flattened document tree _as rendered_, as opposed to how the DOM is actually structured. If you specifically want to ignore when `myElement` or its ancestors are distruted into any shadow DOM trees, set this option to `true`.
- **returns** {CssTransformCalculator}

##### Example

```js
const el = document.getElementById('my-element');
const baseAncestor = document.getElementById('some-ancestor-of-my-element');
const calc = CssTransformCalculator.from(el, { baseAncestor });

// note: if `baseAncestor` here is not actually an ancestor of `#my-element`,
// the calculator will look at all transforms from `#my-element` all the way up
// to the root `<body>` element.
```

#### CSSTransformCalculator.fromCss(transformString, options)

Create an instance of the CSS transform calculator from a string containing CSS
transformations. This is useful when you want to make calculations based on
complex transforms that aren't applied to any DOM elements.

This form works with any string you might supply as the value of a CSS transform
property, with a couple of limitations:

- **transformString** {String} - any string containing a valid value for a CSS transform property. This is subject to a couple of limitations:
    1. 3D transformation functions will be ignored (see 1options.safe3D`)
    2. Length units must be specified in px
- **options** {Object} with any of the following properties:
    - **safe3D** {Boolean} - The calculator will return incorrect results if 3D transforms are in use on any element in the path between `options.baseAncestor` and `myElement`. By default, a warning will be emitted on the console when 3D transforms are detected. If you set the `safe3D` option to `true`, an error will be thrown instead.
    - **safeScale** {Boolean} - The CSS transform calculator cannot always return accurate results for the `scalePoint()` or `unscalePoint()` methods on an element when the `scale()` transform has been applied at the same time as the rotate(), skewX(), or skewY() transform on an element in the path between `options.baseAncestor` and `myElement`. By default, the calculator emits a console warning when the results of `scalePoint()` or `unscalePoint()` may be inaccurate. If you set the `safeScale` option to `true`, an error will be thrown instead.
- **returns** {CssTransformCalculator}

##### Example

```js
const txfrm = 'scale(1.2) translate(10px 20px) rotate(45deg)';
const opts = {
    safe3D: true,
};
const calc = CssTransformCalculator.fromCss(txfrm, opts);
```

### Instance methods

#### transformPoint(x, y)

Map a point (x, y) from the base (untransformed) coordinate space to the
coordinate space represented by a CssTransformCalculator.

- **x** {Number}
- **y** {Number}
- **returns** {{ x: Number, y: Number }}

##### Example

```html
<!-- markup -->
<div id="container" style="position: relative">
    <div id="transformed" style="position: absolute; transform: rotate(23deg);">
        <div id="target" style="position: absolute; left: 20px; top: 10px;">
            <div>Some internal content</div>
        </div>
    </div>
</div>
```

```js
// Suppose you want to know where the upper left corner of #target is,
// relative to #container, once transforms have been applied.

const container = document.getElementById('container');
const transformed = document.getElementById('transformed');
const target = document.getElementById('target');

// (offsetX, offsetY) would be the correct answer if no transforms had
// been applied.
const offsetX = target.offsetLeft; // 20
const offsetY = target.offsetTop; // 10

// as it is, we'll use the calculator to figure out where that point is
// once the #transformed element has been rotated.
const calc = CssTransformCalculator.fromElement(target), {
    baseAncestor: container,
});
const point = calc.transformPoint(offsetX, offsetY);

// point.x == 14.50278115410201, point.y == 17.019675049666006
// this is the "offset" of the top left corner of #target, relative to
// #container, after the transform.
```

### untransformPoint(x, y)

Map a point(x, y) from the transformed coordinate space represented by
CssTransformCalculator back to the untransformed/base space.

- **x** {Number}
- **y** {Number}
- **returns** {{ x: Number, y: Number }}

```js
// continuing the example for `transformPoint`

const basePoint = calc.untransformPoint(point.x, point.y);

// basePoint.x == 20, basePoint.y == 9.999999999999996
// BasePoint y is not quite the expected 10 thanks to floating point errors.
// You may want to round the values you get back to whatever resolution makes
// sense.
```

### getTransformedBoundingClientRect(element)

### getUntransformedBoundingClientRect(element)

### scalePoint(x, y)

### unscalePoint(x, y)

## Contributing
