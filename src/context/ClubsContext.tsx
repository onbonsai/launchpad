import React, { createContext, useContext, useState, ReactNode } from "react";

interface ClubsContextProps {
    filteredClubs: any[];
    setFilteredClubs: React.Dispatch<React.SetStateAction<any[]>>;
    filterBy: string;
    setFilterBy: React.Dispatch<React.SetStateAction<string>>;
    sortedBy: string;
    setSortedBy: React.Dispatch<React.SetStateAction<string>>;
}

const ClubsContext = createContext<ClubsContextProps | undefined>(undefined);

export const ClubsProvider = ({ children }: { children: ReactNode }) => {
    const [filteredClubs, setFilteredClubs] = useState<any[]>([]);
    const [filterBy, setFilterBy] = useState<string>("");
    const [sortedBy, setSortedBy] = useState<string>("publication.stats.collects");

    return (
        <ClubsContext.Provider value={{ filteredClubs, setFilteredClubs, filterBy, setFilterBy, sortedBy, setSortedBy }}>
            {children}
        </ClubsContext.Provider>
    );
};

export const useClubs = () => {
    const context = useContext(ClubsContext);
    if (!context) {
        throw new Error("useClubs must be used within a ClubsProvider");
    }
    return context;
};