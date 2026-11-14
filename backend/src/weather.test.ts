import { afterEach, describe, expect, it, vi } from "vitest";
import { SingaporeWeatherClient } from "./weather.js";

const payload = {
  code: 0,
  data: {
    area_metadata: [
      {
        name: "Bishan",
        label_location: { latitude: 1.350772, longitude: 103.839 },
      },
      {
        name: "Jurong West",
        label_location: { latitude: 1.34039, longitude: 103.7 },
      },
    ],
    items: [
      {
        update_timestamp: "2026-11-04T21:55:00+08:00",
        valid_period: { text: "10.00 pm to Midnight" },
        forecasts: [
          { area: "Bishan", forecast: "Partly Cloudy (Night)" },
          { area: "Jurong West", forecast: "Light Rain" },
        ],
      },
    ],
  },
};

const temperaturePayload = {
  code: 0,
  data: {
    stations: [
      { id: "S1", location: { latitude: 1.35, longitude: 103.84 } },
      { id: "S2", location: { latitude: 1.3, longitude: 103.7 } },
    ],
    readings: [
      {
        timestamp: "2026-11-04T22:00:00+08:00",
        data: [
          { stationId: "S1", value: 28.4 },
          { stationId: "S2", value: 30.1 },
        ],
      },
    ],
  },
};

function mockFetch(
  response: Partial<Response> & { json?: () => Promise<unknown> },
) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fn);
  return fn;
}

