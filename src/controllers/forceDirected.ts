import { Chart, ChartItem, IChartConfiguration, IChartDataset, LinearScale, Point } from 'chart.js';
import { merge } from '../../chartjs-helpers/core';
import { GraphController, IGraphChartControllerDatasetOptions, IGraphDataPoint, IGraphEdgeDataPoint } from './graph';
import {
  forceSimulation,
  forceManyBody,
  forceLink,
  forceCenter,
  forceCollide,
  forceX,
  forceRadial,
  forceY,
  Simulation,
  SimulationNodeDatum,
  ForceLink,
  SimulationLinkDatum,
} from 'd3-force';
import patchController from './patchController';
import { EdgeLine } from '../elements';

export interface IForceDirectedControllerOptions {
  simulation: {
    /**
     * auto restarts the simulation upon dataset change, one can manually restart by calling: `chart.getDatasetMeta(0).controller.reLayout();`
     *
     * @default true
     */
    autoRestart: boolean;

    initialIterations: number;

    forces: {
      /**
       * center force
       * https://github.com/d3/d3-force/#centering
       *
       * @default true
       */
      center: boolean | ICenterForce;

      /**
       * collision between nodes
       * https://github.com/d3/d3-force/#collision
       *
       * @default false
       */
      collide: boolean | ICollideForce;

      /**
       * link force
       * https://github.com/d3/d3-force/#links
       *
       * @default true
       */
      link: boolean | ILinkForce;

      /**
       * link force
       * https://github.com/d3/d3-force/#many-body
       *
       * @default true
       */
      manyBody: boolean | IManyBodyForce;

      /**
       * x positioning force
       * https://github.com/d3/d3-force/#forceX
       *
       * @default false
       */
      x: boolean | IForceXForce;

      /**
       * y positioning force
       * https://github.com/d3/d3-force/#forceY
       *
       * @default false
       */
      y: boolean | IForceYForce;

      /**
       * radial positioning force
       * https://github.com/d3/d3-force/#forceRadial
       *
       * @default false
       */
      radial: boolean | IRadialForce;
    };
  };
}

declare type ID3NodeCallback = (d: any, i: number) => number;
declare type ID3EdgeCallback = (d: any, i: number) => number;

export interface ICenterForce {
  x?: number;
  y?: number;
}

export interface ICollideForce {
  radius?: number | ID3NodeCallback;
  strength?: number | ID3NodeCallback;
}

export interface ILinkForce {
  id?: (d: { source: any; target: any }) => string | number;
  distance?: number | ID3EdgeCallback;
  strength?: number | ID3EdgeCallback;
}

export interface IManyBodyForce {
  strength?: number | ID3NodeCallback;
  theta?: number;
  distanceMin?: number;
  distanceMax?: number;
}

export interface IForceXForce {
  x?: number;
  strength?: number;
}

export interface IForceYForce {
  y?: number;
  strength?: number;
}

export interface IRadialForce {
  x?: number;
  y?: number;
  radius?: number;
  strength?: number;
}

export class ForceDirectedGraphController extends GraphController {
  declare _config: IForceDirectedControllerOptions;
  private readonly _simulation: Simulation<SimulationNodeDatum, undefined>;

  constructor(chart: Chart, datasetIndex: number) {
    super(chart, datasetIndex);
    this._simulation = forceSimulation()
      .on('tick', () => {
        this._copyPosition();
        this.chart.render();
      })
      .on('end', () => {
        this._copyPosition();
        this.chart.render();
      });
    const sim = this._config.simulation;

    const fs = {
      center: forceCenter,
      collide: forceCollide,
      link: forceLink,
      manyBody: forceManyBody,
      x: forceX,
      y: forceY,
      radial: forceRadial,
    };

    (Object.keys(fs) as (keyof typeof fs)[]).forEach((key) => {
      const options = sim.forces[key] as any;
      if (!options) {
        return;
      }
      const f = (fs[key] as any)();
      if (typeof options !== 'boolean') {
        Object.keys(options).forEach((attr) => {
          f[attr](options[attr]);
        });
      }
      this._simulation.force(key, f);
    });
    this._simulation.stop();
  }

