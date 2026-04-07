export type LayerToggleOptions = {
  id: string;
  label: string; // display name within panel
  isVisible: () => boolean;
  toggle: () => void;
};
