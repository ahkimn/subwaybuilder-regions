/**
 * Subway Builder API v1.0.0 (vendored local copy)
 */

import type { Map as MapLibreMap } from 'maplibre-gl';

// =============================================================================
// COORDINATE & GEOMETRY TYPES
// =============================================================================

export type Coordinate = [longitude: number, latitude: number];
export type BoundingBox = [
  minLon: number,
  minLat: number,
  maxLon: number,
  maxLat: number,
];

// =============================================================================
// CITY TYPES
// =============================================================================

export interface City {
  name: string;
  code: string;
  population?: number;
  country?: string;
  description?: string;
  initialViewState: {
    zoom: number;
    latitude: number;
    longitude: number;
    bearing: number;
  };
  minZoom?: number;
  mapImageUrl?: string;
}

export interface CityTab {
  id: string;
  label: string;
  emoji?: string;
  cityCodes: string[];
}

export interface CityDataFiles {
  buildingsIndex?: string;
  demandData?: string;
  roads?: string;
  runwaysTaxiways?: string;
  oceanDepthIndex?: string;
}

// =============================================================================
// TRAIN TYPES
// =============================================================================

export interface TrainTypeStats {
  maxAcceleration: number;
  maxDeceleration: number;
  maxSpeed: number;
  maxSpeedLocalStation: number;
  capacityPerCar: number;
  carLength: number;
  minCars: number;
  maxCars: number;
  carsPerCarSet: number;
  carCost: number;
  trainWidth: number;
  minStationLength: number;
  maxStationLength: number;
  baseTrackCost: number;
  baseStationCost: number;
  trainOperationalCostPerHour: number;
  carOperationalCostPerHour: number;
  scissorsCrossoverCost: number;
}

export type ElevationType =
  | 'DEEP_BORE'
  | 'STANDARD_TUNNEL'
  | 'CUT_AND_COVER'
  | 'AT_GRADE'
  | 'ELEVATED';

export interface TrainType {
  id: string;
  name: string;
  description: string;
  stats: TrainTypeStats;
  compatibleTrackTypes: string[];
  appearance: {
    color: string;
  };
  elevationMultipliers?: Partial<Record<ElevationType, number>>;
  allowAtGradeRoadCrossing?: boolean;
  canCrossRoads?: boolean;
}

// =============================================================================
// STATION TYPES (UNDOCUMENTED)
// =============================================================================

export interface StationType {
  id: string;
  name: string;
  description?: string;
  // Additional properties TBD from further reverse engineering
}

// =============================================================================
// STATION DATA STRUCTURES
// =============================================================================

export interface NearbyStation {
  stationId: string;
  walkingTime: number;
}

export type BuildType = 'constructed' | 'blueprint';

export interface Station {
  id: string;
  name: string;
  coords: Coordinate;
  stationGroup?: string;
  trackIds?: string[];
  trackGroupId?: string;
  buildType?: BuildType;
  stNodeIds?: string[];
  routeIds?: string[];
  nearbyStations?: NearbyStation[];
}

// =============================================================================
// TRACK DATA STRUCTURES
// =============================================================================

export type TrackType = 'station' | 'track' | 'scissors-crossover';
export type DisplayType = 'blueprint' | 'constructed';

export interface Track {
  id: string;
  coords?: Coordinate[];
  buildType?: BuildType;
  displayType?: DisplayType;
  type?: TrackType;
  reversable?: boolean;
  interactable?: boolean;
  length?: number;
  startElevation: number;
  endElevation: number;
  trackType?: string; // 'heavy-metro' | 'light-metro' | custom
  waterIntersectionPercentage?: number;
}

// =============================================================================
// TRAIN DATA STRUCTURES
// =============================================================================

export interface TrainMotion {
  speed: number;
  acceleration: number;
}

export interface TrackProgress {
  trackId: string;
  headProgress: number;
  tailProgress: number;
  triggeredSignalIds: string[];
}

export interface TrainWindow {
  tracks: TrackProgress[];
  headStComboProgress: number;
  tailStComboProgress: number;
  coords: Coordinate[];
  signalIds?: string[];
}

