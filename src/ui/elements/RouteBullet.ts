import { RouteDisplayParams } from "../../core/types";

// Unused for now
export function RouteBullet(display: RouteDisplayParams) {
  const wrap = document.createElement('div');
  wrap.className = 'relative';
  wrap.style.height = '1rem';

  const inner = document.createElement('div');
  inner.className = [
    'flex items-center justify-center font-bold',
    'select-none overflow-hidden',
    'font-mta',
    'cursor-pointer hover:opacity-80'
  ].join(' ');

  inner.style.backgroundColor = display.color;
  inner.style.minWidth = '1rem';
  inner.style.height = '1rem';
  inner.style.fontSize = '0.6rem';
  inner.style.color = display.textColor;
  inner.style.padding = '0 0.25rem';

  if (display.shape === 'circle') {
    inner.classList.add('rounded-full');
  }

  if (display.shape === 'diamond') {
    inner.style.transform = 'rotate(45deg) scale(0.707107)';
  }

  if (display.shape === 'triangle') {
    inner.classList.add('[clip-path:polygon(50%_0%,0%_100%,100%_100%)]');
    inner.style.padding = '0';
  }

  const span = document.createElement('span');
  span.style.lineHeight = '0';
  span.textContent = display.bullet;

  if (display.shape === 'diamond') {
    span.style.transform = 'rotate(-45deg) translateY(0.02rem)';
  } else if (display.shape === 'triangle') {
    span.style.transform = 'translateY(0.1rem)';
  }

  inner.appendChild(span);
  wrap.appendChild(inner);
  return wrap;
}
