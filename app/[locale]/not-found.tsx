import { useTranslations } from "next-intl";
import NotFoundScreen from "@/src/components/not-found/NotFoundScreen";

export default function NotFound() {
  const t = useTranslations("notFoundMain");

  return (
    <NotFoundScreen
      title={t("title")}
      description={t("description")}
      button={t("button")}
    />
  );
}