export interface CurrentStComboInfo {
  index: number;
  gapFromHeadToEndOfRoute: number;
  timeAtStop: number | null;
  timeAtStopEnd: number | null;
  endStNodeId: string;
}

export interface Train {
  id: string;
  routeId: string;
  length?: number;
  cars?: number;
  trainType?: string;
  currentStComboInfo?: CurrentStComboInfo;
  motion?: TrainMotion;
  windows?: {
    train: TrainWindow;
    warning: TrainWindow;
  };
}

// =============================================================================
// ROUTE DATA STRUCTURES
// =============================================================================

export interface StNode {
  id: string;
  center: Coordinate;
  trackIds: string[];
  buildType: BuildType;
}

export interface SignalReference {
  signalId: string;
  areaCovered: 'all' | string;
}

export interface PathSegment {
  trackId: string;
  reversed: boolean;
  length: number;
  signals: SignalReference[];
}

export interface StCombo {
  startStNodeId: string;
  endStNodeId: string;
  path: PathSegment[];
  distance: number;
}

export interface StComboTiming {
  stNodeId: string;
  stNodeIndex: number;
  arrivalTime: number;
  departureTime: number;
}

export interface TrainSchedule {
  highDemand: number;
  mediumDemand: number;
  lowDemand: number;
}

export type RouteShape = 'circle' | 'square' | 'diamond' | string;

export interface Route {
  id: string;
  name?: string;
  bullet?: string;
  color?: string;
  textColor?: string;
  shape?: RouteShape;
  carsPerTrain?: number;
  idealTrainCount?: number;
  trainType?: string;
  trainSchedule?: TrainSchedule;
  tempParentId?: string | null;
  stations?: Station[];
  stNodes?: StNode[];
  stCombos?: StCombo[];
  stComboTimings?: StComboTiming[];
}

// =============================================================================
// DEMAND & POPULATION TYPES
// =============================================================================

export interface DemandPoint {
  id: string;
  location: Coordinate;
  jobs: number;
  residents: number;
  popIds: string[];
  residentModeShare: ModeChoiceStats;
  workerModeShare: ModeChoiceStats;
}

export interface Pop {
  id: string;
  size: number;
  residenceId: string;
  jobId: string;
  drivingSeconds: number;
  drivingDistance: number;
  drivingPath?: Coordinate[];
  homeDepartureTime: number;
  workDepartureTime: number;
  lastCommute: CompletedPopCommute;
}

export interface DemandData {
  points: Map<string, DemandPoint>;
  popsMap: Map<string, Pop>;
}

// =============================================================================
// FINANCIAL TYPES
// =============================================================================

export interface BlueprintCost {
  totalCost: number;
  breakdown: {
    trackCost: number;
    stationCost: number;
    scissorsCrossoverCost: number;
    buildingDemolitionCost: number;
  };
}

export interface Bond {
  id?: string;
  principal: number;
  interestRate: number;
  remainingPrincipal?: number;
  startDay?: number;
}

export interface BondType {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  termDays?: number;
}

export interface BondResult {
  success: boolean;
  message?: string;
  bond?: Bond;
}

// =============================================================================
// METRICS & STATS TYPES
// =============================================================================

export interface RidershipStats {
  totalRidersPerHour: number;
  totalRiders: number;
  timeWindowHours?: number;
}

export interface LineMetric {
  routeId?: string;
  routeBullet?: string;
  routeColor?: string;
  name?: string;
  trainCount?: number;
  trainsPerHour?: number;
  ridersPerHour: number;
  revenuePerHour?: number;
}

export interface ModeChoiceStats {
  walking: number;
  driving: number;
  transit: number;
  unknown: number;
}

export interface CompletedCommute {
  popId: string;
  size: number;
  journeyEnd: number;
  journeyStart: number;
  origin: 'work' | 'home';
  stationRoutes: StationRoute[];
}

export interface CompletedPopCommute {
  modeChoice: ModeChoiceStats;
  transitPaths: unknown[];
  walking: WalkingCommute;
}

export interface WalkingCommute {
  time: number;
  distance: number;
}

export interface StationRoute {
  stationIds: string[];
  routeId: string;
}

