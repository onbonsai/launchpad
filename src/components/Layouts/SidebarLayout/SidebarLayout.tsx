import { FC, ReactNode } from "react";

import Breadcrumbs from "@src/components/Breadcrumbs/Breadcrumbs";
import { Sidebar } from "@src/components/Sidebar";
import { routeToBreadcrumb } from "@src/utils/routeToBreadcrumb";

interface SidebarLayoutProps {
  children?: ReactNode;
  topRightAction?: ReactNode;
  secondRowActions?: ReactNode;
}

export const SidebarLayout: FC<SidebarLayoutProps> = ({
  children,
  topRightAction,
  secondRowActions,
}) => {
  return (
    <div className="h-full flex gap-16 max-w-full overflow-x-auto overflow-y-hidden">
      <Sidebar />
      <div className="flex flex-col w-full h-full gap-8 pt-8 max-w-full">
        {/* TOP COLUMN */}
        <div className="flex w-full justify-between pr-10">
          <Breadcrumbs
            listClassName="flex gap-2 text-black"
            activeItemClassName="capitalize"
            transformLabel={routeToBreadcrumb}
          />
          {topRightAction && topRightAction}
        </div>
        {secondRowActions && secondRowActions}
        {/* CONTENT COLUMN */}
        {children}
      </div>
    </div>
  );
};
