import { Chart, ChartItem, IChartConfiguration, IChartDataset, LinearScale, Point, UpdateMode } from 'chart.js';
import { merge } from '../../chartjs-helpers/core';
import { GraphController, IGraphChartControllerDatasetOptions, IGraphDataPoint, IGraphEdgeDataPoint } from './graph';
import { hierarchy, cluster, tree, HierarchyNode } from 'd3-hierarchy';
import patchController from './patchController';
import { EdgeLine } from '../elements';

export interface ITreeOptions {
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

export class DendogramController extends GraphController {
  declare _config: { tree: ITreeOptions };

  updateEdgeElement(line: EdgeLine, index: number, properties: any, mode: UpdateMode) {
    properties._orientation = this._config.tree.orientation;
    super.updateEdgeElement(line, index, properties, mode);
  }

  updateElement(point: Point, index: number, properties: any, mode: UpdateMode) {
    if (index != null) {
      properties.angle = this.getParsed(index).angle;
    }
    super.updateElement(point, index, properties, mode);
  }

  resyncLayout() {
    const meta = this._cachedMeta as any;

    meta.root = hierarchy(this.getTreeRoot(), (d) => this.getTreeChildren(d))
      .count()
      .sort((a, b) => b.height - a.height || b.data.index - a.data.index);

    this.doLayout(meta.root);

    super.resyncLayout();
  }

  reLayout(newOptions: Partial<ITreeOptions> = {}) {
    if (newOptions) {
      Object.assign(this._config.tree, newOptions);
      const ds = this.getDataset() as any;
      if (ds.tree) {
        Object.assign(ds.tree, newOptions);
      } else {
        ds.tree = newOptions;
      }
    }
    this.doLayout((this._cachedMeta as any).root);
  }

  doLayout(root: HierarchyNode<{ x: number; y: number; angle?: number }>) {
    const options = this._config.tree;

    const layout = options.mode === 'tree' ? tree() : cluster();

    if (options.orientation === 'radial') {
      layout.size([Math.PI * 2, 1]);
    } else {
      layout.size([2, 2]);
    }

    const orientation = {
      horizontal: (d: { x: number; y: number; data: { x: number; y: number } }) => {
        d.data.x = d.y - 1;
        d.data.y = -d.x + 1;
      },
      vertical: (d: { x: number; y: number; data: { x: number; y: number } }) => {
        d.data.x = d.x - 1;
        d.data.y = -d.y + 1;
      },
      radial: (d: { x: number; y: number; data: { x: number; y: number; angle?: number } }) => {
        d.data.x = Math.cos(d.x) * d.y;
        d.data.y = Math.sin(d.x) * d.y;
        d.data.angle = d.y === 0 ? Number.NaN : d.x;
      },
    };

    layout(root).each((orientation[options.orientation] || orientation.horizontal) as any);

    requestAnimationFrame(() => this.chart.update());
  }

  static readonly id: string = 'dendogram';
  static readonly defaults: any = /*#__PURE__*/ merge({}, [
    GraphController.defaults,
    {
      datasets: {
        tree: {
          mode: 'dendogram', // dendogram, tree
          orientation: 'horizontal', // vertical, horizontal, radial
        },
        animation: {
          numbers: {
            type: 'number',
            properties: ['x', 'y', 'angle', 'radius', 'rotation', 'borderWidth'],
          },
        },
        tension: 0.4,
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

export interface IDendogramChartControllerDatasetOptions extends IGraphChartControllerDatasetOptions {
  tree: ITreeOptions;
}

export type IDendogramChartControllerDataset<T = IGraphDataPoint, E = IGraphEdgeDataPoint> = IChartDataset<
  T,
  IDendogramChartControllerDatasetOptions
> & {
  edges?: E[];
};

export type IDendogramChartControllerConfiguration<
  T = IGraphDataPoint,
  E = IGraphEdgeDataPoint,
  L = string
> = IChartConfiguration<'dendogram', T, L, IDendogramChartControllerDataset<T, E>>;

export class DendogramChart<T = IGraphDataPoint, E = IGraphEdgeDataPoint, L = string> extends Chart<
  T,
  L,
  IDendogramChartControllerConfiguration<T, E, L>
> {
  static readonly id = DendogramController.id;

  constructor(item: ChartItem, config: Omit<IDendogramChartControllerConfiguration<T, E, L>, 'type'>) {
    super(item, patchController('dendogram', config, DendogramController, [EdgeLine, Point], LinearScale));
  }
}

export class TreeController extends DendogramController {
  static readonly id = 'tree';
  static readonly defaults: any = /*#__PURE__*/ merge({}, [
    DendogramController.defaults,
    {
      datasets: {
        tree: {
          mode: 'tree',
        },
      },
    },
  ]);
}

export type ITreeChartControllerConfiguration<
  T = IGraphDataPoint,
  E = IGraphEdgeDataPoint,
  L = string
> = IChartConfiguration<'tree', T, L, IDendogramChartControllerDataset<T, E>>;

export class TreeChart<T = IGraphDataPoint, E = IGraphEdgeDataPoint, L = string> extends Chart<
  T,
  L,
  ITreeChartControllerConfiguration<T, E, L>
> {
  static readonly id = TreeController.id;

  constructor(item: ChartItem, config: Omit<ITreeChartControllerConfiguration<T, E, L>, 'type'>) {
    super(item, patchController('tree', config, TreeController, [EdgeLine, Point], LinearScale));
  }
}