export interface StationRidership {
  stationId: string;
  boardings: number;
  alightings: number;
}

export interface RouteRidership {
  routeId: string;
  totalRiders: number;
  ridersPerHour: number;
}

export interface StationRidershipRouteStats {
  routeId: string;
  popCount: number;
}

export interface StationRidershipDetails {
  stationId: string;
  total: number;
  transfers: number;
  byRoute: StationRidershipRouteStats[];
}

export interface StationRidershipSummary {
  total: number;
}

export interface RouteRidershipStationStats {
  stationId: string;
  popCount: number;
}

export interface RouteRidershipDetails {
  routeId: string;
  byStation: RouteRidershipStationStats[];
}

// =============================================================================
// TIME & SPEED TYPES
// =============================================================================

export interface CommuteTimeRange {
  start: number;
  end: number;
}

export type GameSpeed = 'slow' | 'normal' | 'fast' | 'ultrafast';

// =============================================================================
// CONTENT TEMPLATES
// =============================================================================

export interface NewspaperTemplate {
  headline: string;
  content: string;
  metadata: {
    category: string;
    tone: string;
    requiredGameState?: {
      minStations?: number;
      minPassengers?: number;
    };
    weight: number;
  };
}

export interface TweetTemplate {
  text: string;
  tone: string;
  requiredGameState?: {
    minPassengers?: number;
  };
}

// =============================================================================
// UI TYPES
// =============================================================================

export interface UIButtonOptions {
  id: string;
  label: string;
  icon?: string;
  onClick: () => void;
}

export interface UIToggleOptions {
  id: string;
  label: string;
  defaultValue?: boolean;
  onChange: (enabled: boolean) => void;
}

export interface UISliderOptions {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  onChange: (value: number) => void;
}

export interface UISelectOption {
  value: string;
  label: string;
}

export interface UISelectOptions {
  id: string;
  label: string;
  options: UISelectOption[];
  defaultValue: string;
  onChange: (value: string) => void;
}

export interface UITextOptions {
  id: string;
  text: string;
  className?: string;
}

export interface UISeparatorOptions {
  id: string;
}

export interface UIComponentOptions {
  id: string;
  component: () => unknown;
}

export interface UIToolbarButtonOptions {
  id: string;
  icon: string;
  tooltip?: string;
  render?: () => unknown;
  onClick?: () => void;
  isActive?: () => boolean;
}

export interface UIToolbarPanelOptions {
  id: string;
  icon: string;
  tooltip?: string;
  title?: string;
  width?: number;
  content?: () => unknown;
  render?: () => unknown;
}

export interface UIFloatingPanelOptions {
  id: string;
  title?: string;
  icon?: string;
  width?: number;
  height?: number;
  defaultWidth?: number;
  defaultHeight?: number;
  defaultPosition?: { x: number; y: number };
  render: () => unknown;
}

export interface UIMainMenuButtonOptions {
  id: string;
  text: string;
  onClick: () => void;
  description?: string;
  arrowBearing?: 0 | 45 | 90 | 135 | 180 | 225 | 270 | 315;
}

export type StyledButtonVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'ghost'
  | 'link';

export type StyledButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface UIStyledButtonOptions extends UIButtonOptions {
  variant?: StyledButtonVariant;
  size?: StyledButtonSize;
}

export interface UIStyledToggleOptions extends UIToggleOptions { }

export interface UIStyledSliderOptions extends UISliderOptions {
  showValue?: boolean;
  unit?: string;
}

export type UIPlacement =
  | 'settings-menu'
  | 'escape-menu'
  | 'bottom-bar'
  | 'top-bar'
  | 'debug-panel'
  | 'escape-menu-buttons'
  | 'main-menu';

export type NotificationType = 'success' | 'error' | 'info' | 'warning';
export type Theme = 'light' | 'dark' | 'system';

// =============================================================================
// MAP TYPES
// =============================================================================

export interface TileURLOverride {
  cityCode: string;
  tilesUrl: string;
  foundationTilesUrl?: string;
  maxZoom?: number;
}

export interface LayerOverride {
  layerId: string;
  sourceLayer?: string;
  filter?: unknown[];
  paint?: Record<string, unknown>;
}

