import {
  DRÄGG_START_HOUR,
  DRÄGG_END_HOUR,
  DEFAULT_MIN_TIME_THRESHOLD,
} from "@/lib/constants";
import { ApiDeparture, ProcessedDeparture, Station } from "./types";

export const getAdjustedStockholmTime = (): Date => {
  const nowInSweden = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Europe/Stockholm" }),
  );

  //const currentHour = nowInSweden.getHours();

  // if (currentHour >= DRÄGG_START_HOUR && currentHour <= DRÄGG_END_HOUR) {
  //  const minutesToSubtract = currentHour + 1;
  //const adjustedTime = new Date(
  // nowInSweden.getTime() - minutesToSubtract * 60 * 1000,
  //   );
  //  return adjustedTime;
  //  }

  return nowInSweden;
};

export const formatTimeDifference = (
  departureTime: string,
): number | string => {
  // Get adjusted time in Swedish timezone
  const nowInSweden = getAdjustedStockholmTime();

  const [hours, minutes] = departureTime.split(":").map(Number);

  const departureDate = new Date(
    nowInSweden.getFullYear(),
    nowInSweden.getMonth(),
    nowInSweden.getDate(),
    hours,
    minutes,
  );

  if (departureDate < nowInSweden) {
    departureDate.setDate(departureDate.getDate() + 1);
  }

  const differenceInMs = departureDate.getTime() - nowInSweden.getTime();

  if (differenceInMs < 0) {
    return "Departed";
  }

  const differenceInMin = Math.ceil(differenceInMs / 1000 / 60);

  return differenceInMin;
};

export const removeParentheses = (input: string): string => {
  return input.replace(/\s*\(.*?\)/g, "");
};

export const formatMinutesToReadable = (minutes: number | string): string => {
  if (typeof minutes !== "number") {
    return String(minutes);
  }
  if (minutes >= 60) {
    const total = Math.round(minutes);
    const wholeHours = Math.floor(total / 60);
    const remainder = total % 60;
    const hasHalf = remainder >= 30;
    const display = hasHalf ? `${wholeHours}.5` : `${wholeHours}`;
    return `${display} h`;
  }
  return `${minutes} min`;
};

export function processDepartures(
  rawData: { station: Station; departures: ApiDeparture[] }[],
) {
  const allProcessedDepartures: ProcessedDeparture[] = [];

  rawData.forEach(({ station, departures }) => {
    const stationName = station.name;
    const departureConfigMap = new Map(
      station.departures.map((d) => [d.line, d]),
    );

    const processedDepartures = departures
      .map((departure) => {
        const timeWithoutSeconds = departure.time
          .split(":")
          .slice(0, 2)
          .join(":");
        const match = departure.name.match(
          /\b(Buss|Tunnelbana|Tåg|Spårväg)\s*(\d+[A-Z]?)\b/i,
        );
        const timeDifference = formatTimeDifference(departure.time);

        if (!match) {
          return {
            name: "Unknown",
            transportType: "Unknown",
            time: timeWithoutSeconds,
            timeLeft: timeDifference,
            direction: removeParentheses(departure.direction),
            station: stationName,
            config: undefined,
          };
        }

        const config = departureConfigMap.get(match[2]);
        return {
          name: match[2],
          transportType: match[1],
          time: timeWithoutSeconds,
          timeLeft: timeDifference,
          direction: removeParentheses(departure.direction),
          station: stationName,
          config: config,
          prioritized: config?.prioritized || false,
        };
      })
      .filter((departure) => {
        const config = departure.config;
        if (!config) return false;

        if (
          departure.time === "Departed" ||
          departure.name === "Unknown" ||
          typeof departure.timeLeft !== "number"
        ) {
          return false;
        }

        const minTimeThreshold =
          config.minTimeThreshold ?? DEFAULT_MIN_TIME_THRESHOLD;
        if (departure.timeLeft <= minTimeThreshold) return false;

        if (config.directions) {
          const directionMatches = config.directions.some((filter) =>
            departure.direction.toLowerCase().includes(filter.toLowerCase()),
          );
          if (!directionMatches) return false;
        }

        return true;
      })
      .map(({ config, ...rest }) => rest); // Remove config but keep prioritized

    allProcessedDepartures.push(...processedDepartures);
  });

  // First, sort all departures by time
  const sortedByTime = allProcessedDepartures.sort(
    (a, b) => (a.timeLeft as number) - (b.timeLeft as number)
  );

  // Find the soonest prioritized departure
  const soonestPrio = sortedByTime.find((d) => d.prioritized);

  // If there's a prioritized departure, move it to the front
  let allDepartures = sortedByTime;
  if (soonestPrio) {
    const filtered = sortedByTime.filter((d) => d !== soonestPrio);
    allDepartures = [soonestPrio, ...filtered];
  }

  const departuresByLineAndDirection = new Map<string, ProcessedDeparture[]>();
  allDepartures.forEach((dep) => {
    const key = `${dep.name}|${dep.direction}`;
    const existing = departuresByLineAndDirection.get(key) || [];
    existing.push(dep);
    departuresByLineAndDirection.set(key, existing);
  });

  // For each line+direction, pick the earliest departure and include the next departure time if available
  const primaryDepartures: ProcessedDeparture[] = [];
  departuresByLineAndDirection.forEach((sameLine) => {
    const first = sameLine[0];
    const second = sameLine[1];
    const nextDepartureTimeLeft = second && typeof second.timeLeft === "number" ? second.timeLeft : undefined;
    primaryDepartures.push({ ...first, nextDepartureTimeLeft });
  });

  // Sort primary departures by time
  primaryDepartures.sort((a, b) => (a.timeLeft as number) - (b.timeLeft as number));

  // Lock line 30 to the top: collect all line 30 entries first
  const line30 = primaryDepartures.filter((d) => d.name === "30");
  const others = primaryDepartures.filter((d) => d.name !== "30");

  // Among the remaining, if there's a prioritized departure, move the soonest prioritized to front
  const soonestPrioOther = others.find((d) => d.prioritized);
  let orderedOthers = others;
  if (soonestPrioOther) {
    orderedOthers = [soonestPrioOther, ...others.filter((d) => d !== soonestPrioOther)];
  }

  return [...line30, ...orderedOthers];
}