describe("SingaporeWeatherClient condition data", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns the forecast for the nearest area from two-hr-forecast", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => payload });
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api-open.data.gov.sg/v2/real-time/api/two-hr-forecast",
    );
    expect(snapshot).toMatchObject({
      condition: "Partly Cloudy (Night)",
      area: "Bishan",
      valid_period_text: "10.00 pm to Midnight",
      observed_at: "2026-11-04T21:55:00+08:00",
    });
  });

  it("picks a different area for a different coordinate", async () => {
    mockFetch({ ok: true, json: async () => payload });
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.34,
      103.7,
    );
    expect(snapshot).toMatchObject({
      condition: "Light Rain",
      area: "Jurong West",
    });
  });

  it("falls back to Unavailable when the provider fails", async () => {
    mockFetch({ ok: false, status: 429 });
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );
    expect(snapshot.condition).toBe("Unavailable");
    expect(snapshot.area).toBeNull();
  });

  it("adds the nearest station temperature from air-temperature", async () => {
    const fn = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () =>
        url.endsWith("/air-temperature") ? temperaturePayload : payload,
    }));
    vi.stubGlobal("fetch", fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );
    expect(snapshot.temperature_c).toBe(28.4);
    expect(snapshot.condition).toBe("Partly Cloudy (Night)");
  });

  it("keeps the condition when the temperature call fails", async () => {
    const fn = vi
      .fn()
      .mockImplementation(async (url: string) =>
        url.endsWith("/air-temperature")
          ? { ok: false, status: 429 }
          : { ok: true, json: async () => payload },
      );
    vi.stubGlobal("fetch", fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );
    expect(snapshot.temperature_c).toBeNull();
    expect(snapshot.condition).toBe("Partly Cloudy (Night)");
  });

  it("populates all weather metrics from their endpoints", async () => {
    const reading = (value: number) => ({
      code: 0,
      data: {
        stations: [
          { id: "S1", location: { latitude: 1.35, longitude: 103.84 } },
        ],
        readings: [
          {
            timestamp: "2026-11-04T22:00:00+08:00",
            data: [{ stationId: "S1", value }],
          },
        ],
      },
    });
    const byEndpoint: Record<string, unknown> = {
      "air-temperature": reading(28.4),
      "relative-humidity": reading(81),
      rainfall: reading(1.2),
      "wind-speed": reading(9.3),
      "wind-direction": reading(270),
      uv: {
        code: 0,
        data: {
          records: [
            {
              updatedTimestamp: "2026-11-04T22:05:00+08:00",
              index: [
                { hour: "2026-11-04T22:00:00+08:00", value: 0 },
                { hour: "2026-11-04T13:00:00+08:00", value: 9 },
              ],
            },
          ],
        },
      },
    };
    const fn = vi.fn().mockImplementation(async (url: string) => ({
      ok: true,
      json: async () => byEndpoint[url.split("/").pop() as string] ?? payload,
    }));
    vi.stubGlobal("fetch", fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );
    expect(snapshot).toMatchObject({
      temperature_c: 28.4,
      humidity_percent: 81,
      rainfall_mm: 1.2,
      wind_speed_knots: 9.3,
      wind_direction_degrees: 270,
      uv_index: 0,
      condition: "Partly Cloudy (Night)",
    });
  });

  it("isolates a failing metric endpoint from the others", async () => {
    const fn = vi.fn().mockImplementation(async (url: string) => {
      const name = url.split("/").pop();
      if (name === "rainfall" || name === "uv")
        return { ok: false, status: 429 };
      return {
        ok: true,
        json: async () =>
          name === "two-hr-forecast" ? payload : temperaturePayload,
      };
    });
    vi.stubGlobal("fetch", fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(
      1.35,
      103.84,
    );
    expect(snapshot.rainfall_mm).toBeNull();
    expect(snapshot.uv_index).toBeNull();
    expect(snapshot.humidity_percent).toBe(28.4);
    expect(snapshot.condition).toBe("Partly Cloudy (Night)");
  });

  it('populates air quality from psi and pm25 for the nearest region', async () => {
    const regionMetadata = [
      { name: 'west', labelLocation: { latitude: 1.35735, longitude: 103.7 } },
      { name: 'central', labelLocation: { latitude: 1.35735, longitude: 103.82 } },
    ];
    const byEndpoint: Record<string, unknown> = {
      psi: {
        code: 0,
        data: {
          regionMetadata,
          items: [
            {
              updatedTimestamp: '2026-11-04T22:01:00+08:00',
              readings: { psi_twenty_four_hourly: { west: 62, central: 59 } },
            },
          ],
        },
      },
      pm25: {
        code: 0,
        data: {
          regionMetadata,
          items: [
            {
              updatedTimestamp: '2026-11-04T22:01:01+08:00',
              readings: { pm25_one_hourly: { west: 26, central: 10 } },
            },
          ],
        },
      },
    };
    const fn = vi.fn().mockImplementation(async (url: string) => {
      const name = url.split('/').pop() as string;
      return name in byEndpoint
        ? { ok: true, json: async () => byEndpoint[name] }
        : { ok: true, json: async () => (name === 'two-hr-forecast' ? payload : temperaturePayload) };
    });
    vi.stubGlobal('fetch', fn);

    const central = await new SingaporeWeatherClient().getCurrentWeather(1.35, 103.84);
    expect(central).toMatchObject({
      psi_twenty_four_hourly: 59,
      pm25_one_hourly: 10,
      air_quality_region: 'central',
    });

    const west = await new SingaporeWeatherClient().getCurrentWeather(1.34, 103.7);
    expect(west).toMatchObject({
      psi_twenty_four_hourly: 62,
      pm25_one_hourly: 26,
      air_quality_region: 'west',
    });
  });

  it('leaves air quality null when psi or pm25 fails', async () => {
    const fn = vi.fn().mockImplementation(async (url: string) => {
      const name = url.split('/').pop();
      if (name === 'psi' || name === 'pm25') return { ok: false, status: 429 };
      return { ok: true, json: async () => (name === 'two-hr-forecast' ? payload : temperaturePayload) };
    });
    vi.stubGlobal('fetch', fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(1.35, 103.84);
    expect(snapshot.psi_twenty_four_hourly).toBeNull();
    expect(snapshot.pm25_one_hourly).toBeNull();
    expect(snapshot.air_quality_region).toBeNull();
    expect(snapshot.condition).toBe('Partly Cloudy (Night)');
  });

  it('populates forecast cards from the 24-hour and 4-day forecasts', async () => {
    const byEndpoint: Record<string, unknown> = {
      'twenty-four-hr-forecast': {
        code: 0,
        data: {
          records: [
            {
              updatedTimestamp: '2026-11-04T22:00:00+08:00',
              general: { temperature: { low: 24, high: 32 } },
              periods: [
                {
                  timePeriod: { text: '6 pm 04 Nov to 6 am 05 Nov' },
                  regions: { central: { text: 'Fair (Night)' }, west: { text: 'Light Rain' } },
                },
                {
                  timePeriod: { text: '6 am 05 Nov to 6 pm 05 Nov' },
                  regions: { central: { text: 'Thundery Showers' } },
                },
              ],
            },
          ],
        },
      },
      '4-day-weather-forecast': {
        items: [
          {
            update_timestamp: '2026-11-04T17:00:00+08:00',
            forecasts: [
              { date: '2026-11-05', forecast: 'Thundery showers', temperature: { low: 24, high: 32 } },
              { date: '2026-11-06', forecast: 'Fair', temperature: { low: 25, high: 33 } },
            ],
          },
        ],
      },
    };
    const fn = vi.fn().mockImplementation(async (url: string) => {
      const name = url.split('/').pop() as string;
      return name in byEndpoint
        ? { ok: true, json: async () => byEndpoint[name] }
        : { ok: true, json: async () => (name === 'two-hr-forecast' ? payload : temperaturePayload) };
    });
    vi.stubGlobal('fetch', fn);

    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(1.35, 103.84);
    expect(fn.mock.calls.map((c) => c[0])).toContain(
      'https://api.data.gov.sg/v1/environment/4-day-weather-forecast',
    );
    expect(snapshot.forecast_low_c).toBe(24);
    expect(snapshot.forecast_high_c).toBe(32);
    expect(snapshot.forecast_periods).toEqual([
      { label: '6 pm 04 Nov to 6 am 05 Nov', forecast: 'Fair (Night)' },
      { label: '6 am 05 Nov to 6 pm 05 Nov', forecast: 'Thundery Showers' },
    ]);
    expect(snapshot.daily_forecast).toEqual([
      { date: '2026-11-05', forecast: 'Thundery showers', temperature_low_c: 24, temperature_high_c: 32 },
      { date: '2026-11-06', forecast: 'Fair', temperature_low_c: 25, temperature_high_c: 33 },
    ]);
  });

  it('leaves forecast cards empty when the forecast endpoints fail', async () => {
    const fn = vi.fn().mockImplementation(async (url: string) => {
      const name = url.split('/').pop();
      if (name === 'twenty-four-hr-forecast' || name === '4-day-weather-forecast')
        return { ok: false, status: 429 };
      return { ok: true, json: async () => (name === 'two-hr-forecast' ? payload : temperaturePayload) };
    });
    vi.stubGlobal('fetch', fn);
    const snapshot = await new SingaporeWeatherClient().getCurrentWeather(1.35, 103.84);
    expect(snapshot.forecast_high_c).toBeNull();
    expect(snapshot.forecast_periods).toEqual([]);
    expect(snapshot.daily_forecast).toEqual([]);
    expect(snapshot.condition).toBe('Partly Cloudy (Night)');
  });
});
