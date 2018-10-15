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

## Installing

## API

### Creating an instance

```js
new CSSTransformCalculator(myElement, options)
```

or should this be CssTransformCalculator.fromElement(myElement, options)?

... to allow for CssTransformCalculator.fromCssFunction('scale(1.5, 3)')

#### Options

- baseAncestor
- includeHostFrames
- ignoreShadowDom

### Transforming coordinates

### Finding a ClientRect

### Scaling and unscaling coordinates

### Translating and untranslating coordinates

## Examples

## Contributing
