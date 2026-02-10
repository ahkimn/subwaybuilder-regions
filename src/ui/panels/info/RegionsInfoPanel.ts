import { REGIONS_INFO_PANEL_ID, REGIONS_INFO_PANEL_MOD_ID, REGIONS_INFO_PANEL_TITLE, INFO_PANEL_MIN_WIDTH } from "../../../core/constants";
import { RegionDataManager } from "../../../core/datasets/RegionDataManager";
import { RegionGameData, UIState } from "../../../core/types";
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
    sortDirection: 'desc'
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
    this.root.className =
      'pointer-events-auto backdrop-blur-sm border border-border/50 ' +
      'h-fit rounded-lg text-sm shadow-lg overflow-hidden ' +
      'bg-transparent w-full max-h-full flex flex-col';

    const { el: header, } = PanelHeader(REGIONS_INFO_PANEL_TITLE, onClose);
    this.root.appendChild(header);

    // Wrappers around main content
    const b1 = document.createElement('div');
    b1.className = 'max-h-full overflow-auto'
    this.root.appendChild(b1);

    const b2 = document.createElement('div');
    b2.className = `p-2 flex bg-primary-foreground/60 backdrop-blur-sm max-h-auto overflow-auto min-w-${INFO_PANEL_MIN_WIDTH} justify-center`;
    b1.appendChild(b2);


    const b3 = document.createElement('div');
    b3.className = `flex flex-col gap-2 w-full min-w-${INFO_PANEL_MIN_WIDTH} h-full`;
    b2.appendChild(b3);

    this.mainSelectRow = new SelectRow(
      `${this.rootId}-main-select`,
      [
        {
          label: 'Summary',
          onSelect: () => { this.setView('statistics'); },
          iconSVG: createIconElement(FileChartColumnIcon, { size: 24 })
        },
        {
          label: 'Commuters',
          onSelect: () => { this.setView('commuters'); },
          iconSVG: createIconElement(TramFrontIcon, { size: 24 })
        }
      ]
    );
    b3.appendChild(this.mainSelectRow.element);

    this.contentPanel = document.createElement('div');
    this.contentPanel.className = 'flex flex-col gap-2';
    b3.appendChild(this.contentPanel);
  }

  private setView(view: RegionsInfoPanelView) {
    if (this.activeView === view) return;

    this.activeView = view;
    this.render(true);
  }

  private async render(forceRefresh: boolean = false) {
    const token = ++this.renderToken

    if (this.activeView === 'commuters' && forceRefresh) {
      await this.regionDataManager.ensureExistsData(this.uiState, 'commuter', { forceBuild: true });
    } else if (this.activeView === 'statistics' && forceRefresh) {
      // Do not force rebuild infra data since it is more computationally expensive and will not change without user input
      this.regionDataManager.ensureExistsData(this.uiState, 'infra', { forceBuild: false })
        .then(() => {
          if (token !== this.renderToken) return; // Abort if a newer render has been initialized
          console.log('[RegionsInfoPanel] Statistics view data refresh complete.');
          // Let computation continue async and attempt to rerender once the data is ready
          if (this.activeView === 'statistics') {
            requestAnimationFrame(() => this.render());
          }
        })
    }

    if (token !== this.renderToken) {
      console.warn(`Aborting render due to newer render token. Current: ${this.renderToken}. Required: ${token}`);
      return;
    }
    this.gameData = this.regionDataManager.getGameData(this.uiState);

    if (!this.gameData) {
      console.warn("[Regions] No game data set for info panel rendering");
      return;
    }

    let viewNode: HTMLElement;

    this.contentPanel.replaceChildren();
    switch (this.activeView) {
      case 'statistics':
        viewNode = renderStatisticsView(this.gameData!);
        break;
      case 'commuters':
        viewNode =
          renderCommutersView(this.gameData!, this.commutersViewState, direction => {
            if (this.commutersViewState.direction === direction) return;
            this.commutersViewState.direction = direction;
            requestAnimationFrame(() => this.render());
          })
        break;
    }

    this.contentPanel.replaceChildren(viewNode);
  }

  public tryRender(forceRefresh: boolean = false) {
    if (this.uiState.isActive) {
      this.render(forceRefresh);
    }
  }

  get element(): HTMLElement {
    return this.root;
  }
}
