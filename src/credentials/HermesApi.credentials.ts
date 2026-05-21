import type { ICredentialType, INodeProperties } from 'n8n-workflow';

export class HermesApi implements ICredentialType {
  name = 'hermesApi';
  displayName = 'Hermes API';
  documentationUrl = 'https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server';

  properties: INodeProperties[] = [
    {
      displayName: 'API URL',
      name: 'apiUrl',
      type: 'string',
      default: 'http://127.0.0.1:8642',
      placeholder: 'http://127.0.0.1:8642',
      description:
        'Base URL of your Hermes API server. Default port 8642 (API_SERVER_PORT). For remote access, use the full URL including scheme.',
      required: true,
    },
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: { password: true },
      default: '',
      description:
        'Bearer token for the Hermes API server. Set as API_SERVER_KEY in your ~/.hermes/.env. Required for all endpoints when API server is enabled.',
      required: true,
    },
  ];
}
