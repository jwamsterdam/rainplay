import { z } from "zod";

export const OpenMeteoResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    sunrise: z.array(z.string()),
    sunset: z.array(z.string()),
  }),
  current: z.object({
    temperature_2m: z.number(),
    apparent_temperature: z.number(),
    precipitation: z.number(),
    rain: z.number(),
    showers: z.number(),
    weather_code: z.number(),
    cloud_cover: z.number(),
    wind_speed_10m: z.number(),
    wind_gusts_10m: z.number(),
  }),
  hourly: z.object({
    time: z.array(z.string()),
    temperature_2m: z.array(z.number()),
    apparent_temperature: z.array(z.number()),
    precipitation: z.array(z.number()),
    precipitation_probability: z.array(z.number()),
    rain: z.array(z.number()),
    showers: z.array(z.number()),
    cloud_cover: z.array(z.number()),
    shortwave_radiation: z.array(z.number()),
    sunshine_duration: z.array(z.number()),
    weather_code: z.array(z.number()),
    wind_speed_10m: z.array(z.number()),
    wind_gusts_10m: z.array(z.number()),
    is_day: z.array(z.number()),
  }),
  minutely_15: z
    .object({
      time: z.array(z.string()),
      precipitation: z.array(z.number()),
      rain: z.array(z.number()),
      showers: z.array(z.number()),
      weather_code: z.array(z.number()),
      cloud_cover: z.array(z.number()),
      shortwave_radiation: z.array(z.number()),
      is_day: z.array(z.number()),
    })
    .optional(),
});

export type OpenMeteoResponse = z.infer<typeof OpenMeteoResponseSchema>;
