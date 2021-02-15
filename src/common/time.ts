import moment from "moment";

import { FileHeader } from "./replayBrowser/types";

export function convertFrameCountToDurationString(frameCount: number): string {
  const duration = moment.duration(frameCount / 60, "seconds");
  return moment.utc(duration.as("milliseconds")).format("m:ss");
}

function convertToDateAndTime(dateTimeString: moment.MomentInput): moment.Moment | null {
  const asMoment = moment(dateTimeString);
  if (asMoment.isValid()) {
    return asMoment.local();
  }

  return null;
}

export function fileToDateAndTime(
  dateTimeString: string | undefined | null,
  fileHeader: FileHeader,
): moment.Moment | null {
  const startAt = convertToDateAndTime(dateTimeString);
  const getTimeFromFileName = () => filenameToDateAndTime(fileHeader.name);
  const getTimeFromBirthTime = () => convertToDateAndTime(fileHeader.birthtime);

  return startAt || getTimeFromFileName() || getTimeFromBirthTime() || null;
}

function filenameToDateAndTime(fileName: string): moment.Moment | null {
  const timeReg = /\d{8}T\d{6}/g;
  const filenameTime = fileName.match(timeReg);

  if (filenameTime === null) {
    return null;
  }

  const time = moment(filenameTime[0]).local();
  return time;
}

export function monthDayHourFormat(time: moment.Moment): string | null {
  if (!moment.isMoment(time)) {
    return null;
  }

  return time.format("ll · LT");
}
