import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import toast from "react-hot-toast";
import { CalendarIcon } from "@heroicons/react/outline";

import { addDays, subDays } from "@src/utils/utils";

export const Datepicker = ({ setDate, date, maxDays = 30, showTimeSelect = true }) => {
  console.log(`date: ${date}`);
  return (
    <div className="mt-2 relative block w-full">
      <DatePicker
        showTimeSelect={showTimeSelect}
        placeholderText="No end date"
        className="block w-full rounded-md text-secondary placeholder:text-secondary/70 border-dark-grey bg-transparent shadow-sm focus:border-dark-grey focus:ring-dark-grey sm:text-sm"
        includeDateIntervals={[{ start: subDays(new Date(), 1), end: addDays(new Date(), maxDays) }]}
        dateFormat="MMMM d, yyyy h:mmaa"
        selected={date}
        onChange={(date: Date) => {
          if (!date) {
            setDate(null);
            return;
          }
          const dateTs = date.getTime();
          setDate(dateTs);
        }}
      >
        <div>
          <div className="text-white py-1 px-2 inline-flex items-center gap-x-1">
            <CalendarIcon className="h-4 w-4 mr-2" /> <span>Only within the next {maxDays}{" "} days</span>
          </div>
        </div>
      </DatePicker>
      {date && (
        <span
          className="absolute inset-y-0 right-2 flex items-center cursor-pointer"
          onClick={() => setDate(null)}
        >
          x
        </span>
      )}
    </div>
  );
};
