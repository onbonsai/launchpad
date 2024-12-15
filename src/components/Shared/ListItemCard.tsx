import { ReactNode, useState } from "react";
import BulletCheck from "../Icons/BulletCheck";

const ListItem = (props: { children: ReactNode }) => {
return <div className="flex items-center gap-[8px]"><BulletCheck />{props.children}</div>
}

interface ListItemCardProps {
    items: ReactNode[];
}

const ListItemCard = (props: ListItemCardProps) => {
  return props.items.map((item, index) => (
            <ListItem key={index}>{item}</ListItem>
        ));
}

export default ListItemCard