export function RouteBullet(opts: {
  label: string;
  color: string;
  shape: 'circle' | 'square';
}) {
  const wrap = document.createElement('div');
  wrap.className = 'relative';
  wrap.style.height = '1rem';

  const inner = document.createElement('div');
  inner.className =
    'flex items-center justify-center font-bold select-none overflow-hidden ' +
    'font-mta cursor-pointer hover:opacity-80';

  inner.style.backgroundColor = opts.color;
  inner.style.minWidth = '1rem';
  inner.style.height = '1rem';
  inner.style.fontSize = '0.6rem';
  inner.style.color = '#fff';
  inner.style.padding = '0 0.25rem';

  if (opts.shape === 'circle') {
    inner.classList.add('rounded-full');
  }

  const span = document.createElement('span');
  span.textContent = opts.label;

  inner.appendChild(span);
  wrap.appendChild(inner);
  return wrap;
}