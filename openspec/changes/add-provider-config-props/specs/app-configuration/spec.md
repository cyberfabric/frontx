## ADDED Requirements

### Requirement: Router Configuration Props

The system SHALL provide a `router` prop on HAI3Provider for configuring the router type.

#### Scenario: Configure hash router

- **GIVEN** an app using HAI3Provider
- **WHEN** the `router` prop is set to `{ type: 'hash' }`
- **THEN** the system SHALL use HashRouter instead of BrowserRouter

```tsx
<HAI3Provider router={{ type: 'hash' }}>
  <App />
</HAI3Provider>
```

#### Scenario: Configure memory router

- **GIVEN** an app requiring in-memory routing (testing, embedded)
- **WHEN** the `router` prop is set to `{ type: 'memory' }`
- **THEN** the system SHALL use MemoryRouter

```tsx
<HAI3Provider router={{ type: 'memory' }}>
  <App />
</HAI3Provider>
```

#### Scenario: Default router behavior

- **GIVEN** an app using HAI3Provider without router prop
- **WHEN** the application renders
- **THEN** the system SHALL use BrowserRouter as default

### Requirement: Layout Visibility Props

The system SHALL provide a `layout` prop on HAI3Provider for controlling visibility of layout parts.

#### Scenario: Hide header and footer

- **GIVEN** an app requiring minimal chrome
- **WHEN** the `layout` prop is set to `{ header: { visible: false }, footer: { visible: false } }`
- **THEN** the system SHALL hide Header and Footer components

```tsx
<HAI3Provider layout={{ header: { visible: false }, footer: { visible: false } }}>
  <App />
</HAI3Provider>
```

#### Scenario: Hide menu for embedded mode

- **GIVEN** an app embedded in another application
- **WHEN** the `layout` prop is set to `{ menu: { visible: false } }`
- **THEN** the system SHALL hide the Menu component

```tsx
<HAI3Provider layout={{ menu: { visible: false }, header: { visible: false }, footer: { visible: false } }}>
  <App />
</HAI3Provider>
```

#### Scenario: Default layout behavior

- **GIVEN** an app using HAI3Provider without layout prop
- **WHEN** the application renders
- **THEN** all layout parts (header, menu, footer, sidebar) SHALL be visible by default

#### Scenario: Partial layout configuration

- **GIVEN** an app specifying only some layout parts
- **WHEN** the `layout` prop is set to `{ footer: { visible: false } }`
- **THEN** unspecified parts SHALL retain their default visibility (true)

### Requirement: Header Domain Configuration

The system SHALL support configuration state for the Header component consistent with other layout domains (Menu, Footer, Sidebar).

#### Scenario: Header respects visible flag

- **GIVEN** header visibility is set to false in Redux state
- **WHEN** the Header component renders
- **THEN** the Header SHALL return null (not render)

#### Scenario: Header visibility via config action

- **GIVEN** an effect needs to hide the header programmatically
- **WHEN** `setHeaderConfig({ visible: false })` is dispatched
- **THEN** the header visibility state SHALL update to false

#### Scenario: Header config action

- **GIVEN** an effect needs to configure header
- **WHEN** `setHeaderConfig({ visible: false })` is dispatched
- **THEN** the header state SHALL merge with the provided config

```typescript
// Consistent with other domains
dispatch(setHeaderConfig({ visible: false }));
dispatch(setMenuConfig({ visible: false }));
dispatch(setFooterConfig({ visible: false }));
dispatch(setSidebarConfig({ visible: false }));
```
