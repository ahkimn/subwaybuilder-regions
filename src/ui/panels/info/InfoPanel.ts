import { RegionGameData } from "../../../core/datasets/types";
import { PanelHeader } from "../../elements/PanelHeader";
import { SelectRow } from "../../elements/SelectRow";
import { FileChartColumnIconHTML, TramFrontIconHTML } from "../../elements/utils/get-icon";
import { renderStatisticsView, renderCommutersView } from "./render";

export const INFO_PANEL_WIDTH = 80;

type InfoPanelView = 'statistics' | 'commuters';

export class InfoPanel {
  private rootId: string;
  private root: HTMLDivElement;

  private contentPanel: HTMLDivElement;
  private mainSelectRow: SelectRow;

  private featureData: RegionGameData | null = null;
  private datasetId: string | null = null;

  private activeView: InfoPanelView = 'statistics';

  constructor(
    title: string,
    id: string,
    modId: string,
    onClose: () => void
  ) {

    this.rootId = id;

    this.root = document.createElement('div');
    this.root.id = this.rootId;
    this.root.dataset.modId = modId;
    this.root.className =
      'pointer-events-auto backdrop-blur-sm border border-border/50 ' +
      'h-fit rounded-lg text-sm shadow-lg overflow-hidden ' +
      'bg-transparent w-full max-h-full flex flex-col';

    const { el: header, } = PanelHeader(title, onClose);
    this.root.appendChild(header);

    // Wrappers around main content
    const b1 = document.createElement('div');
    b1.className = 'max-h-full overflow-auto'
    this.root.appendChild(b1);

    const b2 = document.createElement('div');
    b2.className = `p-2 flex bg-primary-foreground/60 backdrop-blur-sm max-h-auto overflow-auto min-w-${INFO_PANEL_WIDTH} justify-center`;
    b1.appendChild(b2);


    const b3 = document.createElement('div');
    b3.className = `flex flex-col gap-2 w-full min-w-${INFO_PANEL_WIDTH} h-full`;
    b2.appendChild(b3);

    this.mainSelectRow = new SelectRow(
      `${id}-main-select`,
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

  private setView(view: InfoPanelView) {
    if (this.activeView === view) return;

    this.activeView = view;
    this.render();
  }

  private render() {
    this.contentPanel.replaceChildren();

    if (!this.featureData || !this.datasetId) {
      console.warn("[Regions] No feature data set for info panel rendering");
      return;
    }

    switch (this.activeView) {
      case 'statistics':
        this.contentPanel.appendChild(
          renderStatisticsView(this.datasetId, this.featureData!)
        )
        break;
      case 'commuters':
        this.contentPanel.appendChild(
          renderCommutersView(this.featureData!)
        )
        break;
    }
  }

  public setFeatureData(
    datasetId: string, featureData: RegionGameData) {
    this.datasetId = datasetId;
    this.featureData = featureData;
  }


  get element(): HTMLElement {
    return this.root;
  }
}