  _copyPosition() {
    const nodes = this._cachedMeta._parsed;

    const minmax = nodes.reduce(
      (acc, v) => {
        const s = v._sim;
        if (!s) {
          return acc;
        }
        if (s.x < acc.minX) {
          acc.minX = s.x;
        }
        if (s.x > acc.maxX) {
          acc.maxX = s.x;
        }
        if (s.y < acc.minY) {
          acc.minY = s.y;
        }
        if (s.y > acc.maxY) {
          acc.maxY = s.y;
        }
        return acc;
      },
      {
        minX: Number.POSITIVE_INFINITY,
        maxX: Number.NEGATIVE_INFINITY,
        minY: Number.POSITIVE_INFINITY,
        maxY: Number.NEGATIVE_INFINITY,
      }
    );

    const rescaleX = (v: number) => ((v - minmax.minX) / (minmax.maxX - minmax.minX)) * 2 - 1;
    const rescaleY = (v: number) => ((v - minmax.minY) / (minmax.maxY - minmax.minY)) * 2 - 1;

    nodes.forEach((node) => {
      if (node._sim) {
        node.x = rescaleX(node._sim.x);
        node.y = rescaleY(node._sim.y);
      }
    });

    const xScale = this._cachedMeta.xScale!;
    const yScale = this._cachedMeta.yScale!;
    const elems = this._cachedMeta.data;
    elems.forEach((elem, i) => {
      const parsed = nodes[i];
      Object.assign(elem, {
        x: xScale.getPixelForValue(parsed.x, i),
        y: yScale.getPixelForValue(parsed.y, i),
        skip: false,
      });
    });
  }

  resetLayout() {
    super.resetLayout();
    this._simulation.stop();

    const nodes = this._cachedMeta._parsed.map((node, i) => {
      const simNode = Object.assign({}, node);
      simNode.index = i;
      node._sim = simNode;
      if (!node.reset) {
        return simNode;
      }
      delete simNode.x;
      delete simNode.y;
      delete simNode.vx;
      delete simNode.vy;
      return simNode;
    });
    this._simulation.nodes(nodes);
    this._simulation.alpha(1).restart();
  }

  resyncLayout() {
    super.resyncLayout();
    this._simulation.stop();

    const meta = this._cachedMeta;

    const nodes = meta._parsed.map((node, i) => {
      const simNode = Object.assign({}, node);
      simNode.index = i;
      node._sim = simNode;
      if (simNode.x === null) {
        delete simNode.x;
      }
      if (simNode.y === null) {
        delete simNode.y;
      }
      if (simNode.x == null && simNode.y == null) {
        node.reset = true;
      }
      return simNode;
    });
    const link = this._simulation.force<ForceLink<SimulationNodeDatum, SimulationLinkDatum<SimulationNodeDatum>>>(
      'link'
    );
    if (link) {
      link.links([]);
    }
    this._simulation.nodes(nodes);
    if (link) {
      // console.assert(ds.edges.length === meta.edges.length);
      // work on copy to avoid change
      link.links((meta._parsedEdges || []).map((link) => Object.assign({}, link)));
    }

    if (this._config.simulation.initialIterations > 0) {
      this._simulation.alpha(1);
      this._simulation.tick(this._config.simulation.initialIterations);
      this._copyPosition();
      if (this._config.simulation.autoRestart) {
        this._simulation.restart();
      } else {
        requestAnimationFrame(() => this.chart.update());
      }
    } else if (this._config.simulation.autoRestart) {
      this._simulation.alpha(1).restart();
    }
  }

  reLayout() {
    this._simulation.alpha(1).restart();
  }

  stopLayout() {
    super.stopLayout();
    this._simulation.stop();
  }

  static readonly id = 'forceDirectedGraph';
  static readonly defaults: any = /*#__PURE__*/ merge({}, [
    GraphController.defaults,
    {
      animation: false,
      datasets: {
        simulation: {
          initialIterations: 0,
          autoRestart: true,
          forces: {
            center: true,
            collide: false,
            link: true,
            manyBody: true,
            x: false,
            y: false,
            radial: false,
          },
        },
      },
      scales: {
        x: {
          min: -1,
          max: 1,
        },
        y: {
          min: -1,
          max: 1,
        },
      },
    },
  ]);
}

export interface IForceDirectedGraphChartControllerDatasetOptions
  extends IGraphChartControllerDatasetOptions,
    IForceDirectedControllerOptions {}

export type IForceDirectedGraphChartControllerDataset<T = IGraphDataPoint, E = IGraphEdgeDataPoint> = IChartDataset<
  T,
  IForceDirectedGraphChartControllerDatasetOptions
> & {
  edges?: E[];
};

export type IForceDirectedGraphChartControllerConfiguration<
  T = IGraphDataPoint,
  E = IGraphEdgeDataPoint,
  L = string
> = IChartConfiguration<'forceDirectedGraph', T, L, IForceDirectedGraphChartControllerDataset<T, E>>;

export class ForceDirectedGraphChart<T = IGraphDataPoint, E = IGraphEdgeDataPoint, L = string> extends Chart<
  T,
  L,
  IForceDirectedGraphChartControllerConfiguration<T, E, L>
> {
  static readonly id = ForceDirectedGraphController.id;

  constructor(item: ChartItem, config: Omit<IForceDirectedGraphChartControllerConfiguration<T, E, L>, 'type'>) {
    super(
      item,
      patchController('forceDirectedGraph', config, ForceDirectedGraphController, [EdgeLine, Point], LinearScale)
    );
  }
}
