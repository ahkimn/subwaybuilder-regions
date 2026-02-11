import { DataRowOptions, SortState, TableOptions } from "./DataTable";

export type ReactDataTableCellValue = string | number | HTMLElement | unknown;

export type ReactDataTableRow = {
  rowValues: ReactDataTableCellValue[];
  options?: DataRowOptions;
};

type CreateElement = (...args: unknown[]) => unknown;

const TABLE_DENSITY_SETTINGS: Record<"compact" | "standard" | "relaxed", string> = {
  compact: "gap-y-0.5 text-xs leading-4",
  standard: "gap-y-1 text-[0.78rem] leading-4",
  relaxed: "gap-y-1.5 text-[0.8rem] leading-5",
};

export function ReactDataTable(
  h: CreateElement,
  tableOptions: TableOptions,
  tableValues: Array<ReactDataTableRow>,
): unknown {
  const cells: unknown[] = [];

  tableValues.forEach(({ rowValues, options }, rowIndex) => {
    const rowOptions = options ?? {};
    const isHeader = rowOptions.header ?? false;

    rowValues.forEach((value, colIndex) => {
      cells.push(
        buildReactCell(
          h,
          value,
          rowOptions,
          colIndex,
          isHeader,
          `${rowIndex}:${colIndex}`
        )
      );
    });
  });

  return h(
    "div",
    {
      className: `grid min-w-0 ${TABLE_DENSITY_SETTINGS[tableOptions.density]}`,
      style: { gridTemplateColumns: tableOptions.columnTemplate },
    },
    ...cells
  );
}

function buildReactCell(
  h: CreateElement,
  cellValue: ReactDataTableCellValue,
  rowOptions: DataRowOptions,
  index: number,
  isHeader: boolean,
  key: string
): unknown {
  const span = rowOptions.colSpan?.[index];
  const isSelectedSort = rowOptions.sortState?.index === index;
  const align = rowOptions.align?.[index] ?? "left";
  const onClick = rowOptions.onClick?.[index];

  const shouldTruncate =
    !isHeader ||
    typeof cellValue === "string" ||
    typeof cellValue === "number";

  const classNames = [
    getCellBaseClass(shouldTruncate, align),
    getCellTextClass(isHeader, !isHeader && index > 0),
  ];

  if (isSelectedSort && rowOptions.sortState?.sortSelectedClass) {
    classNames.push(rowOptions.sortState.sortSelectedClass);
  }

  if (rowOptions.borderBottom) {
    classNames.push("border-b border-border/30");
  }
  if (rowOptions.rowClassName) {
    classNames.push(rowOptions.rowClassName);
  }

  if (onClick) {
    classNames.push("cursor-pointer hover:text-foreground");
  }

  const children = buildCellChildren(h, cellValue, rowOptions.sortState, index);
  const style = span && span > 1 ? { gridColumn: `span ${span}` } : undefined;

  return h(
    "div",
    {
      key,
      className: classNames.join(" "),
      style,
      onClick,
    },
    ...children
  );
}

function buildCellChildren(
  h: CreateElement,
  value: ReactDataTableCellValue,
  sortState: SortState | undefined,
  index: number
): unknown[] {
  const indicator =
    sortState && sortState.index === index && sortState.directionLabel
      ? ` ${sortState.directionLabel}`
      : "";

  if (value instanceof HTMLElement) {
    return [
      h("span", {
        key: "host",
        ref: (node: HTMLElement | null) => {
          if (!node) return;
          if (node.firstChild === value) return;
          node.replaceChildren(value);
        },
      }),
      indicator ? h("span", { key: "sort-indicator" }, indicator) : null,
    ].filter(Boolean);
  }

  if (typeof value === "string" || typeof value === "number") {
    return [`${value}${indicator}`];
  }

  return indicator ? [value, h("span", { key: "sort-indicator" }, indicator)] : [value];
}

function getCellAlignmentClass(align: "left" | "right" | "center"): string {
  if (align === "right") return "text-right tabular-nums";
  if (align === "center") return "text-center";
  return "text-left";
}

function getCellBaseClass(
  shouldTruncate: boolean,
  align: "left" | "right" | "center"
): string {
  return [
    "min-w-0",
    shouldTruncate ? "truncate" : "overflow-visible",
    getCellAlignmentClass(align),
    "py-0.5",
  ].join(" ");
}

function getCellTextClass(
  isHeader: boolean,
  isDataCol: boolean
): string {
  if (isHeader) {
    return "text-[0.72rem] text-muted-foreground font-semibold pb-1.5 tracking-wide whitespace-nowrap";
  }
  if (isDataCol) {
    return "font-mono";
  }
  return "font-medium text-foreground/90";
}
