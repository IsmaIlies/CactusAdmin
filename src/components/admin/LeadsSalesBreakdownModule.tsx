import {
  LeadsSalesDailyBreakdown,
  LeadsSalesProvider,
  LeadsSalesCategoryCounts,
} from "../../services/leadsSalesService";

interface LeadsSalesBreakdownModuleProps {
  data: LeadsSalesDailyBreakdown;
  isLoading: boolean;
}

const providersConfig: Record<LeadsSalesProvider, { label: string; gradient: string }> = {
  hipto: {
    label: "Hipto",
    gradient: "from-[#021440] via-[#0a3a92] to-[#2569ff]",
  },
  dolead: {
    label: "Dolead",
    gradient: "from-[#031a4d] via-[#1240a0] to-[#3b73ff]",
  },
  mars_marketing: {
    label: "Mars Marketing",
    gradient: "from-[#041c4f] via-[#0d3a8a] to-[#5c8dff]",
  },
};

type CategoryKey = keyof LeadsSalesCategoryCounts;

const productLabels: Record<CategoryKey, string> = {
  internet: "Internet",
  mobile: "Mobile",
  internetSosh: "Internet Sosh",
  mobileSosh: "Mobile Sosh",
};

const LeadsSalesBreakdownModule: React.FC<LeadsSalesBreakdownModuleProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-gray-100/70"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {(Object.keys(providersConfig) as LeadsSalesProvider[]).map((providerKey) => {
        const provider = providersConfig[providerKey];
        const stats = data[providerKey];
        const total =
          stats.internet + stats.mobile + stats.internetSosh + stats.mobileSosh;

        return (
          <article
            key={provider.label}
            className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${provider.gradient} text-white shadow-[0_22px_50px_rgba(3,24,93,0.42)]`}
          >
            <div className="absolute inset-0 bg-white/8 mix-blend-soft-light" />
            <div className="relative p-6 space-y-5">
              <header className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.35em] text-white/75">
                  Ventes du jour
                </p>
                <h3 className="text-2xl font-semibold text-white/95">{provider.label}</h3>
              </header>

              <div className="space-y-3">
                {(Object.keys(productLabels) as CategoryKey[]).map((key) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-xl bg-white/12 px-4 py-2 text-sm backdrop-blur-sm"
                  >
                    <span>{productLabels[key]}</span>
                    <span className="text-lg font-semibold">{stats[key]}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between text-sm text-white/80">
                <span>Total</span>
                <span className="text-2xl font-semibold">{total}</span>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default LeadsSalesBreakdownModule;
