declare module "polygon-clipping" {
  export type Pair = [number, number];
  export type Ring = Pair[];
  export type Polygon = Ring[];
  export type MultiPolygon = Polygon[];
  export type Geom = Polygon | MultiPolygon;

  export function union(a: Geom, b: Geom): MultiPolygon;
  export function difference(a: Geom, b: Geom): MultiPolygon;
  export function intersection(a: Geom, ...rest: Geom[]): MultiPolygon;
  export function xor(a: Geom, b: Geom): MultiPolygon;
}
