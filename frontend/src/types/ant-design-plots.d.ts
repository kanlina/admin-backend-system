declare module '@ant-design/plots' {
  import { ComponentType } from 'react';

  export interface LineConfig {
    data: any[];
    xField: string;
    yField: string;
    seriesField?: string;
    smooth?: boolean;
    animation?: any;
    legend?: any;
    tooltip?: any;
    point?: any;
  }

  export const Line: ComponentType<LineConfig>;
}
