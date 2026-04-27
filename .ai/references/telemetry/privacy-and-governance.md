# Telemetry Privacy and Governance

## Default privacy model

- collect only technical observability metadata
- keep telemetry depersonalized by default
- separate observability identifiers from business identifiers
- prevent sensitive payload leakage at the collector boundary

## Allowed by default

- route identifiers
- action identifiers
- HTTP method and status
- environment and release identifiers
- service or component identifiers

## Restricted

- tenant or account identifiers only in approved pseudonymous forms
- support correlation identifiers only under controlled access

## Forbidden

- direct PII such as email, full name, or phone
- secrets, tokens, and passwords
- request or response bodies
- file paths
- user-provided free text

## Enforcement expectations

- remove forbidden attributes before export
- keep only allowlisted dimensions for metrics
- normalize or drop unbounded attributes
- review policy changes with application releases

## Access governance

- developers: technical dashboard and query access
- SRE or DevOps: backend operations and telemetry infrastructure
- support: restricted and audited correlation workflows only

## Compliance checkpoints

Before rollout or schema change:

1. validate the attribute allowlist
2. validate forbidden-attribute tests
3. confirm access and audit controls
4. confirm retention and deletion policy

## Support-identifiable mode

If support-identifiable mode exists, it must be:

- explicit
- time-bounded
- audited
- automatically reverted after the incident window
