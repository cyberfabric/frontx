/**
 * MFE Module - MFE context and hooks for @hai3/react
 *
 * Provides React integration for MFE components.
 */

export { MfeContext, useMfeContext, type MfeContextValue } from './MfeContext';
export { MfeProvider, type MfeProviderProps } from './MfeProvider';
export {
  useMfeState,
  useMfeBridge,
  useSharedProperty,
  useHostAction,
  type UseMfeStateReturn,
} from './hooks';
