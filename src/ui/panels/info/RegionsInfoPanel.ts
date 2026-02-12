import { REGIONS_INFO_PANEL_ID, REGIONS_INFO_PANEL_MOD_ID, REGIONS_INFO_PANEL_TITLE, INFO_PANEL_MIN_WIDTH } from "../../../core/constants";
import { RegionDataManager } from "../../../core/datasets/RegionDataManager";
import { RegionGameData, RegionSelection, UIState } from "../../../core/types";
import { PanelHeader } from "../../elements/PanelHeader";
import { SelectRow } from "../../elements/SelectRow";
import { createIconElement, FileChartColumnIcon, TramFrontIcon } from "../../elements/utils/get-icon";
import { renderStatisticsView, renderCommutersView } from "./render";
import { CommutersViewState, RegionsInfoPanelView } from "./types";

export class RegionsInfoPanel {
  private rootId: string;
  private root: HTMLDivElement;

  private contentPanel: HTMLDivElement;
  private mainSelectRow: SelectRow;

  private gameData: RegionGameData | null = null;

  private renderToken: number = 0;
  private activeView: RegionsInfoPanelView = 'statistics';
  private commutersViewState: CommutersViewState = {
    direction: 'outbound',
    commuterCountDisplay: 'absolute',
    modeShareDisplay: 'absolute',
    modeShareLayout: 'transit',
    expanded: false,
    sortIndex: 1, // default to sorting by commuter count
    previousSortIndex: 0, // default tiebreaker to region name
    sortDirection: 'desc',
    previousSortDirection: 'asc'
  }

  constructor(
    private regionDataManager: RegionDataManager,
    private readonly uiState: Readonly<UIState>,
    onClose: () => void
  ) {

    this.rootId = REGIONS_INFO_PANEL_ID;

    this.root = document.createElement('div');
    this.root.id = this.rootId;
    this.root.dataset.modId = REGIONS_INFO_PANEL_MOD_ID;
    this.root.className = [
      'pointer-events-auto',
      'backdrop-blur-sm bg-transparent',
      'border border-border/50',
      'h-fit rounded-lg',
      'text-sm shadow-lg overflow-hidden',
      'w-full max-h-full flex flex-col min-h-0'
    ].join(' ');

    const { el: header, } = PanelHeader(REGIONS_INFO_PANEL_TITLE, onClose);
    this.root.appendChild(header);

    // Wrappers around main content
    const b1 = document.createElement('div');
    b1.className = 'flex-1 min-h-0 overflow-hidden';
    this.root.appendChild(b1);

    const b2 = document.createElement('div');
    b2.className = `p-2 flex flex-1 min-h-0 bg-primary-foreground/60 backdrop-blur-sm min-w-${INFO_PANEL_MIN_WIDTH} justify-center overflow-hidden`;
    b1.appendChild(b2);


    const b3 = document.createElement('div');
    b3.className = `flex flex-col gap-2 w-full min-w-${INFO_PANEL_MIN_WIDTH} min-h-0`;
    b2.appendChild(b3);

    this.mainSelectRow = new SelectRow(
      `${this.rootId}-main-select`,
      [
        {
          label: 'Summary',
          onSelect: () => { this.setView('statistics'); },
          icon: createIconElement(FileChartColumnIcon, { size: 24 })
        },
        {
          label: 'Commuters',
          onSelect: () => { this.setView('commuters'); },
          icon: createIconElement(TramFrontIcon, { size: 24 })
        }
      ]
    );
    b3.appendChild(this.mainSelectRow.element);

    this.contentPanel = document.createElement('div');
    this.contentPanel.className = 'flex flex-col gap-2 min-h-0';
    b3.appendChild(this.contentPanel);
  }

  private setView(view: RegionsInfoPanelView) {
    if (this.activeView === view) return;

    this.activeView = view;
    this.tryRender(true);
  }

  private async prepareDataForCurrentView(forceRefresh: boolean, token: number): Promise<void> {
    if (this.activeView === 'commuters' && forceRefresh) {
      await this.regionDataManager.ensureExistsData(this.uiState, 'commuter', { forceBuild: true });
      return;
    }

    if (this.activeView === 'statistics' && forceRefresh) {
      const selectionSnapshot = this.uiState.activeSelection;
      // Do not force rebuild infra data since it is more computationally expensive and will not change without user input
      void this.regionDataManager.ensureExistsData(this.uiState, 'infra', { forceBuild: false })
        .then(() => {
          // Let computation continue async and attempt to rerender once the data is ready and if the user has not changed selection / view
          if (
            token === this.renderToken
            && this.activeView === 'statistics'
            && RegionSelection.isEqual(selectionSnapshot, this.uiState.activeSelection)
          ) {
            requestAnimationFrame(() => this.tryRender());
          }
        });
    }
  }

  private renderView() {
    this.gameData = this.regionDataManager.getGameData(this.uiState);

    if (!this.gameData) {
      console.warn("[Regions] No game data set for info panel rendering");
      return;
    }

    let viewNode: HTMLElement;
    switch (this.activeView) {
      case 'statistics':
        viewNode = renderStatisticsView(this.gameData);
        break;
      case 'commuters':
        viewNode =
          renderCommutersView(this.gameData, this.commutersViewState, direction => {
            if (this.commutersViewState.direction === direction) return;
            this.commutersViewState.direction = direction;
            requestAnimationFrame(() => this.tryRender());
          })
        break;
    }

    this.contentPanel.replaceChildren(viewNode);
  }

  private async render(forceRefresh: boolean = false) {
    const token = ++this.renderToken
    await this.prepareDataForCurrentView(forceRefresh, token);

    if (token !== this.renderToken) {
      console.warn(`Aborting render due to newer render token. Current: ${this.renderToken}. Required: ${token}`);
      return;
    }
    this.renderView();
  }

  public tryRender(forceRefresh: boolean = false) {
    if (this.uiState.isActive) {
      void this.render(forceRefresh);
    }
  }

  get element(): HTMLElement {
    return this.root;
  }
}