export interface RoutingServiceOverride {
  cityCode: string;
  routingUrl: string;
  format: 'osrm' | 'valhalla' | 'graphhopper' | 'custom';
  customParser?: (response: unknown) => {
    drivingSeconds: number;
    drivingDistance: number;
    drivingPath?: Coordinate[];
  };
}

export interface RouteResult {
  drivingSeconds: number;
  drivingDistance: number;
  drivingPath?: Coordinate[];
}

export interface DefaultLayerVisibility {
  buildingFoundations?: boolean;
  oceanFoundations?: boolean;
  trackElevations?: boolean;
  trains?: boolean;
  stations?: boolean;
  routes?: boolean;
  arrows?: boolean;
  signals?: boolean;
}

export interface MapSource {
  type: 'raster' | 'vector' | 'geojson';
  tiles?: string[];
  tileSize?: number;
  url?: string;
  data?: unknown;
  attribution?: string;
}

export interface MapLayer {
  id: string;
  type: 'fill' | 'line' | 'symbol' | 'circle' | 'raster' | 'fill-extrusion';
  source: string;
  'source-layer'?: string;
  paint?: Record<string, unknown>;
  layout?: Record<string, unknown>;
  filter?: unknown[];
}

// =============================================================================
// GAME CONSTANTS
// =============================================================================

export interface HighSlopeSpeedMultiplier {
  minSlopePercentage: number;
  maxSlopePercentage: number;
  multiplier: number;
}

export interface ConstructionCosts {
  TUNNEL: {
    SINGLE_MULTIPLIER: number;
    QUAD_MULTIPLIER: number;
  };
  STATION: {
    SINGLE_MULTIPLIER: number;
    QUAD_MULTIPLIER: number;
  };
  ELEVATION_MULTIPLIERS: Record<ElevationType, number>;
  WATER_MULTIPLIERS: Record<ElevationType, number>;
  ELEVATION_THRESHOLDS: Record<ElevationType, number>;
}

export interface GameConstants {
  // Core financial
  STARTING_MONEY: number;
  DEFAULT_TICKET_COST: number;
  FARE_MULTIPLIER: number;
  OPERATIONAL_COST_CHARGE_INTERVAL: number;

  // Construction
  CONSTRUCTION_COSTS: ConstructionCosts;

  // Elevation
  MAX_ELEVATION: number;
  MIN_ELEVATION: number;

  // Track constraints
  MAX_SLOPE_PERCENTAGE: number;
  MIN_TURN_RADIUS: number;
  MIN_TRACK_LENGTH: number;
  MAX_TRACK_LENGTH: number;
  PARALLEL_TRACKS_SPACING: number;
  TRACK_WIDTH: number;
  TRACK_CLEARANCE: number;
  SCISSORS_CROSSOVER_LENGTH: number;

  // Station/Tunnel dimensions
  TUNNEL_HEIGHT: number;
  STATION_HEIGHT: number;
  BUILDING_FOUNDATION_GAP: number;

  // Operations
  STATION_STOP_TIME: number;
  TPH_LIMIT: number;
  STARTING_TRAIN_CARS: number;
  STUCK_TRAIN_TIMEOUT: number;
  TRAIN_SCHEDULE_TRANSITION_WINDOW: number;

  // Movement physics
  ACCEPTABLE_SPEED_MARGIN: number;
  MAX_JERK: number;
  MAX_LATERAL_ACCELERATION: number;
  HIGH_SLOPE_SPEED_MULTIPLIER: HighSlopeSpeedMultiplier[];

  // Walking
  WALKING_SPEED: number;
  WALKING_SPEED_ACCURATE_PATH: number;
  AIRPORT_WALKING_SPEED_MULTIPLIER: number;

  // Signals
  ADDITIONAL_WARNING_WINDOW_LENGTH: number;
  ADDITIONAL_EXTRA_WARNING_WINDOW_LENGTH: number;
  DIAMOND_SIGNAL_WINDOW_LENGTH: number;
  V_MERGE_SIGNAL_WINDOW_LENGTH: number;

