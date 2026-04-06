export type RouteBulletType = 'circle' | 'square' | 'triangle' | 'diamond';

export type RouteDisplayParams = {
  id: string; // route ID
  bullet: string; // Display name of the route's bullet icon, used for map display
  color: string; // Color to use for displaying the route on the map, in hex code
  textColor: string; // Color to use for text labels for the route, in hex code
  shape: RouteBulletType; // Shape to use for displaying the route on the map
};
