import ServiceClient from "./ServiceClient";
import { services } from "@/src/data/services";

export function generateStaticParams() {
  return Object.keys(services).map((name) => ({ name }));
}

export default function ServicePage() {
  return <ServiceClient />;
}
