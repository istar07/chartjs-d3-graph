# Chart.js Graphs
[![NPM Package][npm-image]][npm-url] [![Github Actions][github-actions-image]][github-actions-url]

Chart.js module for charting graphs. Adding new chart types: `graph`, `forceDirectedGraph`, `dendogram`, and `tree`.

**Works only with Chart.js >= 2.8.0**

![force directed](https://user-images.githubusercontent.com/4129778/65382536-c1dad680-dcd5-11e9-819e-854d654b15b3.png)

![dendogram](https://user-images.githubusercontent.com/4129778/65382537-c1dad680-dcd5-11e9-974b-b9ad673862e0.png)

![tree](https://user-images.githubusercontent.com/4129778/65382535-c1dad680-dcd5-11e9-9369-d62bfb6656a1.png)


## Install

```bash
npm install --save chart.js chartjs-chart-graph
```

## Usage
see [Samples](https://github.com/sgratzl/chartjs-chart-graph/tree/master/samples) on Github

and [CodePen]()


## Styling

The new chart types are based on the existing `line` controller. Tho, instead of showing a line per dataset it shows edges as lines. Therefore, the styling options for points and lines are the same. See also https://www.chartjs.org/docs/latest/charts/line.html

## Data Structure

```js
data: {
  labels: ['A', 'B', 'C'], // node labels
  datasets: [{
    data: [ // nodes as objects
      { x: 1, y: 2 }, // x, y will be set by the force directed graph and can be omitted
      { x: 3, y: 1 },
      { x: 5, y: 3 }
    ],
    edges: [ // edge list where source/target refers to the node index
      { source: 0, target: 1},
      { source: 0, target: 2}
    ]
  }]
},
```

## Force Directed Graph

chart type: `forceDirectedGraph`

Computes the x,y posiiton of nodes based on a force simulation. It is based on https://github.com/d3/d3-force/.

![force directed](https://user-images.githubusercontent.com/4129778/65382536-c1dad680-dcd5-11e9-819e-854d654b15b3.png)

### Options

```typescript
interface IForceDirectedOptions {
  simulation: {
    /**
     * auto restarts the simulation upon dataset change, one can manually restart by calling: `chart.restart()`
     *
     * @default true
     */
    autoRestart: boolean;

    forces: {
      /**
       * center force
       * https://github.com/d3/d3-force/#centering
       *
       * @default true
       */
      center: boolean | ICenterForce,

      /**
       * collision betweeen nodes
       * https://github.com/d3/d3-force/#collision
       *
       * @default false
       */
      collide: boolean | ICollideForce,

      /**
       * link force
       * https://github.com/d3/d3-force/#links
       *
       * @default true
       */
      link: boolean | ILinkForce,

      /**
       * link force
       * https://github.com/d3/d3-force/#many-body
       *
       * @default true
       */
      manyBody: boolean | IManyBodyForce,

      /**
       * x positioning force
       * https://github.com/d3/d3-force/#forceX
       *
       * @default false
       */
      x: boolean | IForceXForce,

      /**
       * y positioning force
       * https://github.com/d3/d3-force/#forceY
       *
       * @default false
       */
      y: boolean | IForceYForce,

      /**
       * radial positioning force
       * https://github.com/d3/d3-force/#forceRadial
       *
       * @default false
       */
      radial: boolean | IRadialForce,
    }
  }
}

declare ID3NodeCallback = (d: IDataNode, i: number) => number;
declare ID3EdgeCallback = (d: IDataEdge, i: number) => number;

interface ICenterForce {
  x?: number;
  y?: number;
}

interface ICollideForce {
  radius?: number | ID3NodeCallback;
  strength?: number | ID3NodeCallback;
}

interface ILinkForce {
  id?: (d: IDataEdge) => string | number;
  distance?: number | ID3EdgeCallback;
  strength?: number | ID3EdgeCallback;
}

interface IManyBodyForce {
  strength?: number | ID3NodeCallback;
  theta?: number;
  distanceMin?: number;
  distanceMax?: number;
}

interface IForceXForce {
  x?: number;
  strength?: number;
}

interface IForceYForce {
  y?: number;
  strength?: number;
}

interface IRadialForce {
  x?: number;
  y?: number;
  radius?: number;
  strength?: number;
}

```

## Dendogram, Tree

chart types: `dendogram`, `tree`

The tree and dendograms layouts are based on https://github.com/d3/d3-hierarchy.

**Dendogram**
![dendogram](https://user-images.githubusercontent.com/4129778/65382537-c1dad680-dcd5-11e9-974b-b9ad673862e0.png)

**Tidy Tree**
![tree](https://user-images.githubusercontent.com/4129778/65382535-c1dad680-dcd5-11e9-9369-d62bfb6656a1.png)


### Options

```typescript
interface ITreeOptions {
  tree: {
    /**
     * tree (cluster) or dendogram layout default depends on the chart type
     */
    mode: 'dendogram' | 'tree';
    /**
     * orientation of the tree layout
     * @default horizontal
     */
    orientation: 'horizontal' | 'vertical' | 'radial';
  }
}
```


## Building

```sh
npm install
npm run build
```

[npm-image]: https://badge.fury.io/js/chartjs-chart-graph.svg
[npm-url]: https://npmjs.org/package/chartjs-chart-graph
[github-actions-image]: https://github.com/sgratzl/chartjs-chart-graph/workflows/nodeci/badge.svg
[github-actions-url]: https://github.com/sgratzl/chartjs-chart-graph/actions
