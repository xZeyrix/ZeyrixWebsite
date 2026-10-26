import SidebarIcon from "@/src/icons/sidebar.svg";
import SearchIcon from "@/src/icons/search.svg";
import NewChatIcon from "@/src/icons/redact.svg";
import { useSidebar } from "./SidebarContext";
import { useTranslations } from "next-intl";
import { notifyChatRouteChanged } from "@/src/hooks/useChatRoute";

type SidebarProps = {
  onClose?: () => void;
};

export function SidebarHeader({ onClose }: SidebarProps) {
  const { expanded, toggle } = useSidebar();
  const t = useTranslations("sidebarHeader");
  const openNewChat = () => {
    window.history.pushState({}, "", window.location.pathname);
    notifyChatRouteChanged();
    onClose?.();
  };

  return (
    <div
      className={`
        flex flex-col gap-5 pt-3 pb-6 transition-[padding,border-color] duration-300 ease-out motion-reduce:transition-none
        ${expanded ? "border-b border-border pl-6 pr-3" : "border-b border-transparent pl-3 pr-3"}
      `}
    >
      <div className="flex flex-row justify-between items-center">
        <div
          className={`
            overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none
            ${expanded ? "max-w-32 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2"}
          `}
        >
          <h4
            className="text-primary font-sans text-h4 whitespace-nowrap hover:cursor-pointer"
            onClick={openNewChat}
          >
            Zeyrix
          </h4>
        </div>
        <div className="flex flex-row">
          <div
            className={`
              overflow-hidden transition-[max-width,opacity,transform] duration-300 ease-out motion-reduce:transition-none
              ${expanded ? "max-w-12 opacity-100 translate-x-0" : "max-w-0 opacity-0 translate-x-2 pointer-events-none"}
            `}
          >
            <div className="p-3 hover:cursor-pointer hover:bg-elevated rounded-lg">
              <SearchIcon className="text-foreground-muted size-4" />
            </div>
          </div>
          <button
            className={`
              hover:cursor-pointer hover:bg-elevated rounded-lg p-3
            `}
            onClick={onClose ? (onClose) : toggle}
          >
            <SidebarIcon className="text-foreground-muted size-4" />
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <button
          className={`
            flex flex-row w-full h-fit justify-start items-center gap-4 rounded-lg p-3
            hover:cursor-pointer hover:bg-elevated
          `}
          onClick={() => {
            openNewChat();
          }}
        >
          <NewChatIcon className="text-foreground-secondary size-4 shrink-0" />
          <span
            className={`
              overflow-hidden whitespace-nowrap motion-reduce:transition-none
              ${expanded ? "max-w-28 opacity-100 translate-x-0" : "max-w-0 opacity-0 -translate-x-2"}
              transition-[max-width,opacity,transform] duration-300 ease-out
            `}
          >
            <p className="font-sans text-btn text-foreground-secondary">
              {t("newChat")}
            </p>
          </span>
        </button>
      </div>
    </div>
  );
}