  // Commute data
  COMMUTE_DATA_FILTER_INTERVAL: number;
  COMMUTE_INTERVAL_LENGTH: number;
  TIME_TO_KEEP_COMMUTE_DATA: number;

  // Additional constants (extensible)
  [key: string]: unknown;
}

// =============================================================================
// ELECTRON IPC TYPES
// =============================================================================

export interface ElectronAPI {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  quit(): void;
  reloadWindow(): void;
  setCurrentRoute(route: string): void;
  updateDiscordActivity(activity: unknown): void;
  saveGameToFile(data: unknown): Promise<boolean>;
  saveGameAuto(data: unknown): Promise<boolean>;
  loadGameFromFile(): Promise<unknown>;
  loadGameFromPath(path: string): Promise<unknown>;
  getSaveFilesFromDirectory(): Promise<unknown[]>;
  deleteSaveFile(filename: string): Promise<boolean>;
  importMetroFile(): Promise<unknown>;
  setLicenseKey(key: string): Promise<void>;
  getLicenseKey(): Promise<string | null>;
  removeLicenseKey(): Promise<void>;
  getVersion(): Promise<string>;
  getIsBeta(): Promise<boolean>;
  getModsFolder?: () => Promise<string>;
  getStorageItem?: (key: string) => Promise<unknown>;
  setStorageItem?: (key: string, value: unknown) => Promise<void>;
}

export interface ElectronAPIExtended {
  loadDataFile(path: string): Promise<unknown>;
  getDataServerPort(): Promise<number>;
  buildBlueprints(): Promise<void>;
  findRoutePathOrder(routeId: string): Promise<unknown>;
}

// =============================================================================
// I18N TYPES
// =============================================================================

export interface I18nAPI {
  translate(key: string, params?: Record<string, string | number>): string;
  getCurrentLanguage(): string;
  getSupportedLanguages(): string[];
  create(translations: Record<string, Record<string, string>>): I18nInstance;
}

export interface I18nInstance {
  translate(key: string, params?: Record<string, string | number>): string;
}

// =============================================================================
// RECHARTS TYPES (exposed via utils.charts)
// =============================================================================

export interface RechartsComponents {
  Area: React.ComponentType<unknown>;
  AreaChart: React.ComponentType<unknown>;
  Bar: React.ComponentType<unknown>;
  BarChart: React.ComponentType<unknown>;
  Brush: React.ComponentType<unknown>;
  CartesianAxis: React.ComponentType<unknown>;
  CartesianGrid: React.ComponentType<unknown>;
  Cell: React.ComponentType<unknown>;
  ComposedChart: React.ComponentType<unknown>;
  Cross: React.ComponentType<unknown>;
  Curve: React.ComponentType<unknown>;
  Customized: React.ComponentType<unknown>;
  DefaultLegendContent: React.ComponentType<unknown>;
  DefaultTooltipContent: React.ComponentType<unknown>;
  Dot: React.ComponentType<unknown>;
  ErrorBar: React.ComponentType<unknown>;
  Funnel: React.ComponentType<unknown>;
  FunnelChart: React.ComponentType<unknown>;
  Global: unknown;
  Label: React.ComponentType<unknown>;
  LabelList: React.ComponentType<unknown>;
  Layer: React.ComponentType<unknown>;
  Legend: React.ComponentType<unknown>;
  Line: React.ComponentType<unknown>;
  LineChart: React.ComponentType<unknown>;
  Pie: React.ComponentType<unknown>;
  PieChart: React.ComponentType<unknown>;
  PolarAngleAxis: React.ComponentType<unknown>;
  PolarGrid: React.ComponentType<unknown>;
  PolarRadiusAxis: React.ComponentType<unknown>;
  Polygon: React.ComponentType<unknown>;
  Radar: React.ComponentType<unknown>;
  RadarChart: React.ComponentType<unknown>;
  RadialBar: React.ComponentType<unknown>;
  RadialBarChart: React.ComponentType<unknown>;
  Rectangle: React.ComponentType<unknown>;
  ReferenceArea: React.ComponentType<unknown>;
  ReferenceDot: React.ComponentType<unknown>;
  ReferenceLine: React.ComponentType<unknown>;
  ResponsiveContainer: React.ComponentType<unknown>;
  Sankey: React.ComponentType<unknown>;
  Scatter: React.ComponentType<unknown>;
  ScatterChart: React.ComponentType<unknown>;
  Sector: React.ComponentType<unknown>;
  SunburstChart: React.ComponentType<unknown>;
  Surface: React.ComponentType<unknown>;
  Symbols: React.ComponentType<unknown>;
  Text: React.ComponentType<unknown>;
  Tooltip: React.ComponentType<unknown>;
  Trapezoid: React.ComponentType<unknown>;
  Treemap: React.ComponentType<unknown>;
  XAxis: React.ComponentType<unknown>;
  YAxis: React.ComponentType<unknown>;
  ZAxis: React.ComponentType<unknown>;
}

