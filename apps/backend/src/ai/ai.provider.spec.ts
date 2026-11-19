import { LlmProviderError, OpenRouterClient } from './ai.provider';

describe('OpenRouterClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  function jsonResponse(status: number, body: unknown) {
    return {
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(body),
    };
  }

  it('sends the right request and parses content plus tool calls', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        model: 'qwen/qwen-2.5-72b-instruct',
        choices: [
          {
            message: {
              content: 'thinking',
              tool_calls: [
                {
                  id: 'call_1',
                  function: {
                    name: 'getBudgetStatus',
                    arguments: '{"month":"2026-11"}',
                  },
                },
              ],
            },
          },
        ],
      }),
    );
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    const result = await client.chat({
      model: 'qwen/qwen-2.5-72b-instruct',
      messages: [{ role: 'user', content: 'hello' }],
      timeoutMs: 5000,
      tools: [
        {
          type: 'function',
          function: {
            name: 'getBudgetStatus',
            description: 'budget',
            parameters: { type: 'object', properties: {} },
          },
        },
      ],
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.test/v1/chat/completions');
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer test-key');
    expect(headers['X-Title']).toBe('FinVerse AI');
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe('qwen/qwen-2.5-72b-instruct');
    expect(body.temperature).toBe(0.2);
    expect(body.tools).toHaveLength(1);
    expect(body.response_format).toBeUndefined();
    expect(result).toEqual({
      content: 'thinking',
      toolCalls: [
        {
          id: 'call_1',
          name: 'getBudgetStatus',
          arguments: '{"month":"2026-11"}',
        },
      ],
      model: 'qwen/qwen-2.5-72b-instruct',
    });
  });

  it('sends tool_choice auto when tools are given, and a forced tool when asked', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '{}' } }] }),
    );
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    const tool = {
      type: 'function' as const,
      function: {
        name: 'applyScreenerFilters',
        description: 'filters',
        parameters: { type: 'object', properties: {} },
      },
    };
    await client.chat({
      model: 'm',
      messages: [],
      tools: [tool],
      timeoutMs: 5000,
    });
    const autoBody = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(autoBody.tool_choice).toBe('auto');
    await client.chat({
      model: 'm',
      messages: [],
      tools: [tool],
      toolChoice: {
        type: 'function',
        function: { name: 'applyScreenerFilters' },
      },
      timeoutMs: 5000,
    });
    const forcedBody = JSON.parse(
      (fetchMock.mock.calls[1] as [string, RequestInit])[1].body as string,
    );
    expect(forcedBody.tool_choice).toEqual({
      type: 'function',
      function: { name: 'applyScreenerFilters' },
    });
  });

  it('requests JSON object mode when asked', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { choices: [{ message: { content: '{}' } }] }),
    );
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    await client.chat({
      model: 'm',
      messages: [],
      responseFormatJson: true,
      timeoutMs: 5000,
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string,
    );
    expect(body.response_format).toEqual({ type: 'json_object' });
  });

  it('throws a provider error with the status on non-2xx, without the body', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(429, { error: { message: 'rate limited' } }),
    );
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    const error = await client
      .chat({ model: 'm', messages: [], timeoutMs: 5000 })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(LlmProviderError);
    expect((error as LlmProviderError).status).toBe(429);
    expect((error as LlmProviderError).timedOut).toBe(false);
    expect((error as LlmProviderError).message).not.toContain('rate limited');
  });

  it('reports timeouts distinctly', async () => {
    const timeoutError = new Error('timed out');
    timeoutError.name = 'TimeoutError';
    fetchMock.mockRejectedValue(timeoutError);
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    const error = await client
      .chat({ model: 'm', messages: [], timeoutMs: 5000 })
      .then(
        () => null,
        (caught: unknown) => caught,
      );
    expect(error).toBeInstanceOf(LlmProviderError);
    expect((error as LlmProviderError).timedOut).toBe(true);
  });

  it('rejects a missing API key without calling the network', async () => {
    const client = new OpenRouterClient(undefined, 'https://example.test/v1');
    await expect(
      client.chat({ model: 'm', messages: [], timeoutMs: 5000 }),
    ).rejects.toThrow(LlmProviderError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects malformed provider responses', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { choices: [] }));
    const client = new OpenRouterClient('test-key', 'https://example.test/v1');
    await expect(
      client.chat({ model: 'm', messages: [], timeoutMs: 5000 }),
    ).rejects.toThrow(LlmProviderError);
  });
});
