import { REGIONS_INFO_PANEL_ID, REGIONS_INFO_PANEL_MOD_ID, REGIONS_INFO_PANEL_TITLE, REGIONS_INFO_PANEL_WIDTH } from "../../../core/constants";
import { RegionDataManager } from "../../../core/datasets/RegionDataManager";
import { RegionGameData, UIState } from "../../../core/types";
import { PanelHeader } from "../../elements/PanelHeader";
import { SelectRow } from "../../elements/SelectRow";
import { FileChartColumnIconHTML, TramFrontIconHTML } from "../../elements/utils/get-icon";
import { renderStatisticsView, renderCommutersView } from "./render";
import { CommutersViewState, RegionsInfoPanelView } from "./types";

export class RegionsInfoPanel {
  private rootId: string;
  private root: HTMLDivElement;

  private contentPanel: HTMLDivElement;
  private mainSelectRow: SelectRow;

  private gameData: RegionGameData | null = null;

  private activeView: RegionsInfoPanelView = 'statistics';
  private commutersViewState: CommutersViewState = {
    direction: 'outbound',
    modeDisplay: 'percent',
    modeLayout: 'combined',
    expanded: false
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
    b2.className = `p-2 flex bg-primary-foreground/60 backdrop-blur-sm max-h-auto overflow-auto min-w-${REGIONS_INFO_PANEL_WIDTH} justify-center`;
    b1.appendChild(b2);


    const b3 = document.createElement('div');
    b3.className = `flex flex-col gap-2 w-full min-w-${REGIONS_INFO_PANEL_WIDTH} h-full`;
    b2.appendChild(b3);

    this.mainSelectRow = new SelectRow(
      `${this.rootId}-main-select`,
      [
        {
          label: 'Statistics',
          onSelect: () => { this.setView('statistics'); },
          iconHTML: FileChartColumnIconHTML
        },
        {
          label: 'Commuters',
          onSelect: () => { this.setView('commuters'); },
          iconHTML: TramFrontIconHTML
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

  private render(forceRefresh: boolean = false) {
    this.contentPanel.replaceChildren();

    if (this.activeView === 'commuters' && forceRefresh) {
      this.regionDataManager.ensureExistsCommuterData(this.uiState, { forceBuild: true });
    }

    this.gameData = this.regionDataManager.getGameData(this.uiState);

    if (!this.gameData) {
      console.warn("[Regions] No game data set for info panel rendering");
      return;
    }

    switch (this.activeView) {
      case 'statistics':
        this.contentPanel.appendChild(
          renderStatisticsView(this.gameData!)
        )
        break;
      case 'commuters':
        this.contentPanel.appendChild(
          renderCommutersView(this.gameData!.commuterData!, this.commutersViewState, direction => {
            console.log(`[RegionsInfoPanel] Commuters view direction changed to ${direction}`);
            if (this.commutersViewState.direction === direction) return;

            this.commutersViewState.direction = direction;
            requestAnimationFrame(() => this.render());
          })
        )
        break;
    }
  }

  public tryRender(forceRefresh: boolean = false) {
    if (this.uiState.isActive()) {
      this.render(forceRefresh);
    }
  }

  get element(): HTMLElement {
    return this.root;
  }
}