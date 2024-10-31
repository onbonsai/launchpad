import {last} from "lodash/array";
interface TabsProps {
  type: "lens" | "farcaster" | "ens";
  openTab: number;
  setOpenTab: (tab: number) => void;
  rewardsEnabled: boolean;
  hasTrades: boolean;
}

const tabs = [
  { name: "Feed", id: 1 },
  // TODO:
  // { name: "Airdrop", id: 2, disabled: true },
  { name: "Leaderboard", id: 3 },
  // { name: "Airdrops", id: 4 },
  { name: "Trades", id: 5 },
];

export default function CreatorsTabs({ type, openTab, setOpenTab, rewardsEnabled, hasTrades }: TabsProps) {
  let _tabs;
  if (type === "lens") {
    _tabs = rewardsEnabled
      ? tabs
      : [tabs[0], last(tabs)];

    if (!hasTrades) {
      _tabs = _tabs.slice(0, _tabs.length - 1);
    }
  } else {
    _tabs = [last(tabs)];
  }

  return (
    <div className="md:flex justify-end">
      <ul
        className="nav nav-pills flex flex-col md:flex-row flex-wrap list-none sm:flex-nowrap"
        id="pills-tab"
        role="tablist"
      >
        {_tabs.map((tab) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              disabled={tab.disabled || false}
              onClick={() => setOpenTab(tab.id)}
              className={`
              nav-link
              block
              font-medium
              text-md
              leading-tight
              rounded
              px-6
              py-2
              w-full
              text-center
              md:w-auto
              md:mr-2
              focus:outline-none focus:ring-0
              ${!tab.disabled ? 'hover:bg-dark-grey/90' : ''}
              ${openTab === tab.id ? "bg-dark-grey text-white hover:bg-dark-grey/90" : ""}
            `}
            >
              {tab.name}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
