# Technical Design — HAI3 Dev Kit


<!-- toc -->

- [1. Architecture Overview](#1-architecture-overview)
  - [1.1 Architectural Vision](#11-architectural-vision)
  - [1.2 Architecture Drivers](#12-architecture-drivers)
    - [Functional Drivers](#functional-drivers)
    - [NFR Allocation](#nfr-allocation)
  - [1.3 Architecture Layers](#13-architecture-layers)
- [2. Principles & Constraints](#2-principles-constraints)
  - [2.1 Design Principles](#21-design-principles)
    - [Plugin-First Composition](#plugin-first-composition)
  - [2.2 Constraints](#22-constraints)
    - [No React Below L3](#no-react-below-l3)
- [3. Technical Architecture](#3-technical-architecture)
  - [3.1 Domain Model](#31-domain-model)
  - [3.2 Component Model](#32-component-model)
    - [SDK Packages (L1)](#sdk-packages-l1)
      - [Why this component exists](#why-this-component-exists)
      - [Responsibility scope](#responsibility-scope)
      - [Responsibility boundaries](#responsibility-boundaries)
      - [Related components (by ID)](#related-components-by-id)
  - [3.3 API Contracts](#33-api-contracts)
  - [3.4 Internal Dependencies](#34-internal-dependencies)
  - [3.5 External Dependencies](#35-external-dependencies)
    - [React Ecosystem](#react-ecosystem)
  - [3.6 Interactions & Sequences](#36-interactions-sequences)
    - [Screen-Set Data Flow](#screen-set-data-flow)
  - [3.7 Database schemas & tables](#37-database-schemas-tables)
- [4. Additional context](#4-additional-context)
- [5. Traceability](#5-traceability)

<!-- /toc -->

## 1. Architecture Overview

### 1.1 Architectural Vision

<!-- TODO: Describe the overall architectural approach -->

### 1.2 Architecture Drivers

#### Functional Drivers

<!-- TODO: Map requirements to design responses -->

#### NFR Allocation

<!-- TODO: Map NFRs to design responses -->

### 1.3 Architecture Layers

<!-- TODO: Define architecture layers -->

## 2. Principles & Constraints

### 2.1 Design Principles

#### Plugin-First Composition

- [ ] `p2` - **ID**: `cpt-hai3-principle-plugin-first-composition`

<!-- TODO: Define principle -->

### 2.2 Constraints

#### No React Below L3

- [ ] `p2` - **ID**: `cpt-hai3-constraint-no-react-below-l3`

<!-- TODO: Define constraint -->

## 3. Technical Architecture

### 3.1 Domain Model

**Core Entities**:

- Screen-set
- Screen
- Component
- Microfrontend
- State
- Event

**Key Layout Elements**:

- Menu
- Header
- Footer
- Screen
- Sidebars
- Popup window system
- Overlay

**Communication Contracts**: TODO

### 3.2 Component Model

#### SDK Packages (L1)

- [ ] `p2` - **ID**: `cpt-hai3-component-sdk-packages`

<!-- TODO: Complete component description -->

##### Why this component exists

<!-- TODO: Explain rationale for SDK packages layer -->

##### Responsibility scope

<!-- TODO: Define core responsibilities and invariants -->

##### Responsibility boundaries

<!-- TODO: Define explicit non-responsibilities and delegation boundaries -->

##### Related components (by ID)

<!-- TODO: Link to related components by cpt-hai3-* IDs -->

### 3.3 API Contracts

<!-- TODO: Define API contracts -->

### 3.4 Internal Dependencies

<!-- TODO: Define internal dependencies -->

### 3.5 External Dependencies

#### React Ecosystem

<!-- TODO: Define external dependencies -->

### 3.6 Interactions & Sequences

#### Screen-Set Data Flow

**ID**: `cpt-hai3-seq-screenset-data-flow`

<!-- TODO: Define interaction sequences -->

### 3.7 Database schemas & tables

Not applicable — HAI3 is a frontend framework with no server-side database.

## 4. Additional context

<!-- TODO: Add additional context -->

## 5. Traceability

- **PRD**: [PRD.md](./PRD.md)
- **ADRs**: [ADR/](./ADR/)
- **Features**: [features/](./features/)
