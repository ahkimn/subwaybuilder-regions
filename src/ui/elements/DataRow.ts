export function DataRow(items: (string | number)[]) {
  const row = document.createElement('div');
  row.className = 'flex justify-between';

  row.innerHTML = ''
  items.forEach(item => {
    row.innerHTML += `<span class="font-medium">${item}</span>`;
  });
  return row;
}