import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME } from "@opentelemetry/semantic-conventions";
import { config } from "./config.js";

let sdk: NodeSDK | undefined;

export function startTelemetry(): void {
  if (!config.otelExporterOtlpEndpoint || sdk) {
    return;
  }

  sdk = new NodeSDK({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: config.otelServiceName
    }),
    traceExporter: new OTLPTraceExporter({
      url: config.otelExporterOtlpEndpoint
    })
  });

  sdk.start();
}
