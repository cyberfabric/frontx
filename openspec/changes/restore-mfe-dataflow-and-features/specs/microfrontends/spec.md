## ADDED Requirements

### Requirement: Independent Data Fetching Principle Enforcement

MFE packages SHALL independently define and fetch all data they need via their own API service instances. MFEs SHALL NOT proxy data to the host or rely on host-fetched data. Each runtime is responsible for obtaining its own data.

#### Scenario: MFE fetches its own data independently

- **WHEN** an MFE needs user data (or any other data)
- **THEN** the MFE SHALL define its own API service class inside the MFE package
- **AND** the MFE SHALL register the service with its own isolated `apiRegistry` instance
- **AND** the MFE SHALL fetch data through the flux cycle (Action → Event → Effect → API → Store)
- **AND** the MFE SHALL NOT receive data from the host via bridge properties, actions chains, or any other mechanism

#### Scenario: MFE does not proxy data to host

- **WHEN** an MFE fetches data from an API
- **THEN** the MFE SHALL NOT emit events or call bridge methods to forward the fetched data to the host
- **AND** the MFE SHALL NOT call patterns like `notifyUserLoaded()` that push data across runtime boundaries
- **AND** the host SHALL fetch its own copy of the same data independently if it needs it

#### Scenario: Duplicate API services across runtimes are intentional

- **WHEN** both the host and an MFE need the same data (e.g., current user)
- **THEN** each runtime SHALL have its own API service class definition (intentional duplication)
- **AND** each runtime SHALL make its own API request independently
- **AND** duplicate network requests are an accepted cost mitigated by future `@hai3/api` cache sharing at the network level

#### Scenario: Only contract values cross runtime boundaries

- **WHEN** the host communicates with an MFE
- **THEN** only GTS-defined domain property values SHALL cross the boundary (e.g., theme ID string, language code string)
- **AND** only actions chain objects SHALL cross the boundary (via `bridge.executeActionsChain()`)
- **AND** no application data (user objects, API responses, store slices) SHALL cross the boundary
