const tabs = [
  { name: "Feed", id: 1 },
  { name: "Trades", id: 2 },
  { name: "Holders", id: 3 },
];

export const Tabs = ({ openTab, setOpenTab }) => {
  return (
    <div className="md:flex justify-end">
      <ul
        className="nav nav-pills flex flex-col md:flex-row flex-wrap list-none sm:flex-nowrap"
        id="pills-tab"
        role="tablist"
      >
        {tabs.map((tab) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
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
              hover:bg-dark-grey/90
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
