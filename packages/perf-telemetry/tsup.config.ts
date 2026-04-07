import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  external: [
    '@opentelemetry/api',
    '@opentelemetry/sdk-trace-web',
    '@opentelemetry/sdk-trace-base',
    '@opentelemetry/exporter-trace-otlp-http',
    '@opentelemetry/resources',
    '@opentelemetry/semantic-conventions',
    '@opentelemetry/context-zone',
    '@opentelemetry/instrumentation',
    '@opentelemetry/instrumentation-fetch',
    '@opentelemetry/instrumentation-document-load',
    '@opentelemetry/instrumentation-user-interaction',
    'react',
  ],
});
