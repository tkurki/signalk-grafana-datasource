import { DataQueryRequest, DataSourceInstanceSettings } from '@grafana/data';

import { DataSource } from './DataSource';
import { SignalKQuery, SignalKDataSourceOptions } from './types';
import ReconnectingWebsocket from './reconnecting-websocket';

// Capture the message handler assigned to the (single, shared) WebSocket so the
// test can simulate incoming Signal K deltas.
jest.mock('./reconnecting-websocket', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(function (this: any) {
      this.onmessage = null;
      this.close = jest.fn();
    }),
  };
});

// doQuery() calls getBackendSrv().fetch(); return an empty history response so it
// resolves harmlessly without touching the network.
jest.mock('@grafana/runtime', () => ({
  getBackendSrv: () => ({
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    fetch: () => require('rxjs').of({ data: null }),
  }),
}));

// Avoid pulling the React QueryEditor component (and @grafana/ui) into the unit test.
jest.mock('QueryEditor', () => ({}), { virtual: true });

const MockedWs = ReconnectingWebsocket as unknown as jest.Mock;

const makeDataSource = () => {
  const settings = {
    url: '/api/datasources/proxy/1',
    jsonData: { useAuth: false, ssl: false },
  } as unknown as DataSourceInstanceSettings<SignalKDataSourceOptions>;
  return new DataSource(settings);
};

const makeRequest = (refId: string, path: string, panelId?: number): DataQueryRequest<SignalKQuery> =>
  ({
    panelId,
    targets: [
      {
        refId,
        path,
        context: 'vessels.self',
        multiplier: 1,
        aggregate: 'average',
      } as SignalKQuery,
    ],
    range: {
      from: { toISOString: () => '2020-01-01T00:00:00.000Z' },
      to: { toISOString: () => '2020-01-01T01:00:00.000Z' },
    },
    rangeRaw: { from: 'now-1h', to: 'now' },
    intervalMs: 1000,
  } as unknown as DataQueryRequest<SignalKQuery>);

const streamMessage = (path: string, value: number) =>
  JSON.stringify({
    updates: [
      {
        source: { label: 'test' },
        values: [{ path, value }],
      },
    ],
  });

describe('DataSource streaming with multiple panels', () => {
  beforeEach(() => {
    MockedWs.mockClear();
  });

  it('registers handlers for all panels and delivers deltas to each frame', () => {
    const ds = makeDataSource();

    const panelA = ds.query(makeRequest('A', 'sensors.temperature'));
    const panelB = ds.query(makeRequest('B', 'sensors.humidity'));

    const framesA: any[] = [];
    const framesB: any[] = [];
    const subA = panelA.subscribe((r) => framesA.push(r));
    const subB = panelB.subscribe((r) => framesB.push(r));

    expect(ds.pathValueHandlers).toHaveLength(2);
    expect(MockedWs).toHaveBeenCalledTimes(1);
    const ws = MockedWs.mock.instances[0];

    // Simulate the shared socket receiving deltas for both panels' paths.
    ws.onmessage({ data: streamMessage('sensors.temperature', 21) });
    ws.onmessage({ data: streamMessage('sensors.humidity', 55) });

    const valuesOf = (frames: any[], field: string) => {
      const last = frames[frames.length - 1];
      const f = last.data[0].fields.find((x: any) => x.name === field);
      return f ? f.values.toArray?.() ?? f.values : [];
    };

    // Panel A received its temperature value.
    expect(valuesOf(framesA, 'sensors.temperature:average')).toContain(21);
    // Panel B (an earlier-created panel) still received its humidity value.
    expect(valuesOf(framesB, 'sensors.humidity:average')).toContain(55);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it('emits a distinct streaming key per panel even when refIds collide', () => {
    const ds = makeDataSource();

    // Two panels with the SAME refId 'A' (as Grafana defaults) but different panelIds.
    const panelA = ds.query(makeRequest('A', 'sensors.temperature', 1));
    const panelB = ds.query(makeRequest('A', 'sensors.humidity', 2));

    const framesA: any[] = [];
    const framesB: any[] = [];
    const subA = panelA.subscribe((r) => framesA.push(r));
    const subB = panelB.subscribe((r) => framesB.push(r));

    const ws = MockedWs.mock.instances[0];
    ws.onmessage({ data: streamMessage('sensors.temperature', 21) });
    ws.onmessage({ data: streamMessage('sensors.humidity', 55) });

    const streamingKey = (frames: any[]) =>
      frames.filter((f) => f.state === 'Streaming').map((f) => f.key)[0];

    const keyA = streamingKey(framesA);
    const keyB = streamingKey(framesB);
    expect(keyA).toBeTruthy();
    expect(keyB).toBeTruthy();
    // Streams must not collide, otherwise Grafana drops one panel's updates.
    expect(keyA).not.toEqual(keyB);

    subA.unsubscribe();
    subB.unsubscribe();
  });

  it('closes the shared WebSocket only after the last panel unsubscribes', () => {
    const ds = makeDataSource();

    const subA = ds.query(makeRequest('A', 'sensors.temperature')).subscribe();
    const subB = ds.query(makeRequest('B', 'sensors.humidity')).subscribe();

    const ws = MockedWs.mock.instances[0];

    subA.unsubscribe();
    // Still one panel active: socket must remain open.
    expect(ws.close).not.toHaveBeenCalled();
    expect(ds.pathValueHandlers).toHaveLength(1);

    subB.unsubscribe();
    // Last panel gone: socket closed and handlers cleared.
    expect(ws.close).toHaveBeenCalledTimes(1);
    expect(ds.pathValueHandlers).toHaveLength(0);
  });
});

