import type React from 'react';
import type {
  createElement,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import type { ModdingAPI } from '@/types/api';

export type GameReactBindings = {
  h: typeof createElement;
  Fragment: typeof React.Fragment;
  useStateHook: typeof useState;
  useEffectHook: typeof useEffect;
  useReducerHook: typeof useReducer;
  useMemoHook: typeof useMemo;
  useCallbackHook: typeof useCallback;
  useRefHook: typeof useRef;
};

export function getGameReact(api: ModdingAPI): GameReactBindings {
  const gameReact = api.utils.React;

  return {
    h: gameReact.createElement as typeof createElement,
    Fragment: gameReact.Fragment as typeof React.Fragment,
    useStateHook: gameReact.useState as typeof useState,
    useEffectHook: gameReact.useEffect as typeof useEffect,
    useReducerHook: gameReact.useReducer as typeof useReducer,
    useMemoHook: gameReact.useMemo as typeof useMemo,
    useCallbackHook: gameReact.useCallback as typeof useCallback,
    useRefHook: gameReact.useRef as typeof useRef,
  };
}
