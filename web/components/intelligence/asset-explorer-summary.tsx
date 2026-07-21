type Props = {
  coverage: {
    countries: number;
    assets: number;
    dataCentres: number;
    waterInfrastructure: number;
    industrialLoads: number;
    hydrogenInfrastructure: number;
    generators: number;
  };
  statuses: { operating: number; construction: number; preConstruction: number; announced: number; retired: number };
};

const number = (value: number) => new Intl.NumberFormat("en-US").format(value);

export function AssetExplorerSummary({ coverage, statuses }: Props) {
  return (
    <section className="asset-explorer-summary" aria-label="Asset Explorer summary">
      <div className="explorer-total"><small>Published demand &amp; network facilities</small><strong>{number(coverage.assets)}</strong><span>across {coverage.countries} countries</span></div>
      <div className="explorer-types"><span><i className="dot data" />Data centres<strong>{number(coverage.dataCentres)}</strong></span><span><i className="dot water" />Water<strong>{number(coverage.waterInfrastructure)}</strong></span><span><i className="dot industry" />Industrial<strong>{number(coverage.industrialLoads)}</strong></span><span><i className="dot hydrogen" />Hydrogen<strong>{number(coverage.hydrogenInfrastructure)}</strong></span><span><i className="dot power" />Generators<strong>{number(coverage.generators)}</strong></span></div>
      <div className="explorer-statuses"><span>{number(statuses.operating)} operating</span><span>{number(statuses.construction)} construction</span><span>{number(statuses.preConstruction)} pre-construction</span><span>{number(statuses.announced)} announced</span><span>{number(statuses.retired)} retired</span></div>
    </section>
  );
}
