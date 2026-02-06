"use client";

import { useEffect } from "react";
import { ApiDeparture, Station } from "@/lib/types";
import { formatMinutesToReadable } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
// import Clock from "@/components/Clock";
// import Link from "next/link";
import { processDepartures } from "@/lib/utils";

interface DepartureBoardProps {
  rawDepartures: {
    station: Station;
    departures: ApiDeparture[];
  }[];
}

const iconMap: Record<string, string> = {
  Tåg: "/pendel.svg",
  Buss: "/buss.svg",
  Tunnelbana: "/tunnelbana.svg",
};

const lineColorMap: Record<string, string> = {
  Tåg: "bg-[#ec619f]",
  Tunnelbana: "bg-[#148541]",
  Buss: "bg-black",
  Spårväg: "bg-[#b65f1f]",
};

const REFRESH_INTERVAL = 30000;

const commonPadding =
  "px-1 sm:px-3 md:px-5 lg:px-6 py-3 sm:py-4 md:py-5 lg:py-6";
const headerPadding =
  "px-1 sm:px-2 md:px-3 lg:px-4 py-1 sm:py-2 md:py-3 lg:py-3";
const headerTextSize =
  "text-base sm:text-lg md:text-2xl lg:text-3xl";
const cellTextSize =
  "text-base sm:text-lg md:text-2xl lg:text-3xl";

const getRowBackground = (index: number) =>
  index % 2 !== 0 ? "bg-[#0a0a0a]" : "bg-[#141414]";

const getLineColor = (lineType: string) =>
  lineColorMap[lineType] || "bg-gray-500";

export default function DepartureBoard({ rawDepartures }: DepartureBoardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hideContact = searchParams.has("hideContact");
  const initialDepartures = processDepartures(rawDepartures);

  // refresh the frontend every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [router]);

  // no placeholder rows — table rows match actual departures
  const lastUpdated = new Date().toLocaleTimeString("sv-SE", {
    timeZone: "Europe/Stockholm",
    hour12: false,
  });

  const metro11Departures = initialDepartures.filter((d) => d.name === "11");
  const lastMetro11 = metro11Departures.find(
    (d) => !d.nextDepartureTimeLeft && typeof d.timeLeft === "number",
  );

  const showLastMetroWarning =
    lastMetro11 &&
    typeof lastMetro11.timeLeft === "number" &&
    lastMetro11.timeLeft <= 30;

  return (
    <main
      className={`${
        hideContact && "cursor-none"
      } min-h-screen bg-black text-white relative`}
    >
      
      {showLastMetroWarning && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          style={{ animation: "custom-pulse 8s ease-in-out infinite" }}
        >
          <div className="bg-red-600 border-8 border-red-800 rounded-3xl p-8 md:p-16 lg:p-24 shadow-2xl">
            <div className="text-center">
              <p className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold text-white mb-4 md:mb-8">
                ⚠️ LAST METRO ⚠️
              </p>
              <p className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl 2xl:text-8xl font-bold text-white">
                Departing in {metro11Departures[0]?.timeLeft} min
              </p>
            </div>
          </div>
        </div>
      )}

      {/* {!hideContact ? (
        <Link
          href={"/contact"}
          className="absolute top-4 left-4 text-sm sm:text-base md:text-lg lg:text-xl text-blue-400 focus:text-blue-500 hover:cursor-pointer hover:underline"
        >
          Contact
        </Link>
      ) : (
        <Clock />
      )} */}
      {/* <div className="flex justify-center gap-10 items-center ">
        <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-400">
          Last updated: {lastUpdated}
        </p>
      </div> */}
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-0 sm:border-spacing-y-0.5 md:border-spacing-y-1">
          <thead>
            <tr className="text-white">
              {/* <th className={`${headerPadding} text-left`}></th> */}
              <th
                className={`${headerPadding} text-left whitespace-nowrap ${headerTextSize}`}
              >
                Linje
              </th>
              <th
                className={`${headerPadding} text-left whitespace-nowrap ${headerTextSize} text-orange-500`}
              >
                Avgår
              </th>
              <th
                className={`${headerPadding} text-left whitespace-nowrap ${headerTextSize} text-orange-500`}
              >
                Tid
              </th>
              <th
                className={`${headerPadding} text-left w-full ${headerTextSize}`}
              >
                Station
              </th>
              <th
                className={`${headerPadding} text-right whitespace-nowrap ${headerTextSize} text-orange-500`}
              >
                Nästa
              </th>
            </tr>
          </thead>
          <tbody>
            {initialDepartures.map((departure, index) => {
              const lineType = departure.transportType;
              const isUrgent = (departure.timeLeft as number) <= 10;

              return (
                <tr
                  key={`departure-${index}`}
                  className={getRowBackground(index)}
                >
                  {/* <td className={commonPadding}>
                    <Image
                      src={getIcon(lineType)}
                      alt={`${lineType} icon`}
                      width={64}
                      height={64}
                      className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 2xl:w-16 2xl:h-16"
                      style={{ width: "auto", height: "auto" }}
                    />
                  </td> */}
                  <td className={commonPadding}>
                    <span
                      className={`${getLineColor(
                        lineType,
                      )} rounded-lg sm:rounded-xl px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 font-bold ${cellTextSize} inline-block`}
                    >
                      {departure.name}
                    </span>
                  </td>
                  <td
                    className={`${commonPadding} text-left font-bold ${cellTextSize} whitespace-nowrap ${
                      isUrgent ? "text-red-600" : "text-orange-500"
                    }`}
                  >
                    {formatMinutesToReadable(departure.timeLeft)}
                  </td>
                  <td
                    className={`${commonPadding} text-left text-orange-500 ${cellTextSize}`}
                  >
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {departure.time}
                    </div>
                  </td>
                  <td
                    className={`${commonPadding} text-left text-white ${cellTextSize} max-w-0`}
                  >
                    <div className="whitespace-nowrap overflow-hidden text-ellipsis">
                      {departure.station}{" "}
                      <span className="text-orange-500 mx-0.5 sm:mx-1 md:mx-2">
                        →
                      </span>{" "}
                      {departure.direction.split(" ")[0]}
                    </div>
                  </td>
                  <td
                    className={`${commonPadding} text-right text-orange-500 ${cellTextSize} whitespace-nowrap`}
                  >
                    {departure.nextDepartureTimeLeft
                      ? formatMinutesToReadable(departure.nextDepartureTimeLeft)
                      : "-"}
                  </td>
                </tr>
              );
            })}

            {/* no placeholder rows */}
          </tbody>
        </table>
      </div>
    </main>
  );
}
