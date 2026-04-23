declare module "react-simple-maps" {
  import * as React from "react";

  export interface ComposableMapProps extends React.SVGProps<SVGSVGElement> {
    projection?: string | ((...args: unknown[]) => unknown);
    projectionConfig?: {
      center?: [number, number];
      rotate?: [number, number, number];
      scale?: number;
      parallels?: [number, number];
    };
    width?: number;
    height?: number;
    children?: React.ReactNode;
  }
  export const ComposableMap: React.FC<ComposableMapProps>;

  export interface GeographiesProps {
    geography: string | object;
    children: (props: { geographies: Geo[] }) => React.ReactNode;
  }
  export const Geographies: React.FC<GeographiesProps>;

  export interface Geo {
    rsmKey: string;
    properties: Record<string, unknown> & { name?: string; nam_ja?: string };
  }

  export interface GeographyProps extends Omit<React.SVGProps<SVGPathElement>, "style"> {
    geography: Geo;
    style?: {
      default?: React.CSSProperties;
      hover?: React.CSSProperties;
      pressed?: React.CSSProperties;
    };
  }
  export const Geography: React.FC<GeographyProps>;

  export interface MarkerProps extends Omit<React.SVGProps<SVGGElement>, "onClick"> {
    coordinates: [number, number];
    onClick?: (e: React.MouseEvent<SVGGElement>) => void;
    children?: React.ReactNode;
  }
  export const Marker: React.FC<MarkerProps>;
}
