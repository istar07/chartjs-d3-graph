import { Chart, merge, patchControllerConfig, registerController, requestAnimFrame } from '../chart';
import { GraphController } from './graph';
import { hierarchy, cluster, tree } from 'd3-hierarchy';

export class DendogramController extends GraphController {
  updateEdgeElement(line, index, properties, mode) {
    properties._orientation = this._config.tree.orientation;
    super.updateEdgeElement(line, index, properties, mode);
  }

  updateElement(point, index, properties, mode) {
    properties.angle = this.getParsed(index).angle;
    super.updateElement(point, index, properties, mode);
  }

  resyncLayout() {
    const meta = this._cachedMeta;

    meta.root = hierarchy(this.getTreeRoot(), (d) => this.getTreeChildren(d))
      .count()
      .sort((a, b) => b.height - a.height || b.data.index - a.data.index);

    this.doLayout(meta.root);

    super.resyncLayout();
  }

  reLayout(newOptions) {
    if (newOptions) {
      Object.assign(this._config.tree, newOptions);
      const ds = this.getDataset();
      if (ds.tree) {
        Object.assign(ds.tree, newOptions);
      } else {
        ds.tree = newOptions;
      }
    }
    this.doLayout(this._cachedMeta.root);
  }

  doLayout(root) {
    const options = this._config.tree;

    const layout = options.mode === 'tree' ? tree() : cluster();

    if (options.orientation === 'radial') {
      layout.size([Math.PI * 2, 1]);
    } else {
      layout.size([2, 2]);
    }

    const orientation = {
      horizontal: (d) => {
        d.data.x = d.y - 1;
        d.data.y = -d.x + 1;
      },
      vertical: (d) => {
        d.data.x = d.x - 1;
        d.data.y = -d.y + 1;
      },
      radial: (d) => {
        d.data.x = Math.cos(d.x) * d.y;
        d.data.y = Math.sin(d.x) * d.y;
        d.data.angle = d.y === 0 ? Number.NaN : d.x;
      },
    };

    layout(root).each(orientation[options.orientation] || orientation.horizontal);

    requestAnimFrame(() => this.chart.update());
  }
}

DendogramController.id = 'dendogram';
DendogramController.register = () => {
  GraphController.register();
  DendogramController.defaults = merge({}, [
    GraphController.defaults,
    {
      datasets: {
        tree: {
          mode: 'dendogram', // dendogram, tree
          orientation: 'horizontal', // vertical, horizontal, radial
        },
        animations: {
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
  return registerController(DendogramController);
};

export class DendogramChart extends Chart {
  constructor(item, config) {
    super(item, patchControllerConfig(config, DendogramController));
  }
}
DendogramChart.id = DendogramController.id;

export class TreeController extends DendogramController {}

TreeController.id = 'tree';
TreeController.register = () => {
  DendogramController.register();
  TreeController.defaults = merge({}, [
    DendogramController.defaults,
    {
      datasets: {
        tree: {
          mode: 'tree',
        },
      },
    },
  ]);
  return registerController(TreeController);
};

export class TreeChart extends Chart {
  constructor(item, config) {
    super(item, patchControllerConfig(config, TreeController));
  }
}
TreeChart.id = TreeController.id;
