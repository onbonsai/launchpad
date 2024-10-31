import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { CalendarIcon } from "@heroicons/react/outline";

import { addDays, subDays } from "@src/utils/utils";

import { MultiStepFormWrapper } from "./MultiStepFormWrapper";

const SetSchedule = ({ setLaunchDate, launchDate, updateFields }) => {
  return (
    <MultiStepFormWrapper>
      <div className="w-full flex flex-col gap-2">
        <h2 className="mt-4 text-md font-bold tracking-tight sm:text-lg md:text-xl">Schedule your livestream?</h2>
        <div className="mt-4 relative block w-full">
          <DatePicker
            showTimeSelect
            placeholderText="Now"
            className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
            includeDateIntervals={[{ start: subDays(new Date(), 1), end: addDays(new Date(), 7) }]}
            dateFormat="MMMM d, yyyy h:mmaa"
            selected={launchDate}
            onChange={(date: Date) => {
              if (!date) {
                updateFields({ launchDate: undefined });
                setLaunchDate(null);
                return;
              }
              const dateTs = Math.floor(date.getTime() / 1000);
              if (dateTs < Math.floor(Date.now() / 1000)) {
                toast.error('Date cannot be in the past');
                return;
              }
              updateFields({ launchDate: date });
              setLaunchDate(dateTs);
            }}
          >
            <div>
              <div className="text-white py-1 px-2 inline-flex items-center gap-x-1">
                <CalendarIcon className="h-4 w-4 mr-2" /> <span>Must be within the next week</span>
              </div>
            </div>
          </DatePicker>
          {launchDate && (
            <span
              className="absolute inset-y-0 right-2 flex items-center cursor-pointer"
              onClick={() => {
                updateFields({ launchDate: undefined });
                setLaunchDate(null);
              }}
            >
              x
            </span>
          )}
        </div>
      </div>
    </MultiStepFormWrapper>
  );
};

export default SetSchedule;