// =============================================================================
// MAIN MODDING API INTERFACE
// =============================================================================

export interface ModdingAPI {
  version: string;

  // City registration
  registerCity(city: City): void;
  cities: {
    registerTab(tab: CityTab): void;
    setCityDataFiles(cityCode: string, files: CityDataFiles): void;
    getCityDataFiles(cityCode: string): CityDataFiles | undefined;
    getTabs(): CityTab[];
  };

  // Map customization
  map: {
    registerSource(id: string, source: MapSource): void;
    registerLayer(layer: MapLayer): void;
    registerStyle(styleUrl: string): void;
    setTileURLOverride(override: TileURLOverride): void;
    setLayerOverride(override: LayerOverride): void;
    setRoutingServiceOverride(override: RoutingServiceOverride): void;
    getRoutingServiceOverride(
      cityCode: string,
    ): RoutingServiceOverride | undefined;
    queryRoute(
      cityCode: string,
      origin: Coordinate,
      destination: Coordinate,
    ): Promise<RouteResult | null>;
    setDefaultLayerVisibility(
      cityCode: string,
      visibility: DefaultLayerVisibility,
    ): void;
    getDefaultLayerVisibility(
      cityCode: string,
    ): DefaultLayerVisibility | undefined;
  };

  // Game constants
  modifyConstants(constants: Partial<GameConstants>): void;

  // Train types
  trains: {
    registerTrainType(trainType: TrainType): void;
    modifyTrainType(id: string, modifications: Partial<TrainType>): void;
    getTrainTypes(): Record<string, TrainType>;
    getTrainType(id: string): TrainType | undefined;
  };

  // Station types (UNDOCUMENTED)
  stations: {
    registerStationType(stationType: StationType): void;
    modifyStationType(id: string, modifications: Partial<StationType>): void;
    getStationTypes(): Record<string, StationType>;
    getStationType(id: string): StationType | undefined;
  };

  // Career / Mission system (UNDOCUMENTED)
  career: {
    registerMission(mission: Mission): boolean;
    unregisterMission(missionId: string): boolean;
    getMyMissions(): MissionInfo[];
    getAllMissions(): MissionInfo[];
    getMissionsForCity(cityCode: string): MissionInfo[];
    METRICS: CareerMetrics;
    OPERATORS: CareerOperators;
    REGIONS: CareerRegions;
  };

