import Link from "next/link";
import { ArrowRight, CalendarClock, CircleDot, Flag, Gauge, ShieldAlert, Tags } from "lucide-react";
import { PageTitle } from "@/components/page-title";
import { catalogResources } from "@/lib/api";

const icons = {
  statuses: CircleDot,
  priorities: Flag,
  types: Gauge,
  severities: ShieldAlert,
  tags: Tags,
  "due-dates": CalendarClock
};

export function SettingsHubPage() {
  return (
    <main className="page">
      <PageTitle
        eyebrow="Configuration"
        title="Settings hub"
        description="Maintain the metadata used to classify, prioritize, and plan issues."
      />
      <section className="grid three">
        {catalogResources.map((resource) => {
          const Icon = icons[resource.key];
          return (
            <Link className="panel grid" href={`/settings/${resource.key}`} key={resource.key}>
              <Icon size={22} aria-hidden="true" />
              <div>
                <h2>{resource.label}</h2>
                <p className="muted">Create, update, and remove {resource.label.toLowerCase()}.</p>
              </div>
              <span className="button secondary" style={{ width: "fit-content" }}>
                Open <ArrowRight size={16} aria-hidden="true" />
              </span>
            </Link>
          );
        })}
      </section>
    </main>
  );
}
