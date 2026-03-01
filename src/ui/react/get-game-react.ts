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
import type {
  InputFieldProperties,
  LabelProperties,
  SwitchProperties,
} from '@/ui/panels/types';

type GameUiComponentBindings = {
  Input: React.ComponentType<InputFieldProperties>;
  Switch: React.ComponentType<SwitchProperties>;
  Label: React.ComponentType<LabelProperties>;
};

export type GameReactBindings = {
  h: typeof createElement;
  Fragment: typeof React.Fragment;
  useStateHook: typeof useState;
  useEffectHook: typeof useEffect;
  useReducerHook: typeof useReducer;
  useMemoHook: typeof useMemo;
  useCallbackHook: typeof useCallback;
  useRefHook: typeof useRef;
  components: GameUiComponentBindings;
};

export function getGameReact(api: ModdingAPI): GameReactBindings {
  const gameReact = api.utils.React;
  const gameComponents = api.utils.components;

  return {
    h: gameReact.createElement as typeof createElement,
    Fragment: gameReact.Fragment as typeof React.Fragment,
    useStateHook: gameReact.useState as typeof useState,
    useEffectHook: gameReact.useEffect as typeof useEffect,
    useReducerHook: gameReact.useReducer as typeof useReducer,
    useMemoHook: gameReact.useMemo as typeof useMemo,
    useCallbackHook: gameReact.useCallback as typeof useCallback,
    useRefHook: gameReact.useRef as typeof useRef,
    components: {
      Input: gameComponents.Input as React.ComponentType<InputFieldProperties>,
      Switch: gameComponents.Switch as React.ComponentType<SwitchProperties>,
      Label: gameComponents.Label as React.ComponentType<LabelProperties>,
    },
  };
}