  // UI
  ui: {
    addButton(placement: UIPlacement, options: UIButtonOptions): void;
    addToggle(placement: UIPlacement, options: UIToggleOptions): void;
    addSlider(placement: UIPlacement, options: UISliderOptions): void;
    addSelect(placement: UIPlacement, options: UISelectOptions): void;
    addText(placement: UIPlacement, options: UITextOptions): void;
    addSeparator(placement: UIPlacement, options: UISeparatorOptions): void;
    showNotification(message: string, type?: NotificationType): void;
    setTheme(theme: Theme): void;
    getTheme(): Theme;
    getResolvedTheme(): 'light' | 'dark';
    setAccentColor(color: string): void;
    setPrimaryColor(color: string): void;
    setCSSVariable(name: string, value: string): void;
    resetColors(): void;
    registerComponent(
      placement: UIPlacement,
      options: UIComponentOptions,
    ): void;
    unregisterComponent(placement: UIPlacement, id: string): void;
    getComponents(placement: UIPlacement): UIComponentOptions[];
    // Toolbar/Panel methods (UNDOCUMENTED)
    addToolbarButton(poptions: UIToolbarButtonOptions): void;
    addToolbarPanel(options: UIToolbarPanelOptions): void;
    addFloatingPanel(options: UIFloatingPanelOptions): void;
    addMainMenuButton(options: UIMainMenuButtonOptions): void;
    addStyledButton(
      placement: UIPlacement,
      options: UIStyledButtonOptions,
    ): void;
    addStyledToggle(
      placement: UIPlacement,
      options: UIStyledToggleOptions,
    ): void;
    addStyledSlider(
      placement: UIPlacement,
      options: UIStyledSliderOptions,
    ): void;
    // Layer visibility methods (UNDOCUMENTED)
    getAvailableLayers(): string[];
    getLayerVisibility(layerId: string): boolean;
    setLayerVisibility(layerId: string, visible: boolean): void;
    getAllLayerVisibility(): Record<string, boolean>;
    setMultipleLayerVisibility(visibility: Record<string, boolean>): void;
    // Force UI update (UNDOCUMENTED)
    forceUpdate(): void;
  };

  // Content registration
  registerNewspaperTemplates(templates: NewspaperTemplate[]): void;
  registerTweetTemplates(templates: TweetTemplate[]): void;

  // Lifecycle hooks
  hooks: {
    onGameInit(callback: () => void): void;
    onDayChange(callback: (day: number) => void): void;
    onCityLoad(callback: (cityCode: string) => void): void;
    onMapReady(callback: (map: MapLibreMap) => void): void;
    onStationBuilt(callback: (station: Station) => void): void;
    onStationDeleted(callback: (stationId: string) => void): void;
    onRouteCreated(callback: (route: Route) => void): void;
    onRouteDeleted(
      callback: (routeId: string, routeBullet: string) => void,
    ): void;
    onTrackBuilt(callback: (tracks: Track[]) => void): void;
    onBlueprintPlaced(callback: (tracks: Track[]) => void): void;
    onDemandChange(callback: (popCount: number) => void): void;
    onTrackChange(
      callback: (changeType: 'add' | 'delete', count: number) => void,
    ): void;
    onTrainSpawned(callback: (train: Train) => void): void;
    onTrainDeleted(callback: (trainId: string, routeId: string) => void): void;
    onPauseChanged(callback: (isPaused: boolean) => void): void;
    onSpeedChanged(callback: (newSpeed: GameSpeed) => void): void;
    onMoneyChanged(
      callback: (
        newBalance: number,
        change: number,
        type: 'revenue' | 'expense',
        category?: string,
      ) => void,
    ): void;
    onGameSaved(callback: (saveName: string) => void): void;
    onGameLoaded(callback: (saveName: string) => void): void;
    // Hooks (UNDOCUMENTED)
    onWarning(callback: (warning: unknown) => void): void;
    onError(callback: (error: unknown) => void): void;
    onGameEnd(callback: (result: unknown) => void): void;
  };

  // Game actions
  actions: {
    addMoney(amount: number, category?: string): void;
    subtractMoney(amount: number, category?: string): void;
    setMoney(amount: number): void;
    setPause(paused: boolean): void;
    setSpeed(speed: GameSpeed): void;
    // Actions (UNDOCUMENTED)
    setTicketPrice(price: number): void;
    getTicketPrice(): number;
    issueBond(bondTypeId: string): BondResult;
    payBond(bondId: string, amount: number): BondResult;
    getBonds(): Bond[];
    setSpeedMultiplier(speed: GameSpeed, multiplier: number): void;
  };

