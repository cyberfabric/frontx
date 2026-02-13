/**
 * MFE Type System - TypeScript Interface Definitions
 *
 * This module exports all TypeScript interfaces for the MFE type system.
 * These interfaces use simple `id: string` fields as identifiers.
 *
 * @packageDocumentation
 */

// Core MFE types
export type { MfeEntry } from './mfe-entry';
export type { MfeEntryMF } from './mfe-entry-mf';
export type { ExtensionDomain } from './extension-domain';
export type { Extension } from './extension';
export type { SharedProperty } from './shared-property';
export type { Action } from './action';
export type { ActionsChain } from './actions-chain';
export type { LifecycleStage, LifecycleHook } from './lifecycle';

// Action payloads
export type { LoadExtPayload, MountExtPayload, UnmountExtPayload } from './action-payloads';

// Module Federation types
export type { MfManifest, SharedDependencyConfig } from './mf-manifest';
