
// const api = window.SubwayBuilderAPI;
// const { React } = api.utils;

// const {
//   Button,
//   Card,
//   CardHeader,
//   CardTitle,
//   CardDescription,
//   CardContent,
//   Badge,
//   Label,
//   Input,
//   Progress,
//   Switch,
//   Tooltip,
//   TooltipTrigger,
//   TooltipContent,
//   TooltipProvider,
// } = api.utils.components;

// export function RegionInfoTestPanel() {
//   return React.createElement(
//     'div',
//     { className: 'space-y-4 w-72' },

//     // Card example
//     React.createElement(
//       Card,
//       null,
//       React.createElement(
//         CardHeader,
//         null,
//         React.createElement(CardTitle, null, 'Test Region'),
//         React.createElement(
//           CardDescription,
//           null,
//           'Preview of API components'
//         )
//       ),
//       React.createElement(
//         CardContent,
//         { className: 'space-y-3' },

//         // Badge
//         React.createElement(
//           'div',
//           { className: 'flex gap-2 items-center' },
//           React.createElement(Badge, null, 'County'),
//           React.createElement(Badge, { variant: 'secondary' }, 'Static')
//         ),

//         // Label + Input
//         React.createElement(
//           'div',
//           { className: 'space-y-1' },
//           React.createElement(Label, null, 'Region Name'),
//           React.createElement(Input, {
//             value: 'Suffolk County',
//             readOnly: true,
//           })
//         ),

//         // Progress
//         React.createElement(Progress, { value: 63 }),

//         // Switch
//         React.createElement(
//           'div',
//           { className: 'flex items-center justify-between' },
//           React.createElement(Label, null, 'Visible'),
//           React.createElement(Switch, { checked: true })
//         ),

//         // Button row
//         React.createElement(
//           'div',
//           { className: 'flex gap-2 pt-2' },
//           React.createElement(Button, null, 'Zoom to'),
//           React.createElement(Button, { variant: 'secondary' }, 'Highlight')
//         )
//       )
//     )
//   );
// };


export function buildTestRegionPanel(data: {
  name: string;
  population?: number;
  area?: number;
}): HTMLElement {
  const card = document.createElement('div');
  card.className = 'rounded-md border p-3 space-y-2 text-sm';

  card.innerHTML = `
    <div class="font-medium">${data.name}</div>
    <div class="text-muted-foreground">
      Population: ${data.population ?? '—'}
    </div>
    <div class="text-muted-foreground">
      Area: ${data.area?.toFixed(1) ?? '—'} km²
    </div>
  `;

  return card;
}
