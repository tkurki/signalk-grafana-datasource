import { InlineField, InlineSwitch, Input, SecretInput } from "@grafana/ui";

import React, { PureComponent, ChangeEvent } from "react";
import { DataSourcePluginOptionsEditorProps } from "@grafana/data";
import {
  SecureSignalKDataSourceOptions,
  SignalKDataSourceOptions,
} from "./types";

interface Props
  extends DataSourcePluginOptionsEditorProps<
    SignalKDataSourceOptions,
    SecureSignalKDataSourceOptions
  > {}

interface State {}

export class ConfigEditor extends PureComponent<Props, State> {
  onHostnameChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      hostname: event.target.value,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onSSLChange = (event: any) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      ssl: !!event.target.checked,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onTokenChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonData: {
        token: event.target.value,
      },
    });
  };

  onUseAuthChange = (event: any) => {
    const { onOptionsChange, options } = this.props;
    const jsonData = {
      ...options.jsonData,
      useAuth: !!event.target.checked,
    };
    onOptionsChange({ ...options, jsonData });
  };

  onResetApiKey = () => {
    const { onOptionsChange, options } = this.props;
    onOptionsChange({
      ...options,
      secureJsonFields: {
        ...options.secureJsonFields,
        token: false,
      },
      secureJsonData: {
        ...options.secureJsonData,
        token: "",
      },
    });
  };

  render() {
    const { options } = this.props;
    const { jsonData, secureJsonData, secureJsonFields } = options;

    return (
      <>
        <InlineField label="Use SSL" labelWidth={26} interactive>
          <InlineSwitch
            width={26}
            value={jsonData.ssl}
            onChange={this.onSSLChange}
          />
        </InlineField>

        <InlineField label="Signal K Server" labelWidth={26} interactive>
          <Input
            id="config-editor-host-port "
            onChange={this.onHostnameChange}
            value={jsonData.hostname ?? ""}
            placeholder="localhost:3000"
            width={40}
          />
        </InlineField>

        <InlineField
          label="Use Authentication"
          labelWidth={26}
          interactive
          tooltip={
            "Authentication token if you have security enabled on your Signal K server"
          }
        >
          <InlineSwitch
            label="Use authentication"
            width={26}
            value={jsonData.useAuth}
            onChange={this.onUseAuthChange}
          />
        </InlineField>

        <InlineField
          label="Authentication Token"
          labelWidth={26}
          disabled={!jsonData.useAuth}
          interactive
          tooltip={
            <span>
              <a
                href="https://demo.signalk.io/documentation/setup/generating_tokens.html?highlight=token#generate-token"
                target="_blank"
                rel="noopener noreferrer"
              >
                CLICK HERE for more token instructions
              </a>
            </span>
          }
        >
          <SecretInput
            required={jsonData.useAuth}
            disabled={!jsonData.useAuth}
            id="config-editor-api-key"
            isConfigured={secureJsonFields?.token}
            value={secureJsonData?.token ?? ""}
            placeholder="Signal K Server API key"
            width={40}
            onReset={this.onResetApiKey}
            onChange={this.onTokenChange}
          />
        </InlineField>
      </>
    );
  }
}