  // Game state (read-only)
  gameState: {
    getStations(): Station[];
    getRoutes(): Route[];
    getTracks(): Track[];
    getTrains(): Train[];
    getDemandData(): DemandData | null;
    getCurrentDay(): number;
    getCurrentHour(): number;
    getBudget(): number;
    getElapsedSeconds(): number;
    calculateBlueprintCost(tracks: Track[]): BlueprintCost;
    getTicketPrice(): number;
    getGameSpeed(): GameSpeed;
    isPaused(): boolean;
    getBonds(): Bond[];
    getBondTypes(): Record<string, BondType>;
    getRidershipStats(): RidershipStats;
    getLineMetrics(): LineMetric[];
    // Methods (UNDOCUMENTED)
    getModeChoiceStats(): ModeChoiceStats;
    getCompletedCommutes(): CompletedCommute[];
    getStationRidership(
      stationId?: string | null,
    ): StationRidership[] | StationRidershipDetails | StationRidershipSummary;
    getRouteRidership(
      routeId?: string | null,
    ): RouteRidership[] | RouteRidershipDetails;
  };

  // Pop timing
  popTiming: {
    getCommuteTimeRanges(): CommuteTimeRange[];
    setCommuteTimeRanges(ranges: CommuteTimeRange[]): void;
    resetCommuteTimeRanges(): void;
  };

  // Storage (Electron only)
  storage: {
    set(key: string, value: unknown): Promise<void>;
    get<T>(key: string, defaultValue?: T): Promise<T>;
    delete(key: string): Promise<void>;
    keys(): Promise<string[]>;
  };

  // Utilities
  utils: {
    getCityCode(): string;
    getCities(): City[];
    getConstants(): GameConstants;
    getMap(): MapLibreMap | null;
    React: typeof import('react');
    icons: Record<string, React.ComponentType<{ className?: string }>>;
    components: {
      Badge: React.ComponentType<unknown>;
      Button: React.ComponentType<unknown>;
      Card: React.ComponentType<unknown>;
      CardContent: React.ComponentType<unknown>;
      CardDescription: React.ComponentType<unknown>;
      CardHeader: React.ComponentType<unknown>;
      CardTitle: React.ComponentType<unknown>;
      Input: React.ComponentType<unknown>;
      Label: React.ComponentType<unknown>;
      MainMenuButton: React.ComponentType<unknown>;
      Progress: React.ComponentType<unknown>;
      Slider: React.ComponentType<unknown>;
      SubwayButton: React.ComponentType<unknown>;
      Switch: React.ComponentType<unknown>;
      Tooltip: React.ComponentType<unknown>;
      TooltipContent: React.ComponentType<unknown>;
      TooltipProvider: React.ComponentType<unknown>;
      TooltipTrigger: React.ComponentType<unknown>;
    };
    // Recharts components (UNDOCUMENTED)
    charts: RechartsComponents;
    // i18n utilities (UNDOCUMENTED)
    i18n: I18nAPI;
  };

  // Schemas (Zod)
  schemas: {
    DemandDataSchema: unknown;
    DemandPointSchema: unknown;
    PopSchema: unknown;
    BuildingIndexSchema: unknown;
    BuildingBoundsSchema: unknown;
    BuildingDataSchema: unknown;
    OptimizedBuildingIndexSchema: unknown;
    OptimizedBuildingDataSchema: unknown;
    RoadsGeojsonSchema: unknown;
    RoadPropertiesSchema: unknown;
    RunwaysTaxiwaysGeojsonSchema: unknown;
  };

  // Hot reload
  reloadMods(): Promise<void>;
}

// =============================================================================
// THIRD-PARTY LIBRARY TYPES (exposed on window)
// =============================================================================

export interface DeckGLNamespace {
  VERSION: string;
  version: string;
  log: unknown;
  _registerLoggers: (loggers: unknown) => void;
}

export interface ChanceInstance {
  // Chance.js methods - see https://chancejs.com/
  bool(options?: { likelihood: number }): boolean;
  integer(options?: { min?: number; max?: number }): number;
  floating(options?: { min?: number; max?: number; fixed?: number }): number;
  string(options?: { length?: number; pool?: string }): string;
  name(options?: {
    middle?: boolean;
    middle_initial?: boolean;
    prefix?: boolean;
    suffix?: boolean;
  }): string;
  sentence(options?: { words?: number }): string;
  paragraph(options?: { sentences?: number }): string;
  pick<T>(arr: T[]): T;
  shuffle<T>(arr: T[]): T[];
  weighted<T>(arr: T[], weights: number[]): T;
  // ... many more methods available
  [key: string]: unknown;
}
